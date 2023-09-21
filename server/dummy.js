// Server-side code
io.on('connection', async socket => {
  connectedUsers.push(socket.id);
  setItem('connectedUsers', connectedUsers);

  socket.on('joinConversation', ({ conversationId }) => {
    socket.join(conversationId);
  });

  if (connectedUsers.length >= 2) {
    //initiate a conversation
    const userOne = socket.id;
    const userTwo = connectedUsers.find(user => user !== userOne);

    const userOneIndex = connectedUsers.indexOf(userOne);
    const userTwoIndex = connectedUsers.indexOf(userTwo);
    if (userOneIndex !== -1 && userTwoIndex !== -1) {
      connectedUsers.splice(userOneIndex, 1);
      connectedUsers.splice(userTwoIndex - 1, 1);
      setItem('connectedUsers', connectedUsers);

      const conversationData = {
        conversationId: uuid(),
        participants: [userOne, userTwo],
        messages: [],
      };

      io.to(userOne).emit('conversationStarted', conversationData);
      io.to(userTwo).emit('conversationStarted', conversationData);
      socket.join(conversationData.conversationId);
      conversations.push(conversationData);
      await setItem('conversations', conversations);
    }
  }

  socket.on('sendMessage', async ({ conversationId, message }) => {
    const correspondingConversation = await getItem('conversations');
    const conversation = correspondingConversation.find(c => c.conversationId === conversationId);

    if (conversation) {
      conversation.messages.push(message);
      io.to(conversationId).emit('messageReceived', conversation.messages);
      await setItem('conversations', correspondingConversation);
    }
  });
});




useEffect(() => {
  if (socket) {
    socket.on('conversationStarted', data => {
      setConversationStarted(true);
      setConversationId(data.conversationId);
      socket.emit('joinConversation', { conversationId: data.conversationId });
    });

    socket.on('messageReceived', messages => {
      const currentConversation = messages.every(
        message => message.conversationId == conversationId
      );

      if (currentConversation) {
        setMessages(messages);
      }
    });
  }
}, [socket, conversationId]);
