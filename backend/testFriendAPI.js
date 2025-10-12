require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');

// Test the complete friend API flow
const testFriendAPI = async () => {
  const baseURL = 'http://localhost:5000/api';
  const axiosInstance = axios.create({ baseURL });
  
  let user1Token, user2Token, user1Id, user2Id;
  
  try {
    console.log('=== Testing Friend API Flow ===\n');
    
    // 1. Register two test users
    console.log('1. Registering test users...');
    
    const registerResponse1 = await axiosInstance.post('/auth/register', {
      username: 'friend_test_user1',
      email: 'friend_test1@example.com',
      password: 'password123'
    });
    
    user1Token = registerResponse1.data.data.token;
    user1Id = registerResponse1.data.data.user._id;
    
    const registerResponse2 = await axiosInstance.post('/auth/register', {
      username: 'friend_test_user2',
      email: 'friend_test2@example.com',
      password: 'password123'
    });
    
    user2Token = registerResponse2.data.data.token;
    user2Id = registerResponse2.data.data.user._id;
    
    console.log('✓ Users registered successfully');
    console.log('  User 1 ID:', user1Id);
    console.log('  User 2 ID:', user2Id);
    
    // 2. User 1 sends friend request to User 2
    console.log('\n2. Sending friend request from User 1 to User 2...');
    
    await axiosInstance.post('/users/request/' + user2Id, {}, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    
    console.log('✓ Friend request sent');
    
    // 3. User 2 checks friend requests
    console.log('\n3. Checking User 2 friend requests...');
    
    const requestsResponse = await axiosInstance.get('/users/me/requests', {
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    
    console.log('✓ Friend requests retrieved');
    console.log('  Requests count:', requestsResponse.data.length);
    if (requestsResponse.data.length > 0) {
      console.log('  Request from:', requestsResponse.data[0].from.username);
    }
    
    // 4. User 2 accepts the friend request
    console.log('\n4. User 2 accepting friend request...');
    
    await axiosInstance.post(`/users/request/${user1Id}/accept`, {}, {
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    
    console.log('✓ Friend request accepted');
    
    // 5. Check friends list for both users
    console.log('\n5. Checking friends lists...');
    
    const user1FriendsResponse = await axiosInstance.get('/users/me/friends', {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    
    const user2FriendsResponse = await axiosInstance.get('/users/me/friends', {
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    
    console.log('✓ Friends lists retrieved');
    console.log('  User 1 friends count:', user1FriendsResponse.data.length);
    console.log('  User 2 friends count:', user2FriendsResponse.data.length);
    
    if (user1FriendsResponse.data.length > 0) {
      console.log('  User 1 friends:', user1FriendsResponse.data.map(f => f.username));
    }
    
    if (user2FriendsResponse.data.length > 0) {
      console.log('  User 2 friends:', user2FriendsResponse.data.map(f => f.username));
    }
    
    // 6. Verify mutual friendship
    console.log('\n6. Verifying mutual friendship...');
    
    const user1HasUser2 = user1FriendsResponse.data.some(f => f._id === user2Id);
    const user2HasUser1 = user2FriendsResponse.data.some(f => f._id === user1Id);
    
    console.log('  User 1 has User 2 as friend:', user1HasUser2);
    console.log('  User 2 has User 1 as friend:', user2HasUser1);
    console.log('  Mutual friendship:', user1HasUser2 && user2HasUser1);
    
    if (user1HasUser2 && user2HasUser1) {
      console.log('\n✅ SUCCESS: Mutual friendship established correctly!');
    } else {
      console.log('\n❌ FAILURE: Mutual friendship not established!');
    }
    
    // Clean up - delete test users
    console.log('\n7. Cleaning up test users...');
    await mongoose.connect(process.env.MONGODB_URI);
    await User.findByIdAndDelete(user1Id);
    await User.findByIdAndDelete(user2Id);
    console.log('✓ Test users cleaned up');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    
    // Try to clean up even if test failed
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      if (user1Id) await User.findByIdAndDelete(user1Id);
      if (user2Id) await User.findByIdAndDelete(user2Id);
      console.log('✓ Test users cleaned up after error');
    } catch (cleanupError) {
      console.error('Cleanup failed:', cleanupError.message);
    }
  }
};

testFriendAPI();