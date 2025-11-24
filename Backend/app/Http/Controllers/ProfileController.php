<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    /**
     * Update user profile
     */
    public function update(Request $request)
    {
        $user = $request->user();
        
        // Debug: Log request data
        \Log::info('Profile update request', [
            'has_file' => $request->hasFile('profile_image'),
            'all_files' => array_keys($request->allFiles()),
            'content_type' => $request->header('Content-Type'),
        ]);

        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'profile_image' => 'nullable|file|mimes:jpeg,jpg,png,gif,webp|max:5120', // Increased max size to 5MB, added webp
        ], [
            'profile_image.file' => 'The profile image must be a file.',
            'profile_image.mimes' => 'The profile image must be a file of type: jpeg, jpg, png, gif, or webp.',
            'profile_image.max' => 'The profile image may not be greater than 5MB.',
        ]);

        // Combine first_name and last_name into name
        $fullName = trim($request->first_name . ' ' . $request->last_name);

        $user->name = $fullName;
        $user->email = $request->email;

        // Handle profile image upload
        if ($request->hasFile('profile_image')) {
            try {
                $file = $request->file('profile_image');
                
                // Log file information for debugging
                \Log::info('Profile image upload attempt', [
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                    'extension' => $file->getClientOriginalExtension(),
                ]);
                
                // Verify it's actually an image by checking MIME type
                $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                if (!in_array($file->getMimeType(), $allowedMimes)) {
                    return response()->json([
                        'message' => 'Invalid file type',
                        'errors' => ['profile_image' => ['The file must be an image (jpeg, jpg, png, gif, or webp). Detected type: ' . $file->getMimeType()]],
                    ], 422);
                }
                
                // Delete old image if exists
                if ($user->profile_image) {
                    Storage::disk('public')->delete($user->profile_image);
                }
                
                // Store the new image
                $imagePath = $file->store('profiles', 'public');
                
                if ($imagePath) {
                    $user->profile_image = $imagePath;
                } else {
                    return response()->json([
                        'message' => 'Failed to upload profile image',
                        'errors' => ['profile_image' => ['Failed to store the image.']],
                    ], 422);
                }
            } catch (\Exception $e) {
                \Log::error('Profile image upload error: ' . $e->getMessage());
                return response()->json([
                    'message' => 'Failed to upload profile image',
                    'errors' => ['profile_image' => ['Error uploading image: ' . $e->getMessage()]],
                ], 422);
            }
        }

        $user->save();

        // Refresh user to get updated data
        $user->refresh();
        
        // Return user with profile image URL
        $userData = $user->toArray();
        $userData['profile_image_url'] = $user->profile_image 
            ? Storage::url($user->profile_image) 
            : null;

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $userData,
        ]);
    }

    /**
     * Update user password
     */
    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        // Verify current password
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect',
                'errors' => ['current_password' => ['The current password is incorrect.']],
            ], 422);
        }

        // Update password
        $user->password = Hash::make($request->new_password);
        $user->save();

        return response()->json([
            'message' => 'Password updated successfully',
        ]);
    }
}
