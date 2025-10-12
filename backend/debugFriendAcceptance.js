require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// Debug the friend acceptance process step by step
const debugFriendAcceptance = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find existing test users
    const user1 = await User.findOne({ email: 'ashok@gmail.com' });
    const user2 = await User.findOne({ email: 'mahajan@gmail.com' });
    
    if (!user1 || !user2) {
      console.log('Required test users not found.');
      return;
    }
    
    console.log('Found test users:');
    console.log('User 1:', user1.username, user1._id);
    console.log('User 2:', user2.username, user2._id);
    
    // Check initial state
    console.log('\n=== Initial State ===');
    console.log('User 1 friends count:', user1.friends.length);
    console.log('User 1 friendRequests count:', user1.friendRequests.length);
    console.log('User 1 sentRequests count:', user1.sentRequests.length);
    console.log('User 2 friends count:', user2.friends.length);
    console.log('User 2 friendRequests count:', user2.friendRequests.length);
    console.log('User 2 sentRequests count:', user2.sentRequests.length);
    
    // Clear any existing relationships for clean test
    user1.friends = [];
    user1.friendRequests = [];
    user1.sentRequests = [];
    user2.friends = [];
    user2.friendRequests = [];
    user2.sentRequests = [];
    await user1.save();
    await user2.save();
    
    console.log('\n=== Cleared Existing Relationships ===');
    
    // Simulate sending friend request from user1 to user2
    console.log('\n=== Sending Friend Request ===');
    user2.friendRequests.push({ from: user1._id });
    user1.sentRequests.push({ to: user2._id });
    
    await user1.save();
    await user2.save();
    
    console.log('Friend request sent');
    
    // Check state after sending request
    const user1AfterRequest = await User.findById(user1._id);
    const user2AfterRequest = await User.findById(user2._id);
    
    console.log('\n=== After Sending Request ===');
    console.log('User 1 friends count:', user1AfterRequest.friends.length);
    console.log('User 1 sentRequests count:', user1AfterRequest.sentRequests.length);
    console.log('User 1 friendRequests count:', user1AfterRequest.friendRequests.length);
    console.log('User 2 friends count:', user2AfterRequest.friends.length);
    console.log('User 2 sentRequests count:', user2AfterRequest.sentRequests.length);
    console.log('User 2 friendRequests count:', user2AfterRequest.friendRequests.length);
    
    // Simulate accepting friend request (exact logic from controller)
    console.log('\n=== Accepting Friend Request ===');
    
    // Find the request in user2's friendRequests
    const requestIndex = user2AfterRequest.friendRequests.findIndex(
      request => request.from.toString() === user1._id.toString()
    );
    
    console.log('Request index found:', requestIndex);
    
    if (requestIndex === -1) {
      console.log('Friend request not found');
      return;
    }
    
    // Add each other as friends
    user2AfterRequest.friends.push(user1._id);
    await user2AfterRequest.save();
    console.log('Added user1 to user2 friends');
    
    const requester = await User.findById(user1._id);
    requester.friends.push(user2._id);
    await requester.save();
    console.log('Added user2 to user1 friends');
    
    // Remove the request from both users
    user2AfterRequest.friendRequests.splice(requestIndex, 1);
    await user2AfterRequest.save();
    console.log('Removed request from user2');
    
    const sentRequestIndex = requester.sentRequests.findIndex(
      req => req.to.toString() === user2._id.toString()
    );
    
    console.log('Sent request index found:', sentRequestIndex);
    
    if (sentRequestIndex !== -1) {
      requester.sentRequests.splice(sentRequestIndex, 1);
      await requester.save();
      console.log('Removed sent request from user1');
    }
    
    // Check final state
    const user1Final = await User.findById(user1._id);
    const user2Final = await User.findById(user2._id);
    
    console.log('\n=== Final State ===');
    console.log('User 1 friends count:', user1Final.friends.length);
    console.log('User 1 sentRequests count:', user1Final.sentRequests.length);
    console.log('User 1 friendRequests count:', user1Final.friendRequests.length);
    console.log('User 2 friends count:', user2Final.friends.length);
    console.log('User 2 sentRequests count:', user2Final.sentRequests.length);
    console.log('User 2 friendRequests count:', user2Final.friendRequests.length);
    
    // Verify friendship is mutual
    const user1HasUser2 = user1Final.friends.some(friend => friend.toString() === user2._id.toString());
    const user2HasUser1 = user2Final.friends.some(friend => friend.toString() === user1._id.toString());
    
    console.log('\n=== Verification ===');
    console.log('User 1 has User 2 as friend:', user1HasUser2);
    console.log('User 2 has User 1 as friend:', user2HasUser1);
    console.log('Mutual friendship established:', user1HasUser2 && user2HasUser1);
    
    if (user1HasUser2 && user2HasUser1) {
      console.log('\n✅ SUCCESS: Mutual friendship established correctly!');
    } else {
      console.log('\n❌ FAILURE: Mutual friendship not established!');
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    await mongoose.connection.close();
  }
};

debugFriendAcceptance();