import React, { createContext, useContext, useState } from 'react';

const ChatbotContext = createContext();

export const useChatbot = () => {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
};

export const ChatbotProvider = ({ children }) => {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm here to help you with any questions about your healthcare journey. How can I assist you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);

  const addMessage = (message) => {
    setMessages(prev => [...prev, { ...message, id: prev.length + 1, timestamp: new Date() }]);
  };

  const clearMessages = () => {
    setMessages([
      {
        id: 1,
        text: "Hello! I'm here to help you with any questions about your healthcare journey. How can I assist you today?",
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
  };

  return (
    <ChatbotContext.Provider value={{
      isChatbotOpen,
      setIsChatbotOpen,
      messages,
      setMessages,
      addMessage,
      clearMessages
    }}>
      {children}
    </ChatbotContext.Provider>
  );
};