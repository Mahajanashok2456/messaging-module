// Simple test to check connection to backend
fetch('http://localhost:5000/')
  .then(response => response.text())
  .then(data => {
    console.log('Success:', data);
  })
  .catch(error => {
    console.error('Error:', error);
  });