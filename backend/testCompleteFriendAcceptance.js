require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Chat = require('./models/Chat');

// Test the complete friend acceptance flow with chat creation
const testCompleteFriendAcceptance = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Create two new test users for clean test
    const user1 = new User({
      username: 'test_user_1',
      email: 'test1_accept@example.com',
      password: 'password123'
    });
    
    const user2 = new User({
      username: 'test_user_2',
      email: 'test2_accept@example.com',
      password: 'password123'
    });
    
    await user1.save();
    await user2.save();
    
    console.log('Created test users:');
    console.log('User 1:', user1.username, user1._id);
    console.log('User 2:', user2.username, user2._id);
    
    // Verify they start with no friends or chats
    console.log('\n=== Initial State ===');
    console.log('User 1 friends count:', user1.friends.length);
    console.log('User 2 friends count:', user2.friends.length);
    
    // Check if chat already exists
    const existingChats = await Chat.find({
      participants: {
        $all: [user1._id, user2._id],
        $size: 2
      }
    });
    
    console.log('Existing chats between users:', existingChats.length);
    
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
      request => request.from && request.from.toString() === user1._id.toString()
    );
    
    console.log('Request index found:', requestIndex);
    
    if (requestIndex === -1) {
      console.log('Friend request not found');
      return;
    }
    
    // Add each other as friends
    if (!user2AfterRequest.friends.includes(user1._id)) {
      user2AfterRequest.friends.push(user1._id);
      await user2AfterRequest.save();
      console.log('Added user1 to user2 friends');
    }
    
    const requester = await User.findById(user1._id);
    if (!requester.friends.includes(user2._id)) {
      requester.friends.push(user2._id);
      await requester.save();
      console.log('Added user2 to user1 friends');
    }
    
    // Remove the request from both users
    user2AfterRequest.friendRequests.splice(requestIndex, 1);
    await user2AfterRequest.save();
    console.log('Removed request from user2');
    
    const sentRequestIndex = requester.sentRequests.findIndex(
      req => req.to && req.to.toString() === user2._id.toString()
    );
    
    console.log('Sent request index found:', sentRequestIndex);
    
    if (sentRequestIndex !== -1) {
      requester.sentRequests.splice(sentRequestIndex, 1);
      await requester.save();
      console.log('Removed sent request from user1');
    }
    
    // Create a chat document between the two users if it doesn't already exist
    console.log('\n=== Creating Chat Document ===');
    try {
      // Check if a chat already exists between these two users
      const existingChat = await Chat.findOne({
        participants: {
          $all: [user1._id, user2._id],
          $size: 2
        }
      });
      
      if (!existingChat) {
        // Create a new chat document
        const newChat = new Chat({
          participants: [user1._id, user2._id],
          lastMessage: '',
          lastMessageTimestamp: null
        });
        await newChat.save();
        console.log('✅ Created new chat between users:', user1._id, user2._id);
      } else {
        console.log('Chat already exists between users:', user1._id, user2._id);
      }
    } catch (chatError) {
      console.error('Error creating chat document:', chatError.message);
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
    
    // Check if chat was created
    const finalChats = await Chat.find({
      participants: {
        $all: [user1._id, user2._id],
        $size: 2
      }
    });
    
    console.log('Chats between users after operation:', finalChats.length);
    if (finalChats.length > 0) {
      console.log('✅ SUCCESS: Chat document created successfully!');
      console.log('Chat ID:', finalChats[0]._id);
      console.log('Participants:', finalChats[0].participants.map(p => p.toString()));
    } else {
      console.log('❌ FAILURE: Chat document not created!');
    }
    
    if (user1HasUser2 && user2HasUser1) {
      console.log('\n✅ SUCCESS: Mutual friendship established correctly!');
    } else {
      console.log('\n❌ FAILURE: Mutual friendship not established!');
    }
    
    // Clean up test users and chat
    console.log('\n=== Cleaning Up ===');
    await User.findByIdAndDelete(user1._id);
    await User.findByIdAndDelete(user2._id);
    if (finalChats.length > 0) {
      await Chat.findByIdAndDelete(finalChats[0]._id);
    }
    console.log('Test users and chat cleaned up');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
  }
};

testCompleteFriendAcceptance();