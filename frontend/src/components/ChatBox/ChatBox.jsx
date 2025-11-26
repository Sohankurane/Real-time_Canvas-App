import React from 'react';
import { useChatBox } from './ChatBox.hook';
import './ChatBox.css';

const ChatBox = ({ roomId, username }) => {
  const {
    messages,
    newMessage,
    setNewMessage,
    isOpen,
    toggleChat,
    handleSendMessage,
    messagesEndRef
  } = useChatBox(roomId, username);

  return (
    <div className={`chatbox ${isOpen ? 'chatbox-open' : 'chatbox-closed'}`}>
      <div className="chatbox-header" onClick={toggleChat}>
        <span className="chatbox-title">💬 Chat</span>
        <span className="chatbox-toggle">{isOpen ? '▼' : '▲'}</span>
      </div>

      {isOpen && (
        <div className="chatbox-body">
          <div className="chatbox-messages">
            {messages.length === 0 ? (
              <div className="chatbox-empty">No messages yet. Start chatting!</div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`chatbox-message ${
                    msg.username === username ? 'chatbox-message-own' : ''
                  }`}
                >
                  <div className="chatbox-message-header">
                    <span className="chatbox-message-user">{msg.username}</span>
                    <span className="chatbox-message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="chatbox-message-text">{msg.message}</div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chatbox-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="chatbox-input"
              maxLength={500}
            />
            <button type="submit" className="chatbox-send-btn" disabled={!newMessage.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBox;
