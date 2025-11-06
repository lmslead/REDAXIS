import { useState, useEffect } from 'react';
import { chatAPI, employeesAPI, getUser } from '../services/api';
import './Chat.css';

const Chat = () => {
  const [conversations, setConversations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const currentUser = getUser();

  useEffect(() => {
    fetchConversations();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser._id);
    }
  }, [selectedUser]);

  const fetchConversations = async () => {
    try {
      const response = await chatAPI.getAll();
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data.filter(emp => emp._id !== currentUser._id));
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const response = await chatAPI.getAll();
      const userMessages = response.data.filter(msg =>
        (msg.sender?._id === userId && msg.recipient?._id === currentUser._id) ||
        (msg.sender?._id === currentUser._id && msg.recipient?._id === userId)
      );
      setMessages(userMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      await chatAPI.sendMessage({
        recipient: selectedUser._id,
        message: newMessage,
      });
      setNewMessage('');
      fetchMessages(selectedUser._id);
      fetchConversations();
    } catch (error) {
      alert(error.message || 'Failed to send message');
    }
  };

  const getUniqueConversations = () => {
    const uniqueUsers = new Map();
    
    conversations.forEach(msg => {
      const otherUser = msg.sender?._id === currentUser._id ? msg.recipient : msg.sender;
      if (otherUser && otherUser._id !== currentUser._id) {
        if (!uniqueUsers.has(otherUser._id)) {
          uniqueUsers.set(otherUser._id, {
            user: otherUser,
            lastMessage: msg,
          });
        } else {
          const existing = uniqueUsers.get(otherUser._id);
          if (new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)) {
            uniqueUsers.set(otherUser._id, {
              user: otherUser,
              lastMessage: msg,
            });
          }
        }
      }
    });

    return Array.from(uniqueUsers.values()).sort((a, b) =>
      new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );
  };

  const filteredEmployees = employees.filter(emp =>
    emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h2 className="fw-bold">Messages</h2>
          <p className="text-muted">Chat with your colleagues</p>
        </div>
      </div>

      <div className="row">
        {/* Conversations List */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm" style={{ height: '600px' }}>
            <div className="card-header bg-white">
              <h6 className="mb-0 fw-bold">Conversations</h6>
            </div>
            <div className="card-body p-0">
              <div className="p-3 border-bottom">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div style={{ height: 'calc(100% - 60px)', overflowY: 'auto' }}>
                {searchTerm ? (
                  /* Show all employees when searching */
                  filteredEmployees.map(emp => (
                    <div
                      key={emp._id}
                      className={`d-flex align-items-center p-3 border-bottom chat-item ${
                        selectedUser?._id === emp._id ? 'active' : ''
                      }`}
                      onClick={() => { setSelectedUser(emp); setSearchTerm(''); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <img
                        src={emp.profileImage || '/assets/client.jpg'}
                        alt={emp.firstName}
                        className="rounded-circle me-3"
                        style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                      />
                      <div className="flex-grow-1">
                        <h6 className="mb-0">{emp.firstName} {emp.lastName}</h6>
                        <small className="text-muted">{emp.position || emp.role}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  /* Show conversations */
                  getUniqueConversations().length > 0 ? (
                    getUniqueConversations().map(({ user, lastMessage }) => (
                      <div
                        key={user._id}
                        className={`d-flex align-items-center p-3 border-bottom chat-item ${
                          selectedUser?._id === user._id ? 'active' : ''
                        }`}
                        onClick={() => setSelectedUser(user)}
                        style={{ cursor: 'pointer' }}
                      >
                        <img
                          src={user.profileImage || '/assets/client.jpg'}
                          alt={user.firstName}
                          className="rounded-circle me-3"
                          style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                        />
                        <div className="flex-grow-1 overflow-hidden">
                          <div className="d-flex justify-content-between align-items-start">
                            <h6 className="mb-0">{user.firstName} {user.lastName}</h6>
                            <small className="text-muted">
                              {new Date(lastMessage.createdAt).toLocaleDateString()}
                            </small>
                          </div>
                          <small className="text-muted text-truncate d-block">
                            {lastMessage.message}
                          </small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-5 text-muted">
                      <i className="bi bi-chat-dots fs-1 d-block mb-2"></i>
                      <p>No conversations yet</p>
                      <small>Search for an employee to start chatting</small>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Window */}
        <div className="col-md-8">
          <div className="card border-0 shadow-sm" style={{ height: '600px' }}>
            {selectedUser ? (
              <>
                <div className="card-header bg-white d-flex align-items-center">
                  <img
                    src={selectedUser.profileImage || '/assets/client.jpg'}
                    alt={selectedUser.firstName}
                    className="rounded-circle me-3"
                    style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                  />
                  <div>
                    <h6 className="mb-0">{selectedUser.firstName} {selectedUser.lastName}</h6>
                    <small className="text-muted">{selectedUser.position || selectedUser.role}</small>
                  </div>
                </div>
                
                <div className="card-body" style={{ overflowY: 'auto', height: 'calc(100% - 140px)' }}>
                  {messages.length > 0 ? (
                    messages.map(msg => {
                      const isSent = msg.sender?._id === currentUser._id || msg.sender === currentUser._id;
                      return (
                        <div key={msg._id} className={`mb-3 d-flex ${isSent ? 'justify-content-end' : 'justify-content-start'}`}>
                          <div className={`p-3 rounded ${isSent ? 'bg-primary text-white' : 'bg-light'}`} style={{ maxWidth: '70%' }}>
                            <p className="mb-1">{msg.message}</p>
                            <small className={isSent ? 'text-white-50' : 'text-muted'}>
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </small>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-5 text-muted">
                      <i className="bi bi-chat-text fs-1 d-block mb-2"></i>
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  )}
                </div>

                <div className="card-footer bg-white">
                  <form onSubmit={handleSendMessage} className="d-flex gap-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary">
                      <i className="bi bi-send"></i>
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="card-body d-flex align-items-center justify-content-center">
                <div className="text-center text-muted">
                  <i className="bi bi-chat-square-text fs-1 d-block mb-3"></i>
                  <h5>Select a conversation</h5>
                  <p>Choose a person from the list to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
