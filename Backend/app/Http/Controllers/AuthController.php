<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class AuthController extends Controller
{
    // Maximum failed login attempts before account lockout
    const MAX_LOGIN_ATTEMPTS = 5;
    
    // Account lockout duration in minutes
    const LOCKOUT_DURATION = 30;
    
    // Token expiration in hours (24 hours = 1440 minutes)
    const TOKEN_EXPIRATION_HOURS = 24;

    /**
     * Register a new user
     */
    public function register(Request $request)
    {
        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/[a-z]/',      // Must contain at least one lowercase letter
                'regex:/[A-Z]/',      // Must contain at least one uppercase letter
                'regex:/[0-9]/',      // Must contain at least one digit
                'regex:/[@$!%*#?&]/', // Must contain at least one special character
            ],
        ], [
            'password.regex' => 'The password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        ]);

        // Combine first_name and last_name into name
        $fullName = trim($request->first_name . ' ' . $request->last_name);

        $user = User::create([
            'name' => $fullName,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        // Create token with expiration
        $token = $user->createToken('auth_token', ['*'], now()->addHours(self::TOKEN_EXPIRATION_HOURS))->plainTextToken;

        // Log successful registration
        Log::info('User registered', [
            'user_id' => $user->id,
            'email' => $user->email,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $user,
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => now()->addHours(self::TOKEN_EXPIRATION_HOURS)->toIso8601String(),
        ], 201);
    }

    /**
     * Login user and create token
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        // Check if account is locked
        if ($user && $user->locked_until && $user->locked_until->isFuture()) {
            $remainingMinutes = now()->diffInMinutes($user->locked_until);
            throw ValidationException::withMessages([
                'email' => ["Account is locked. Please try again in {$remainingMinutes} minutes."],
            ]);
        }

        // Check credentials
        if (!$user || !Hash::check($request->password, $user->password)) {
            if ($user) {
                // Increment failed login attempts
                $user->increment('failed_login_attempts');
                
                // Lock account if max attempts reached
                if ($user->failed_login_attempts >= self::MAX_LOGIN_ATTEMPTS) {
                    $user->update([
                        'locked_until' => now()->addMinutes(self::LOCKOUT_DURATION),
                    ]);
                    
                    Log::warning('Account locked due to failed login attempts', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'ip_address' => $request->ip(),
                        'failed_attempts' => $user->failed_login_attempts,
                    ]);
                    
                    throw ValidationException::withMessages([
                        'email' => ['Account has been locked due to multiple failed login attempts. Please try again in ' . self::LOCKOUT_DURATION . ' minutes.'],
                    ]);
                }
            }
            
            Log::warning('Failed login attempt', [
                'email' => $request->email,
                'ip_address' => $request->ip(),
            ]);
            
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Reset failed login attempts on successful login
        $user->update([
            'failed_login_attempts' => 0,
            'locked_until' => null,
            'last_login_at' => now(),
        ]);

        // Revoke all existing tokens (optional: for single device login)
        // $user->tokens()->delete();

        // Create token with expiration
        $token = $user->createToken('auth_token', ['*'], now()->addHours(self::TOKEN_EXPIRATION_HOURS))->plainTextToken;

        Log::info('User logged in successfully', [
            'user_id' => $user->id,
            'email' => $user->email,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => now()->addHours(self::TOKEN_EXPIRATION_HOURS)->toIso8601String(),
        ]);
    }

    /**
     * Logout user (Revoke the token)
     */
    public function logout(Request $request)
    {
        $user = $request->user();
        
        // Revoke the current token
        $request->user()->currentAccessToken()->delete();

        Log::info('User logged out', [
            'user_id' => $user->id,
            'email' => $user->email,
        ]);

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Logout from all devices (Revoke all tokens)
     */
    public function logoutAll(Request $request)
    {
        $user = $request->user();
        
        // Revoke all tokens
        $user->tokens()->delete();

        Log::info('User logged out from all devices', [
            'user_id' => $user->id,
            'email' => $user->email,
        ]);

        return response()->json([
            'message' => 'Logged out from all devices successfully',
        ]);
    }

    /**
     * Refresh the authentication token
     */
    public function refresh(Request $request)
    {
        $user = $request->user();
        
        // Revoke the current token
        $request->user()->currentAccessToken()->delete();
        
        // Create a new token
        $token = $user->createToken('auth_token', ['*'], now()->addHours(self::TOKEN_EXPIRATION_HOURS))->plainTextToken;

        return response()->json([
            'message' => 'Token refreshed successfully',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => now()->addHours(self::TOKEN_EXPIRATION_HOURS)->toIso8601String(),
        ]);
    }

    /**
     * Request password reset
     */
    public function requestPasswordReset(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $user = User::where('email', $request->email)->first();

        // Generate reset token
        $token = Str::random(64);
        $expiresAt = now()->addHours(1); // Token expires in 1 hour

        $user->update([
            'password_reset_token' => Hash::make($token),
            'password_reset_token_expires_at' => $expiresAt,
        ]);

        // In a real application, send email with reset link
        // For now, we'll return the token (in production, send via email)
        Log::info('Password reset requested', [
            'user_id' => $user->id,
            'email' => $user->email,
            'ip_address' => $request->ip(),
        ]);

        // TODO: Send email with reset link
        // Mail::to($user->email)->send(new PasswordResetMail($token));

        return response()->json([
            'message' => 'Password reset link has been sent to your email.',
            // Remove this in production - only for development
            'reset_token' => $token, // DO NOT include this in production
        ]);
    }

    /**
     * Reset password using token
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
            'token' => 'required|string',
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/[0-9]/',
                'regex:/[@$!%*#?&]/',
            ],
        ], [
            'password.regex' => 'The password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        ]);

        $user = User::where('email', $request->email)->first();

        // Check if token exists and is valid
        if (!$user->password_reset_token || 
            !Hash::check($request->token, $user->password_reset_token) ||
            !$user->password_reset_token_expires_at ||
            $user->password_reset_token_expires_at->isPast()) {
            throw ValidationException::withMessages([
                'token' => ['Invalid or expired password reset token.'],
            ]);
        }

        // Update password and clear reset token
        $user->update([
            'password' => Hash::make($request->password),
            'password_reset_token' => null,
            'password_reset_token_expires_at' => null,
            'failed_login_attempts' => 0, // Reset failed attempts
            'locked_until' => null, // Unlock account if locked
        ]);

        // Revoke all existing tokens for security
        $user->tokens()->delete();

        Log::info('Password reset successful', [
            'user_id' => $user->id,
            'email' => $user->email,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Password has been reset successfully. Please login with your new password.',
        ]);
    }
}
