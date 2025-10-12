// This is a simple script to check what's in localStorage
// We'll run this in the browser console

console.log('Checking localStorage for connectly_token...');
const token = localStorage.getItem('connectly_token');
console.log('Token:', token);
console.log('Token length:', token ? token.length : 0);

if (token) {
  try {
    // Try to decode the JWT token (without verification)
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token payload:', payload);
    console.log('Token expiration:', new Date(payload.exp * 1000));
    console.log('Current time:', new Date());
    console.log('Token expired:', payload.exp * 1000 < Date.now());
  } catch (e) {
    console.error('Error decoding token:', e);
  }
} else {
  console.log('No token found in localStorage');
}