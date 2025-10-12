const User = require('../models/User');

// Send notification to user
const sendNotification = async (userId, notificationData) => {
  try {
    // In a real app, this would integrate with a push notification service
    // like Firebase Cloud Messaging or Apple Push Notification Service
    
    // For now, we'll just update the user's notification field
    const user = await User.findById(userId);
    if (user) {
      // Add notification to user's notification array (would need to add this field to the User model)
      // user.notifications.push(notificationData);
      // await user.save();
      
      console.log(`Notification sent to user ${userId}:`, notificationData);
      return { success: true };
    }
    return { success: false, message: 'User not found' };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, message: error.message };
  }
};

// Send friend request notification
const sendFriendRequestNotification = async (recipientId, sender) => {
  const notificationData = {
    type: 'friend_request',
    title: 'New Friend Request',
    body: `${sender.username} sent you a friend request`,
    sender: sender._id,
    timestamp: new Date()
  };
  
  return await sendNotification(recipientId, notificationData);
};

// Send message notification
const sendMessageNotification = async (recipientId, sender, content) => {
  const notificationData = {
    type: 'message',
    title: `New message from ${sender.username}`,
    body: content.length > 50 ? content.substring(0, 50) + '...' : content,
    sender: sender._id,
    timestamp: new Date()
  };
  
  return await sendNotification(recipientId, notificationData);
};

module.exports = {
  sendFriendRequestNotification,
  sendMessageNotification
};