require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Chat = require('./models/Chat');

// Test the chat creation when friend request is accepted
const testChatCreation = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find existing test users
    const user1 = await User.findOne({ email: 'ashok@gmail.com' });
    const user2 = await User.findById(user1.friends[0]); // Get first friend
    
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
    console.log('User 2 friends count:', user2.friends.length);
    
    // Check if chat already exists
    const existingChats = await Chat.find({
      participants: {
        $all: [user1._id, user2._id],
        $size: 2
      }
    });
    
    console.log('Existing chats between users:', existingChats.length);
    
    // Clear any existing chats for clean test
    if (existingChats.length > 0) {
      await Chat.deleteMany({
        participants: {
          $all: [user1._id, user2._id],
          $size: 2
        }
      });
      console.log('Cleared existing chats');
    }
    
    // Simulate sending friend request from user1 to user2 (if not already friends)
    if (!user1.friends.includes(user2._id)) {
      console.log('\n=== Sending Friend Request ===');
      user2.friendRequests.push({ from: user1._id });
      user1.sentRequests.push({ to: user2._id });
      
      await user1.save();
      await user2.save();
      
      console.log('Friend request sent');
      
      // Simulate accepting friend request (exact logic from controller)
      console.log('\n=== Accepting Friend Request ===');
      
      // Find the request in user2's friendRequests
      const requestIndex = user2.friendRequests.findIndex(
        request => request.from && request.from.toString() === user1._id.toString()
      );
      
      console.log('Request index found:', requestIndex);
      
      if (requestIndex === -1) {
        console.log('Friend request not found');
        return;
      }
      
      // Add each other as friends
      if (!user2.friends.includes(user1._id)) {
        user2.friends.push(user1._id);
        await user2.save();
        console.log('Added user1 to user2 friends');
      }
      
      const requester = await User.findById(user1._id);
      if (!requester.friends.includes(user2._id)) {
        requester.friends.push(user2._id);
        await requester.save();
        console.log('Added user2 to user1 friends');
      }
      
      // Remove the request from both users
      user2.friendRequests.splice(requestIndex, 1);
      await user2.save();
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
    } else {
      console.log('Users are already friends');
      
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
    }
    
    // Check final state
    const user1Final = await User.findById(user1._id);
    const user2Final = await User.findById(user2._id);
    
    console.log('\n=== Final State ===');
    console.log('User 1 friends count:', user1Final.friends.length);
    console.log('User 2 friends count:', user2Final.friends.length);
    
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
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
  }
};

testChatCreation();