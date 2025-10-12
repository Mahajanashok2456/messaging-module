// This script simulates the exact flow that happens in the frontend
// We'll run this in the browser console to debug token issues

console.log('=== Frontend Token Flow Simulation ===');

// 1. Check if token exists in localStorage
const token = localStorage.getItem('connectly_token');
console.log('1. Token in localStorage:', token ? `${token.substring(0, 30)}...` : 'None');

if (!token) {
  console.log('No token found. Please login first.');
} else {
  // 2. Check token format
  try {
    const parts = token.split('.');
    console.log('2. Token format valid:', parts.length === 3);
    
    // 3. Decode payload
    const payload = JSON.parse(atob(parts[1]));
    console.log('3. Token payload:', payload);
    console.log('   Expiration:', new Date(payload.exp * 1000));
    console.log('   Expired:', payload.exp * 1000 < Date.now());
    
    // 4. Test sending request with token
    console.log('4. Testing profile request...');
    
    fetch('http://localhost:5000/api/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      console.log('   Response status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('   Profile data:', data);
    })
    .catch(error => {
      console.error('   Request failed:', error);
    });
    
  } catch (e) {
    console.error('Token format error:', e);
  }
}