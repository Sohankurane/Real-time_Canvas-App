// src/components/ChatBox.js
import React, { useState, useEffect, useRef, useContext } from 'react';
import { WebSocketContext } from '../context/WebSocketContext';
import './ChatBox.css';

const ChatBox = ({ roomId, username }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const { sendMessage, lastMessage } = useContext(WebSocketContext);

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        if (data.type === 'chat' && data.roomId === roomId) {
          setMessages(prev => [
            ...prev,
            {
              username: data.username,
              message: data.message,
              timestamp: data.timestamp,
              isOwn: data.username === username,
            },
          ]);
        }
      } catch (e) {
        // ignore
      }
    }
  }, [lastMessage, roomId, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const chatData = {
      type: 'chat',
      roomId,
      username,
      message: inputMessage,
      timestamp: new Date().toISOString(),
    };

    sendMessage(JSON.stringify(chatData));
    setInputMessage('');
    // CRITICAL FIX: Removed local message addition - wait for server broadcast instead
  };

  return (
    <div className={`chat-box ${isMinimized ? 'minimized' : ''}`}>
      <div className="chat-header" onClick={() => setIsMinimized(!isMinimized)}>
        <h3>💬 Chat</h3>
        <button className="minimize-btn">
          {isMinimized ? '▲' : '▼'}
        </button>
      </div>
      {!isMinimized && (
        <>
          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`message ${msg.isOwn ? 'own-message' : 'other-message'}`}
              >
                <div className="message-header">
                  <span className="message-username">{msg.username}</span>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-content">{msg.message}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type a message..."
              className="chat-input"
            />
            <button type="submit" className="send-btn">Send</button>
          </form>
        </>
      )}
    </div>
  );
};

export default ChatBox;
