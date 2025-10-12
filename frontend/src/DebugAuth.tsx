import React, { useState, useEffect } from 'react';
import axiosInstance from './utils/axiosInstance';

const DebugAuth = () => {
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = () => {
    const token = localStorage.getItem('connectly_token');
    console.log('Current token:', token);
    
    if (token) {
      try {
        // Decode JWT payload (without verification)
        const payload = JSON.parse(atob(token.split('.')[1]));
        setTokenInfo({
          token: token,
          payload: payload,
          expiration: new Date(payload.exp * 1000),
          isExpired: payload.exp * 1000 < Date.now()
        });
      } catch (e) {
        setError('Invalid token format: ' + (e as Error).message);
        setTokenInfo({ token, error: 'Invalid token format' });
      }
    } else {
      setTokenInfo({ error: 'No token found' });
    }
  };

  const testProfileRequest = async () => {
    setLoading(true);
    setError('');
    setProfileData(null);
    
    try {
      const response = await axiosInstance.get('/auth/profile');
      setProfileData(response.data);
    } catch (err: any) {
      setError(`Profile request failed: ${err.response?.data?.message || err.message}`);
      console.error('Profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearToken = () => {
    localStorage.removeItem('connectly_token');
    delete axiosInstance.defaults.headers.common['Authorization'];
    setTokenInfo(null);
    setProfileData(null);
    setError('Token cleared');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Authentication Debug Tool</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Token Information</h2>
          {tokenInfo ? (
            <div className="space-y-2">
              {tokenInfo.error ? (
                <p className="text-red-600">{tokenInfo.error}</p>
              ) : (
                <>
                  <p><strong>Token:</strong> {tokenInfo.token?.substring(0, 30)}...</p>
                  <p><strong>Expiration:</strong> {tokenInfo.expiration?.toString()}</p>
                  <p><strong>Expired:</strong> {tokenInfo.isExpired ? 'Yes' : 'No'}</p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-blue-600">Payload Details</summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(tokenInfo.payload, null, 2)}
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
          onClick={checkToken}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Check Token
        </button>
        
        <button 
          onClick={testProfileRequest}
          disabled={loading}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Profile Request'}
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

export default DebugAuth;