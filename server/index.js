// Import required modules and set up server
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('./config/redisConnection'); // Import and configure a Redis connection

const app = express();
const httpServer = createServer(app);

// Create a Socket.IO server with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173', // Define the allowed origin for socket connections
  },
});

// Create data structures to manage available users and conversations
const availableUsers = new Set();
const conversations = new Map();

// Handle socket connections
io.on('connection', socket => {
  // Handle "findPartner" event when a user is looking for a partner
  socket.on('findPartner', user => {
    // Add the user to the set of available users
    availableUsers.add(user);

    if (availableUsers.size > 1) {
      // If there are at least 2 available users, find a partner
      const initiator = user;
      const recipient = [...availableUsers].find(user => user !== initiator);

      // Remove initiator and recipient from available users
      availableUsers.delete(initiator);
      availableUsers.delete(recipient);

      // Create a unique conversation ID and room name
      const conversationID = `${conversations.size + 1}`;
      const roomName = `${initiator}-${recipient}`;

      // Emit an event to both users to initiate the conversation
      io.to([recipient, initiator]).emit('conversationInitiated', { conversationID, roomName });

      // If the conversation does not exist, create it
      if (!conversations.has(conversationID)) {
        conversations.set(conversationID, {
          participants: [initiator, recipient],
          messages: [],
        });
      }

      // Log available users and conversations
      console.log(`Available Users: ${availableUsers}`);
      console.log(`Conversations Users: ${conversations}`);
    }
  });

  // Handle "sendMessage" event when a user sends a message
  socket.on('sendMessage', ({ conversationId, message }) => {
    const conversation = conversations.get(conversationId);

    if (conversation) {
      // Add the message to the conversation and broadcast it to all participants
      conversation.messages.push(message);
      io.emit('messageReceived', { conversationIdSocket: conversationId, message });
    }
  });

  // Handle "userTyping" event when a user starts typing
  socket.on('userTyping', ({ conversationId, typingUser }) => {
    const otherUser = conversations.get(conversationId).participants.find(u => u !== typingUser);

    // Emit an event to inform the other user that someone is typing
    io.to(otherUser).emit('otherUserTyping', otherUser);
  });

  // Handle "userStopTyping" event when a user stops typing
  socket.on('userStopTyping', ({ conversationId, typingUser }) => {
    const otherUser = conversations.get(conversationId).participants.find(u => u !== typingUser);

    // Emit an event to inform the other user that someone stopped typing
    io.to(otherUser).emit('otherUserStopTyping', otherUser);
  });

  // Handle "disconnect" event when a user disconnects
  socket.on('disconnect', () => {
    let conversationID;

    // Find the conversation ID associated with the disconnected user
    conversations.forEach((conversation, id) => {
      if (conversation.participants.includes(socket.id)) {
        conversationID = id;
      }
    });

    if (conversationID) {
      // Notify participants and remove the conversation
      const currentConversation = conversations.get(conversationID);
      io.to(currentConversation.participants).emit('conversationDismissed');
      conversations.delete(conversationID);

      // Log available users after the disconnect
      console.log(`Disconnect available users: ${availableUsers}`);
    }
  });

  // Handle "userSkipped" event (seems to be for debugging)
  socket.on('userSkipped', ({ conversationId, socketId }) => {
    console.log(`User skipped hitting. c:${conversationId}, socket:${socketId}`);
  });
});

// Set up the server to listen on a specified port or default to 6060
const PORT = process.env.PORT || 6060;
httpServer.listen(PORT, () => console.log(`server is alive on PORT:${PORT}`));
