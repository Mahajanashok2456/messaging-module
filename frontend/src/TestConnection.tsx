import React, { useState } from 'react';
import axiosInstance from './utils/axiosInstance';

const TestConnection = () => {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const testConnection = async () => {
    setLoading(true);
    setResult('');
    
    try {
      const response = await axiosInstance.get('/');
      setResult(`Success: ${response.data}`);
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
      console.error('Error:', error);
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Connection Test</h1>
      <button 
        onClick={testConnection}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        {loading ? 'Testing...' : 'Test Connection'}
      </button>
      {result && (
        <div className={`mt-4 p-4 rounded ${result.includes('Success') ? 'bg-green-100' : 'bg-red-100'}`}>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
};

export default TestConnection;