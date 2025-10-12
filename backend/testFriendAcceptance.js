require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// Test the friend acceptance logic
const testFriendAcceptance = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Create two test users
    const user1 = new User({
      username: 'testuser1',
      email: 'test1@example.com',
      password: 'password123'
    });
    
    const user2 = new User({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123'
    });
    
    await user1.save();
    await user2.save();
    
    console.log('Created test users:');
    console.log('User 1:', user1.username, user1._id);
    console.log('User 2:', user2.username, user2._id);
    
    // Simulate sending friend request from user1 to user2
    user2.friendRequests.push({ from: user1._id });
    user1.sentRequests.push({ to: user2._id });
    
    await user1.save();
    await user2.save();
    
    console.log('\nFriend request sent from user1 to user2');
    
    // Check initial state
    const user1Before = await User.findById(user1._id);
    const user2Before = await User.findById(user2._id);
    
    console.log('\nBefore acceptance:');
    console.log('User 1 friends:', user1Before.friends.length);
    console.log('User 1 sentRequests:', user1Before.sentRequests.length);
    console.log('User 1 friendRequests:', user1Before.friendRequests.length);
    console.log('User 2 friends:', user2Before.friends.length);
    console.log('User 2 sentRequests:', user2Before.sentRequests.length);
    console.log('User 2 friendRequests:', user2Before.friendRequests.length);
    
    // Simulate accepting friend request (current logic)
    // Find the request in user2's friendRequests
    const requestIndex = user2Before.friendRequests.findIndex(
      request => request.from.toString() === user1._id.toString()
    );
    
    if (requestIndex === -1) {
      console.log('Friend request not found');
      return;
    }
    
    console.log('\nAccepting friend request...');
    
    // Add each other as friends
    user2Before.friends.push(user1._id);
    await user2Before.save();
    
    const requester = await User.findById(user1._id);
    requester.friends.push(user2._id);
    await requester.save();
    
    // Remove the request from both users
    user2Before.friendRequests.splice(requestIndex, 1);
    await user2Before.save();
    
    const sentRequestIndex = requester.sentRequests.findIndex(
      req => req.to.toString() === user2._id.toString()
    );
    
    if (sentRequestIndex !== -1) {
      requester.sentRequests.splice(sentRequestIndex, 1);
      await requester.save();
    }
    
    // Check final state
    const user1After = await User.findById(user1._id);
    const user2After = await User.findById(user2._id);
    
    console.log('\nAfter acceptance:');
    console.log('User 1 friends:', user1After.friends.length);
    console.log('User 1 sentRequests:', user1After.sentRequests.length);
    console.log('User 1 friendRequests:', user1After.friendRequests.length);
    console.log('User 2 friends:', user2After.friends.length);
    console.log('User 2 sentRequests:', user2After.sentRequests.length);
    console.log('User 2 friendRequests:', user2After.friendRequests.length);
    
    // Verify friendship is mutual
    const user1HasUser2 = user1After.friends.some(friend => friend.toString() === user2._id.toString());
    const user2HasUser1 = user2After.friends.some(friend => friend.toString() === user1._id.toString());
    
    console.log('\nFriendship verification:');
    console.log('User 1 has User 2 as friend:', user1HasUser2);
    console.log('User 2 has User 1 as friend:', user2HasUser1);
    console.log('Mutual friendship:', user1HasUser2 && user2HasUser1);
    
    // Clean up test users
    await User.findByIdAndDelete(user1._id);
    await User.findByIdAndDelete(user2._id);
    console.log('\nTest users cleaned up');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
  }
};

testFriendAcceptance();