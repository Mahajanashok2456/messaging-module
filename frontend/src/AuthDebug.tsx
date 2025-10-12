import React, { useState, useEffect } from 'react';
import axiosInstance from './utils/axiosInstance';

const AuthDebug = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [profileData, setProfileData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Check localStorage token on component mount
  useEffect(() => {
    checkLocalStorageToken();
  }, []);

  const checkLocalStorageToken = () => {
    const token = localStorage.getItem('connectly_token');
    console.log('Current token in localStorage:', token);
    
    if (token) {
      try {
        // Decode JWT payload (without verification)
        const payload = JSON.parse(atob(token.split('.')[1]));
        setDebugInfo({
          token: token,
          payload: payload,
          expiration: new Date(payload.exp * 1000),
          isExpired: payload.exp * 1000 < Date.now()
        });
      } catch (e) {
        setError('Invalid token format: ' + (e as Error).message);
        setDebugInfo({ token, error: 'Invalid token format' });
      }
    } else {
      setDebugInfo({ error: 'No token found in localStorage' });
    }
  };

  const testProfileRequest = async () => {
    setLoading(true);
    setError('');
    setProfileData(null);
    
    try {
      // Force axios instance to use the token from localStorage
      const token = localStorage.getItem('connectly_token');
      if (token) {
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('Making profile request with axiosInstance...');
      const response = await axiosInstance.get('/auth/profile');
      setProfileData(response.data);
      console.log('Profile response:', response.data);
    } catch (err: any) {
      setError(`Profile request failed: ${err.response?.data?.message || err.message}`);
      console.error('Profile error:', err);
      console.error('Error response:', err.response);
    } finally {
      setLoading(false);
    }
  };

  const clearToken = () => {
    localStorage.removeItem('connectly_token');
    delete axiosInstance.defaults.headers.common['Authorization'];
    setDebugInfo({});
    setProfileData(null);
    setError('Token cleared from localStorage');
  };

  const manualTokenTest = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('connectly_token');
      if (!token) {
        setError('No token found in localStorage');
        setLoading(false);
        return;
      }
      
      // Test with a manual axios request
      const manualResponse = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (manualResponse.ok) {
        const data = await manualResponse.json();
        setProfileData(data);
        setError('');
      } else {
        const errorData = await manualResponse.json();
        setError(`Manual request failed: ${errorData.message}`);
      }
    } catch (err: any) {
      setError(`Manual request error: ${err.message}`);
      console.error('Manual request error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Authentication Debug Tool</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Token Information</h2>
          {debugInfo && Object.keys(debugInfo).length > 0 ? (
            <div className="space-y-2">
              {debugInfo.error ? (
                <p className="text-red-600">{debugInfo.error}</p>
              ) : (
                <>
                  <p><strong>Token:</strong> {debugInfo.token?.substring(0, 30)}...</p>
                  <p><strong>Expiration:</strong> {debugInfo.expiration?.toString()}</p>
                  <p><strong>Expired:</strong> {debugInfo.isExpired ? 'Yes' : 'No'}</p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-blue-600">Payload Details</summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(debugInfo.payload, null, 2)}
                    </pre>
                  </details>
                </>
              )}
            </div>
          ) : (
            <p>No token information available</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Profile Data</h2>
          {profileData ? (
            <div>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(profileData, null, 2)}
              </pre>
            </div>
          ) : (
            <p>No profile data loaded</p>
          )}
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p>{error}</p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-4">
        <button 
          onClick={checkLocalStorageToken}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Check Token
        </button>
        
        <button 
          onClick={testProfileRequest}
          disabled={loading}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Profile Request (Axios)'}
        </button>
        
        <button 
          onClick={manualTokenTest}
          disabled={loading}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Profile Request (Manual)'}
        </button>
        
        <button 
          onClick={clearToken}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Clear Token
        </button>
      </div>
    </div>
  );
};

export default AuthDebug;