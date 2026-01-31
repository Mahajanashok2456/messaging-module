import User from "@/lib/db/User";

// Send notification to user
export async function sendNotification(userId, notificationData) {
  try {
    const user = await User.findById(userId);
    if (user) {
      console.log(`Notification sent to user ${userId}:`, notificationData);
      return { success: true };
    }
    return { success: false, message: "User not found" };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, message: error.message };
  }
}

// Send friend request notification
export async function sendFriendRequestNotification(recipientId, sender) {
  const notificationData = {
    type: "friend_request",
    title: "New Friend Request",
    body: `${sender.username} sent you a friend request`,
    sender: sender._id,
    timestamp: new Date(),
  };

  return await sendNotification(recipientId, notificationData);
}

// Send message notification
export async function sendMessageNotification(recipientId, sender, content) {
  const notificationData = {
    type: "message",
    title: `New message from ${sender.username}`,
    body: content.length > 50 ? content.substring(0, 50) + "..." : content,
    sender: sender._id,
    timestamp: new Date(),
  };

  return await sendNotification(recipientId, notificationData);
}
