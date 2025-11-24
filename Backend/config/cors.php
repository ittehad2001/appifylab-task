<?php

// Get allowed origins from environment or use defaults
$allowedOrigins = env('CORS_ALLOWED_ORIGINS') 
    ? explode(',', env('CORS_ALLOWED_ORIGINS'))
    : [
        'https://airoxdev.com',
        'https://www.airoxdev.com',
    ];

// Add localhost origins for local development
if (env('APP_ENV') === 'local' || env('APP_ENV') === 'development' || env('APP_DEBUG') === true || env('APP_DEBUG') === 'true') {
    $allowedOrigins = array_merge($allowedOrigins, [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5174',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
    ]);
    // Remove duplicates
    $allowedOrigins = array_unique($allowedOrigins);
}

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'storage/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values($allowedOrigins), // array_values to reindex

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,  // IMPORTANT FOR TOKEN API
];

