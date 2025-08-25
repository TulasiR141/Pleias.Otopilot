import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Maximize2, Minimize2, Eye, EyeOff, Search } from 'lucide-react';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
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
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Function to clean text but preserve HTML formatting tags
    const cleanResponseText = (text) => {
        if (!text) return '';

        // Remove specific unwanted tags
        let cleanedText = text.replace(/<ref[^>]*>.*?<\/ref>/gi, '');
        cleanedText = cleanedText.replace(/<ref[^>]*>/gi, '');

        // Remove any <|anything|> pattern tags (generalized)
        cleanedText = cleanedText.replace(/<\|[^|]*\|>/gi, '');

        // Convert ### TEXT ### patterns to <b>TEXT</b>
        cleanedText = cleanedText.replace(/###\s*([^#]+?)\s*###/g, '<b>$1</b>');

        // Remove any remaining tag-like patterns but keep HTML formatting
        cleanedText = cleanedText.replace(/\[ref[^\]]*\]/gi, '');
        cleanedText = cleanedText.replace(/\{[^}]*\}/g, '');

        // Clean up extra whitespace but preserve line breaks
        cleanedText = cleanedText.replace(/[ \t]+/g, ' ').trim();

        return cleanedText;
    };

    // Function to render HTML content safely
    const renderHTMLContent = (htmlString) => {
        return <div dangerouslySetInnerHTML={{ __html: htmlString }} />;
    };

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
        setTimeout(async () => {
            const response = await getBotResponse(inputText);
            const botResponse = {
                id: messages.length + 2,
                text: response || "Thank you for your message. I'm here to help with any questions about your healthcare journey.",
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botResponse]);
            setIsTyping(false);
        }, 1500);
    };

    const getBotResponse = async (userMessage) => {
        const message = userMessage.toLowerCase();

        try {
            const res = await fetch("https://myapi.57.128.85.149.nip.io:5443/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: "test_user",
                    query: message
                }),
            });
            const data = await res.json();
            console.log("Response:", data);

            // Store analysis data if available
            if (data.source_urls) {
                setAnalysisData({
                    sources: data.source_urls || [],
                    messageId: data.messageId || `msg_${Date.now()}`,
                    query: message,
                    timestamp: new Date()
                });
            }

            // Clean the response text to remove HTML/XML tags
            const rawText = data.generated_text || data.message || "I'm here to help you with your healthcare questions.";
            const cleanedText = cleanResponseText(rawText);

            return cleanedText;
        } catch (error) {
            console.error("Error:", error);
            return "I'm here to help you with your healthcare questions. Please try again.";
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

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const toggleAnalysis = () => {
        setShowAnalysis(!showAnalysis);
    };

    // Inline styles for all components
    const styles = {
        keyframes: `
      @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      @keyframes messageSlideIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `,

        floatingButton: {
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
        },

        chatWindow: {
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: isExpanded ? '80vw' : (showAnalysis ? '850px' : '400px'),
            maxWidth: isExpanded ? '1200px' : 'calc(100vw - 48px)',
            height: isExpanded ? '80vh' : '600px',
            maxHeight: isExpanded ? '800px' : 'calc(100vh - 48px)',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            ...(isExpanded && {
                bottom: '10vh',
                right: '10vw'
            })
        },

        header: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)',
            flexShrink: 0,
            height: '70px',
            boxSizing: 'border-box'
        },

        headerLeft: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },

        logo: {
            width: '32px',
            height: '32px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },

        titleContainer: {
            display: 'flex',
            flexDirection: 'column'
        },

        title: {
            margin: 0,
            fontWeight: 600,
            fontSize: '18px',
            letterSpacing: '-0.025em'
        },

        subtitle: {
            margin: 0,
            fontSize: '12px',
            opacity: 0.8,
            fontWeight: 400
        },

        headerControls: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },

        controlButton: {
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            border: 'none',
            borderRadius: '6px',
            padding: '8px',
            cursor: 'pointer',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
        },

        expandedLayout: {
            display: 'flex',
            height: 'calc(100% - 70px)',
            overflow: 'hidden'
        },

        chatContent: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            borderRight: showAnalysis ? '1px solid #e5e7eb' : 'none',
            minWidth: 0,
            width: showAnalysis ? '450px' : '100%'
        },

        analysisPanel: {
            width: showAnalysis ? '400px' : '0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            flexShrink: 0
        },

        messages: {
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minHeight: 0
        },

        message: {
            display: 'flex',
            gap: '12px',
            maxWidth: '85%',
            animation: 'messageSlideIn 0.3s ease-out'
        },

        messageUser: {
            alignSelf: 'flex-end',
            flexDirection: 'row-reverse'
        },

        messageBot: {
            alignSelf: 'flex-start'
        },

        avatar: {
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '4px'
        },

        avatarBot: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white'
        },

        avatarUser: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white'
        },

        messageContent: {
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
        },

        bubble: {
            padding: '12px 16px',
            borderRadius: '18px',
            fontSize: '14px',
            lineHeight: '1.5',
            wordWrap: 'break-word',
            position: 'relative',
            whiteSpace: 'pre-wrap'
        },

        bubbleBot: {
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        },

        bubbleUser: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
        },

        timestamp: {
            fontSize: '11px',
            opacity: 0.6,
            marginTop: '2px',
            padding: '0 4px',
            color: '#6b7280'
        },

        timestampUser: {
            textAlign: 'right'
        },

        timestampBot: {
            textAlign: 'left'
        },

        typing: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '85%',
            alignSelf: 'flex-start'
        },

        typingBubble: {
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            padding: '12px 16px',
            borderRadius: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        },

        typingDots: {
            display: 'flex',
            gap: '4px'
        },

        typingDot: {
            width: '8px',
            height: '8px',
            backgroundColor: '#9ca3af',
            borderRadius: '50%',
            animation: 'bounce 1.4s infinite ease-in-out'
        },

        inputArea: {
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: 'white',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end',
            flexShrink: 0
        },

        inputWrapper: {
            flex: 1,
            position: 'relative'
        },

        textarea: {
            width: '100%',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: '1.5',
            minHeight: '44px',
            maxHeight: '120px',
            transition: 'all 0.2s ease',
            backgroundColor: '#f9fafb',
            boxSizing: 'border-box'
        },

        sendButton: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            minWidth: '44px',
            height: '44px',
            flexShrink: 0
        },

        sendButtonDisabled: {
            opacity: 0.5,
            cursor: 'not-allowed'
        },

        analysisHeader: {
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white'
        },

        analysisTitle: {
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },

        analysisCloseButton: {
            backgroundColor: 'transparent',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: '#6b7280',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },

        analysisContent: {
            flex: 1,
            overflow: 'auto',
            padding: '20px',
            minHeight: 0
        },

        analysisMessage: {
            fontSize: '14px',
            color: '#6b7280',
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '40px 20px'
        },

        analysisSection: {
            marginBottom: '24px'
        },

        analysisSectionTitle: {
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '12px'
        },

        sourceItem: {
            padding: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '8px',
            border: '1px solid #e5e7eb'
        },

        sourceTitle: {
            fontSize: '13px',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '4px'
        },

        sourceContent: {
            fontSize: '12px',
            color: '#6b7280',
            lineHeight: '1.4'
        },

        analysisButton: {
            backgroundColor: 'transparent',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '8px 12px',
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            marginTop: '8px'
        },

        backgroundBlur: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(4px)',
            zIndex: 9998,
            transition: 'all 0.3s ease'
        }
    };

    const renderAnalysisPanel = () => (
        <div style={styles.analysisPanel}>
            {showAnalysis && (
                <>
                    <div style={styles.analysisHeader}>
                        <h3 style={styles.analysisTitle}>
                            <Search size={16} />
                            Analysis
                        </h3>
                        <button
                            onClick={toggleAnalysis}
                            style={styles.analysisCloseButton}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#f3f4f6';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div style={styles.analysisContent}>
                        {!analysisData ? (
                            <div style={styles.analysisMessage}>
                                No analysis or sources available for message
                                <br />
                                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                    msg_175587121944_4_u3f1r48z4
                                </span>
                            </div>
                        ) : (
                            <div>
                                {analysisData.sources && analysisData.sources.length > 0 && (
                                    <div style={styles.analysisSection}>
                                        <h4 style={styles.analysisSectionTitle}>Sources ({analysisData.sources.length})</h4>
                                        {analysisData.sources.map((source, index) => (
                                            <div key={index} style={styles.sourceItem}>
                                                <div style={styles.sourceTitle}>
                                                    Source {index + 1}
                                                </div>
                                                <div style={styles.sourceContent}>
                                                    {typeof source === 'string' ? source : (source.content || source.text || 'No content available')}
                                                </div>
                                                {typeof source === 'object' && source.url && (
                                                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                                                        {source.url}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );

    const renderMessages = () => (
        <div style={styles.messages}>
            {messages.map((message) => (
                <div
                    key={message.id}
                    style={{
                        ...styles.message,
                        ...(message.sender === 'user' ? styles.messageUser : styles.messageBot)
                    }}
                >
                    <div style={{
                        ...styles.avatar,
                        ...(message.sender === 'bot' ? styles.avatarBot : styles.avatarUser)
                    }}>
                        {message.sender === 'bot' ? <Bot size={18} /> : <User size={18} />}
                    </div>
                    <div style={styles.messageContent}>
                        <div style={{
                            ...styles.bubble,
                            ...(message.sender === 'bot' ? styles.bubbleBot : styles.bubbleUser)
                        }}>
                            {message.sender === 'bot' ?
                                renderHTMLContent(message.text) :
                                message.text
                            }
                        </div>
                        <div style={{
                            ...styles.timestamp,
                            ...(message.sender === 'user' ? styles.timestampUser : styles.timestampBot)
                        }}>
                            {formatTime(message.timestamp)}
                        </div>
                    </div>
                </div>
            ))}

            {isTyping && (
                <div style={styles.typing}>
                    <div style={styles.avatarBot}>
                        <Bot size={18} />
                    </div>
                    <div style={styles.typingBubble}>
                        <div style={styles.typingDots}>
                            <div style={{ ...styles.typingDot, animationDelay: '-0.32s' }}></div>
                            <div style={{ ...styles.typingDot, animationDelay: '-0.16s' }}></div>
                            <div style={{ ...styles.typingDot, animationDelay: '0s' }}></div>
                        </div>
                    </div>
                </div>
            )}

            {messages.length > 1 && (
                <div style={{ padding: '0 20px 10px', flexShrink: 0 }}>
                    {!showAnalysis ? (
                        <button
                            onClick={toggleAnalysis}
                            style={styles.analysisButton}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#f3f4f6';
                                e.target.style.borderColor = '#9ca3af';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.borderColor = '#d1d5db';
                            }}
                        >
                            <Eye size={14} />
                            View Resources
                        </button>
                    ) : (
                        <button
                            onClick={toggleAnalysis}
                            style={styles.analysisButton}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#f3f4f6';
                                e.target.style.borderColor = '#9ca3af';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.borderColor = '#d1d5db';
                            }}
                        >
                            <EyeOff size={14} />
                            Hide Resources
                        </button>
                    )}
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );

    const renderInputArea = () => (
        <div style={styles.inputArea}>
            <div style={styles.inputWrapper}>
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    style={styles.textarea}
                    rows="1"
                    onFocus={(e) => {
                        e.target.style.borderColor = '#10b981';
                        e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                        e.target.style.backgroundColor = 'white';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                        e.target.style.backgroundColor = '#f9fafb';
                    }}
                />
            </div>
            <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                style={{
                    ...styles.sendButton,
                    ...(inputText.trim() ? {} : styles.sendButtonDisabled)
                }}
                onMouseEnter={(e) => {
                    if (inputText.trim()) {
                        e.target.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (inputText.trim()) {
                        e.target.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                    }
                }}
            >
                <Send size={16} />
            </button>
        </div>
    );

    return (
        <>
            <style>{styles.keyframes}</style>
            <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {isExpanded && (
                    <div style={styles.backgroundBlur} onClick={() => setIsExpanded(false)} />
                )}

                {!isOpen && (
                    <button
                        onClick={() => setIsOpen(true)}
                        style={styles.floatingButton}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                            e.target.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                            e.target.style.transform = 'scale(1)';
                        }}
                    >
                        <MessageCircle size={24} />
                    </button>
                )}

                {isOpen && (
                    <div style={styles.chatWindow}>
                        <div style={styles.header}>
                            <div style={styles.headerLeft}>
                                <div style={styles.logo}>
                                    <Bot size={20} />
                                </div>
                                <div style={styles.titleContainer}>
                                    <h3 style={styles.title}>OtoPilot</h3>
                                    <p style={styles.subtitle}>Healthcare Assistant</p>
                                </div>
                            </div>
                            <div style={styles.headerControls}>
                                <button
                                    onClick={toggleExpand}
                                    style={styles.controlButton}
                                    title={isExpanded ? "Minimize" : "Expand"}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                                        e.target.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                                        e.target.style.transform = 'scale(1)';
                                    }}
                                >
                                    {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setIsExpanded(false);
                                        setShowAnalysis(false);
                                    }}
                                    style={styles.controlButton}
                                    title="Close"
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                                        e.target.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                                        e.target.style.transform = 'scale(1)';
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div style={styles.expandedLayout}>
                            <div style={styles.chatContent}>
                                {renderMessages()}
                                {renderInputArea()}
                            </div>
                            {renderAnalysisPanel()}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Chatbot;