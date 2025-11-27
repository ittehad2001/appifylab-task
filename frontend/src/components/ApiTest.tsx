import { useState } from 'react';
import testApiClient from '../services/apiTest';
import { getApiBaseUrl } from '../config/api';
import type { AxiosError } from 'axios';

function ApiTest() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);
      setResult(null);
      
      const response = await testApiClient.get('/test');
      setResult(JSON.stringify(response.data, null, 2));
    } catch (err: unknown) {
      let errorMessage = 'Failed to connect to API';
      let details = '';
      
      if (err && typeof err === 'object' && 'isAxiosError' in err) {
        const axiosError = err as AxiosError;
        
        const currentApiUrl = getApiBaseUrl();
        if (axiosError.code === 'ERR_NETWORK' || axiosError.message === 'Network Error') {
          errorMessage = 'Network Error - Cannot reach the backend server';
          details = `The frontend cannot connect to: ${currentApiUrl}/test\n\nPossible causes:\n1. Laravel backend is not running\n2. Backend is running on a different port\n3. CORS configuration issue\n4. Firewall blocking the connection`;
        } else if (axiosError.response) {
          errorMessage = `Server Error: ${axiosError.response.status}`;
          details = `Status: ${axiosError.response.status}\nURL: ${axiosError.config?.url}\nResponse: ${JSON.stringify(axiosError.response.data, null, 2)}`;
        } else if (axiosError.request) {
          errorMessage = 'No response from server';
          details = `Request was made but no response received.\nURL: ${currentApiUrl}/test`;
        } else {
          errorMessage = axiosError.message || 'Unknown error occurred';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setErrorDetails(details);
      console.error('API Test Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="api-test">
      <h3>API Connection Test</h3>
      <p>Test the connection to your Laravel backend (no authentication required)</p>
      <button onClick={testConnection} disabled={loading}>
        {loading ? 'Testing...' : 'Test API Connection'}
      </button>
      
      {result && (
        <div className="test-result success">
          <h4>Success!</h4>
          <pre>{result}</pre>
        </div>
      )}
      
      {error && (
        <div className="test-result error">
          <h4>Error</h4>
          <p><strong>{error}</strong></p>
          {errorDetails && (
            <div className="error-details">
              <pre>{errorDetails}</pre>
            </div>
          )}
          <div className="troubleshooting">
            <h5>Troubleshooting Steps:</h5>
            <ol>
              <li>Make sure Laravel backend is running:
                <pre>cd Backend && php artisan serve</pre>
              </li>
              <li>Test the API directly in your browser:
                <pre><a href={`${getApiBaseUrl()}/test`} target="_blank" rel="noopener noreferrer">{getApiBaseUrl()}/test</a></pre>
              </li>
              <li>Check if the API URL is correct:
                <pre>Current API URL: {getApiBaseUrl()}</pre>
              </li>
              <li>Verify CORS configuration in <code>Backend/config/cors.php</code></li>
              <li>Check Laravel logs: <code>Backend/storage/logs/laravel.log</code></li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiTest;

