<?php

use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Test route to verify API connection (no authentication required)
Route::get('/test', function () {
    return response()->json([
        'message' => 'API connection successful!',
        'status' => 'ok',
        'timestamp' => now()->toDateTimeString(),
    ]);
});

// Authentication routes (no authentication required) - with rate limiting
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1'); // 5 requests per minute
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1'); // 10 requests per minute
Route::post('/password/reset/request', [AuthController::class, 'requestPasswordReset'])->middleware('throttle:5,1'); // 5 requests per minute
Route::post('/password/reset', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1'); // 5 requests per minute

// Protected routes - requires authentication with rate limiting
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () { // 60 requests per minute for authenticated users
    Route::get('/user', function (Request $request) {
        $user = $request->user();
        $userData = $user->toArray();
        $userData['profile_image_url'] = $user->profile_image 
            ? \Illuminate\Support\Facades\Storage::url($user->profile_image) 
            : null;
        return $userData;
    });
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/logout/all', [AuthController::class, 'logoutAll']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
    
    // Posts routes
    Route::apiResource('posts', \App\Http\Controllers\PostController::class);
    // Allow POST for updates (for FormData compatibility with _method=PUT)
    Route::match(['put', 'post'], '/posts/{post}', [\App\Http\Controllers\PostController::class, 'update']);
    
    // Likes routes
    Route::post('/likes/toggle', [\App\Http\Controllers\LikeController::class, 'toggle']);
    Route::get('/likes', [\App\Http\Controllers\LikeController::class, 'getLikes']);
    
    // Comments routes
    Route::get('/posts/{postId}/comments', [\App\Http\Controllers\CommentController::class, 'index']);
    Route::post('/comments', [\App\Http\Controllers\CommentController::class, 'store']);
    Route::put('/comments/{id}', [\App\Http\Controllers\CommentController::class, 'update']);
    Route::delete('/comments/{id}', [\App\Http\Controllers\CommentController::class, 'destroy']);
    
    // Profile routes (accept both PUT and POST for FormData compatibility)
    Route::match(['put', 'post'], '/profile', [\App\Http\Controllers\ProfileController::class, 'update']);
    Route::put('/profile/password', [\App\Http\Controllers\ProfileController::class, 'updatePassword']);
    
    // Friend routes
    Route::get('/friends/search', [\App\Http\Controllers\FriendController::class, 'search']);
    Route::get('/friends/suggested', [\App\Http\Controllers\FriendController::class, 'suggested']);
    Route::post('/friends/request', [\App\Http\Controllers\FriendController::class, 'sendRequest']);
    Route::post('/friends/request/{id}/accept', [\App\Http\Controllers\FriendController::class, 'acceptRequest']);
    Route::post('/friends/request/{id}/reject', [\App\Http\Controllers\FriendController::class, 'rejectRequest']);
    Route::get('/friends', [\App\Http\Controllers\FriendController::class, 'friends']);
    Route::get('/friends/pending', [\App\Http\Controllers\FriendController::class, 'pendingRequests']);
});
