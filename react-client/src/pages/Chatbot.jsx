import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm here to help you with any questions about your healthcare journey. How can I assist you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        text: getBotResponse(inputText),
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const getBotResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('appointment') || message.includes('schedule')) {
      return "I can help you schedule an appointment. Please contact our office at (555) 123-4567 or use our online booking system.";
    } else if (message.includes('hearing') || message.includes('test')) {
      return "Our hearing assessments are comprehensive and typically take 45-60 minutes. We'll evaluate your hearing ability and discuss treatment options if needed.";
    } else if (message.includes('insurance') || message.includes('cost')) {
      return "We accept most major insurance plans. Please bring your insurance card to your appointment, and we'll verify your coverage.";
    } else if (message.includes('location') || message.includes('address')) {
      return "We're located at 123 Healthcare Ave, Suite 200. Free parking is available on-site.";
    } else if (message.includes('hours') || message.includes('open')) {
      return "Our office hours are Monday-Friday: 8:00 AM - 5:00 PM, Saturday: 9:00 AM - 2:00 PM. We're closed on Sundays.";
    } else {
      return "Thank you for your question! For specific medical concerns, please consult with our healthcare professionals. Is there anything else I can help you with regarding appointments, services, or general information?";
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Inline styles to ensure compatibility
  const floatingButtonStyle = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 9999,
    backgroundColor: '#10b981',
    color: 'white',
    borderRadius: '50%',
    padding: '16px',
    border: 'none',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const chatWindowStyle = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '384px',
    maxWidth: 'calc(100vw - 48px)',
    height: '500px',
    maxHeight: 'calc(100vh - 48px)',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #e5e7eb'
  };

  const headerStyle = {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '16px',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const messagesContainerStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    backgroundColor: '#f9fafb',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  };

  const userMessageStyle = {
    display: 'flex',
    justifyContent: 'flex-end'
  };

  const botMessageStyle = {
    display: 'flex',
    justifyContent: 'flex-start'
  };

  const userBubbleStyle = {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    maxWidth: '280px',
    fontSize: '14px'
  };

  const botBubbleStyle = {
    backgroundColor: 'white',
    color: '#374151',
    padding: '12px 16px',
    borderRadius: '8px',
    maxWidth: '280px',
    border: '1px solid #e5e7eb',
    fontSize: '14px'
  };

  const inputAreaStyle = {
    padding: '16px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: 'white',
    borderBottomLeftRadius: '8px',
    borderBottomRightRadius: '8px',
    display: 'flex',
    gap: '8px'
  };

  const textareaStyle = {
    flex: 1,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit'
  };

  const sendButtonStyle = {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: inputText.trim() ? 1 : 0.5
  };

  const closeButtonStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '50%',
    padding: '4px',
    cursor: 'pointer',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const typingIndicatorStyle = {
    display: 'flex',
    justifyContent: 'flex-start'
  };

  const typingBubbleStyle = {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    padding: '12px 16px',
    borderRadius: '8px',
    maxWidth: '280px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const dotStyle = {
    width: '8px',
    height: '8px',
    backgroundColor: '#9ca3af',
    borderRadius: '50%',
    animation: 'bounce 1.4s infinite ease-in-out'
  };

  return (
    <>
      <style>
        {`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
          .dot-1 { animation-delay: -0.32s; }
          .dot-2 { animation-delay: -0.16s; }
          .dot-3 { animation-delay: 0s; }
        `}
      </style>

      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={floatingButtonStyle}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#059669';
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#10b981';
            e.target.style.transform = 'scale(1)';
          }}
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div style={chatWindowStyle}>
          {/* Header */}
          <div style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={20} />
              <h3 style={{ margin: 0, fontWeight: '600', fontSize: '16px' }}>OtoPilot</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={closeButtonStyle}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Container */}
          <div style={messagesContainerStyle}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={message.sender === 'user' ? userMessageStyle : botMessageStyle}
              >
                <div style={message.sender === 'user' ? userBubbleStyle : botBubbleStyle}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    {message.sender === 'bot' && <Bot size={16} style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }} />}
                    {message.sender === 'user' && <User size={16} style={{ color: 'white', marginTop: '2px', flexShrink: 0 }} />}
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{message.text}</p>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '12px', 
                        color: message.sender === 'user' ? 'rgba(255, 255, 255, 0.7)' : '#6b7280' 
                      }}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div style={typingIndicatorStyle}>
                <div style={typingBubbleStyle}>
                  <Bot size={16} style={{ color: '#10b981' }} />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <div style={dotStyle} className="dot-1"></div>
                    <div style={dotStyle} className="dot-2"></div>
                    <div style={dotStyle} className="dot-3"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={inputAreaStyle}>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              style={textareaStyle}
              rows="2"
              onFocus={(e) => {
                e.target.style.borderColor = '#10b981';
                e.target.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              style={sendButtonStyle}
              onMouseEnter={(e) => {
                if (inputText.trim()) {
                  e.target.style.backgroundColor = '#059669';
                }
              }}
              onMouseLeave={(e) => {
                if (inputText.trim()) {
                  e.target.style.backgroundColor = '#10b981';
                }
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;