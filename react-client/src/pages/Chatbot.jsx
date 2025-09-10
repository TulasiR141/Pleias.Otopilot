import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Maximize2, Minimize2, Eye, EyeOff, Search } from 'lucide-react';
import "../styles/chatbot.css";

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Hi, I am OtoPilotAI. I am here to help to answer your questions on general audiology and administrative matters as well as hearing aids specifications. My knowledge is based on a curated corpus, and I only respond within it. How can I assist you today?",
            sender: 'bot',
            timestamp: new Date()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);
    const [expandedSources, setExpandedSources] = useState(new Set());
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
            if (data.sources) {
                setAnalysisData({
                    sources: data.sources || [],
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

    const toggleSourceExpansion = (sourceIndex) => {
        const newExpandedSources = new Set(expandedSources);
        if (newExpandedSources.has(sourceIndex)) {
            newExpandedSources.delete(sourceIndex);
        } else {
            newExpandedSources.add(sourceIndex);
        }
        setExpandedSources(newExpandedSources);
    };

    const renderAnalysisPanel = () => (
        <div className={`analysis-panel ${showAnalysis ? 'visible' : ''}`}>
            {showAnalysis && (
                <>
                    <div className="analysis-header">
                        <h3 className="analysis-title">
                            <Search size={16} />
                            Analysis
                        </h3>
                        <button
                            onClick={toggleAnalysis}
                            className="analysis-close-button"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="analysis-content">
                        {!analysisData ? (
                            <div className="analysis-message">
                                No analysis or sources available for message
                            </div>
                        ) : (
                            <div>
                                {analysisData.sources && analysisData.sources.length > 0 && (
                                    <div className="analysis-section">
                                        <h4 className="analysis-section-title">Sources ({analysisData.sources.length})</h4>
                                        {analysisData.sources.map((source, index) => {
                                            const isExpanded = expandedSources.has(index);
                                            const hasPreview = source.content_preview;
                                            const displayContent = hasPreview ? source.content_preview :
                                                (source.content ? source.content.substring(0, 150) + '...' : 'No content available');

                                            return (
                                                <div key={index} className="source-item">
                                                    <div className="source-header">
                                                        <div className="source-title">
                                                            {source.title || `Source ${index + 1}`}
                                                        </div>
                                                        {source.url && (
                                                            <div className="source-url">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        toggleSourceExpansion(index);
                                                                    }}
                                                                    className="view-source-btn"
                                                                >
                                                                    {isExpanded ? 'Hide Content' : 'View Source'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="source-content">
                                                        {isExpanded ?
                                                            source.content || 'No content available' :
                                                            displayContent
                                                        }
                                                    </div>
                                                </div>
                                            );
                                        })}
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
        <div className="chatbot-messages">
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={`chatbot-message ${message.sender}`}
                >
                    <div className={`chatbot-avatar ${message.sender}`}>
                        {message.sender === 'bot' ? <Bot size={18} /> : <User size={18} />}
                    </div>
                    <div className="chatbot-message-content">
                        <div className={`chatbot-bubble ${message.sender}`}>
                            {message.sender === 'bot' ?
                                renderHTMLContent(message.text) :
                                message.text
                            }
                        </div>
                        <div className={`chatbot-timestamp ${message.sender}`}>
                            {formatTime(message.timestamp)}
                        </div>
                    </div>
                </div>
            ))}

            {isTyping && (
                <div className="chatbot-typing">
                    <div className="chatbot-avatar bot">
                        <Bot size={18} />
                    </div>
                    <div className="chatbot-typing-bubble">
                        <div className="chatbot-typing-dots">
                            <div className="chatbot-typing-dot"></div>
                            <div className="chatbot-typing-dot"></div>
                            <div className="chatbot-typing-dot"></div>
                        </div>
                    </div>
                </div>
            )}

            {messages.length > 1 && (
                <div className="analysis-toggle-container">
                    <button
                        onClick={toggleAnalysis}
                        className="analysis-button"
                    >
                        {showAnalysis ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showAnalysis ? 'Hide Resources' : 'View Resources'}
                    </button>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );

    const renderInputArea = () => (
        <div className="chatbot-input-area">
            <div className="chatbot-input-wrapper">
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="chatbot-textarea"
                    rows="1"
                />
            </div>
            <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className={`chatbot-send-button ${!inputText.trim() ? 'disabled' : ''}`}
            >
                <Send size={16} />
            </button>
        </div>
    );

    return (
        <div className="chatbot-container">
            {isExpanded && (
                <div className="chatbot-background-blur" onClick={() => setIsExpanded(false)} />
            )}

            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="chatbot-floating-button"
                >
                    <MessageCircle size={24} />
                </button>
            )}

            {isOpen && (
                <div className={`chatbot-window ${isExpanded ? 'expanded' : ''} ${showAnalysis ? 'with-analysis' : ''}`}>
                    <div className="chatbot-header">
                        <div className="chatbot-header-left">
                            <div className="chatbot-logo">
                                <Bot size={20} />
                            </div>
                            <div className="chatbot-title-container">
                                <h3 className="chatbot-title">OtoPilot</h3>
                                <p className="chatbot-subtitle">Healthcare Assistant</p>
                            </div>
                        </div>
                        <div className="chatbot-header-controls">
                            <button
                                onClick={toggleExpand}
                                className="chatbot-control-button"
                                title={isExpanded ? "Minimize" : "Expand"}
                            >
                                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                            </button>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    setIsExpanded(false);
                                    setShowAnalysis(false);
                                }}
                                className="chatbot-control-button"
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="chatbot-expanded-layout">
                        <div className="chatbot-chat-content">
                            {renderMessages()}
                            {renderInputArea()}
                        </div>
                        {renderAnalysisPanel()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chatbot;