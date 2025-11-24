<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class LogApiRequests
{
    /**
     * Handle an incoming request.
     * Log API requests for monitoring and debugging (only in production for performance).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);
        
        $response = $next($request);
        
        $duration = round((microtime(true) - $startTime) * 1000, 2); // Duration in milliseconds
        
        // Only log slow requests (>500ms) or errors in production
        if (app()->environment('production')) {
            if ($duration > 500 || $response->getStatusCode() >= 400) {
                Log::info('API Request', [
                    'method' => $request->method(),
                    'url' => $request->fullUrl(),
                    'status' => $response->getStatusCode(),
                    'duration_ms' => $duration,
                    'user_id' => $request->user()?->id,
                ]);
            }
        } else {
            // Log all requests in development
            Log::debug('API Request', [
                'method' => $request->method(),
                'url' => $request->fullUrl(),
                'status' => $response->getStatusCode(),
                'duration_ms' => $duration,
                'user_id' => $request->user()?->id,
            ]);
        }
        
        return $response;
    }
}







