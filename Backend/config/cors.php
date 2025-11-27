<?php

// Get allowed origins from environment or use defaults
$allowedOrigins = env('CORS_ALLOWED_ORIGINS') 
    ? explode(',', env('CORS_ALLOWED_ORIGINS'))
    : [
        'https://airoxdev.com',
        'https://www.airoxdev.com',
        'http://airoxdev.com',
        'http://www.airoxdev.com',
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

// For production, allow all subdomains of airoxdev.com
$allowedOriginsPatterns = [
    'https://*.airoxdev.com',
    'http://*.airoxdev.com',
];

// If in production and no specific origins set, allow all airoxdev.com domains
if (env('APP_ENV') === 'production' && !env('CORS_ALLOWED_ORIGINS')) {
    // Add pattern matching for all airoxdev.com subdomains
    $allowedOriginsPatterns[] = 'https://*.airoxdev.com';
    $allowedOriginsPatterns[] = 'http://*.airoxdev.com';
}

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'storage/*'],

    'allowed_methods' => ['*'], // Allow all methods

    'allowed_origins' => array_values($allowedOrigins), // array_values to reindex

    'allowed_origins_patterns' => $allowedOriginsPatterns,

    'allowed_headers' => ['*'], // Allow all headers

    'exposed_headers' => ['Authorization', 'X-Requested-With', 'Content-Type', 'Accept', 'X-CSRF-TOKEN'],

    'max_age' => 86400, // 24 hours - cache preflight requests

    'supports_credentials' => false,  // Set to false for token-based auth (Bearer tokens)
];

