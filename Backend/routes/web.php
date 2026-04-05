<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/', function () {
    return response()->json([
        'message' => 'Welcome to Buddyscript API',
        'status' => 'ok',
        'service' => config('app.name', 'Buddyscript API'),
        'timestamp' => now()->toIso8601String(),
        'endpoints' => [
            'health_check' => [
                'method' => 'GET',
                'url' => url('/api/test'),
                'auth_required' => false,
            ],
            'login' => [
                'method' => 'POST',
                'url' => url('/api/login'),
                'auth_required' => false,
            ],
            'register' => [
                'method' => 'POST',
                'url' => url('/api/register'),
                'auth_required' => false,
            ],
            'user_profile' => [
                'method' => 'GET',
                'url' => url('/api/user'),
                'auth_required' => true,
            ],
            'feed_posts' => [
                'method' => 'GET',
                'url' => url('/api/posts'),
                'auth_required' => true,
            ],
        ],
    ]);
});
