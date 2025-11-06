import Chat from '../models/Chat.js';

export const getChats = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user.id })
      .populate('participants', 'firstName lastName profileImage')
      .populate('messages.sender', 'firstName lastName profileImage')
      .sort({ lastMessageTime: -1 });

    res.status(200).json({ success: true, count: chats.length, data: chats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { chatId, content, recipientId } = req.body;
    let chat;

    if (chatId) {
      chat = await Chat.findById(chatId);
    } else if (recipientId) {
      chat = await Chat.findOne({
        isGroupChat: false,
        participants: { $all: [req.user.id, recipientId] },
      });

      if (!chat) {
        chat = await Chat.create({
          participants: [req.user.id, recipientId],
          isGroupChat: false,
        });
      }
    }

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    chat.messages.push({
      sender: req.user.id,
      content,
    });

    chat.lastMessage = content;
    chat.lastMessageTime = new Date();
    await chat.save();

    res.status(200).json({ success: true, data: chat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
