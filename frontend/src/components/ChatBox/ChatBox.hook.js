import { useState, useEffect, useRef, useContext } from 'react';
import { WebSocketContext } from '../../context/WebSocketContext';
import { WS_EVENTS } from '../../constants';

/**
 * Custom hook for ChatBox component
 * Handles all business logic and state management
 */
export const useChatBox = (roomId, username) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const { lastMessage, sendMessage } = useContext(WebSocketContext);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen to WebSocket messages for chat events
  useEffect(() => {
    if (!lastMessage) return;

    try {
      const msg = JSON.parse(lastMessage);
      
      if (msg.type === WS_EVENTS.CHAT) {
        setMessages((prev) => [
          ...prev,
          {
            username: msg.username,
            message: msg.message,
            timestamp: msg.timestamp || new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Error parsing chat message:', error);
    }
  }, [lastMessage]);

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !sendMessage) return;

    const chatMessage = {
      type: WS_EVENTS.CHAT,
      username,
      message: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    sendMessage(JSON.stringify(chatMessage));
    setNewMessage('');
  };

  return {
    messages,
    newMessage,
    setNewMessage,
    isOpen,
    toggleChat,
    handleSendMessage,
    messagesEndRef
  };
};
