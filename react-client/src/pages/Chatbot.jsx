import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Maximize2, Minimize2, Eye, EyeOff, Search } from 'lucide-react';
import "../styles/chatbot.css";

// Fixed markdown parser for analysis panel content
const parseMarkdown = (text) => {
    if (!text) return '';

    // Split into lines for better processing
    const lines = text.split('\n');
    const processedLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines initially
        if (!line) {
            processedLines.push('');
            continue;
        }

        // Process headers
        if (line.startsWith('####')) {
            processedLines.push(`<h4>${line.replace(/^####\s*/, '')}</h4>`);
        } else if (line.startsWith('###')) {
            processedLines.push(`<h4>${line.replace(/^###\s*/, '')}</h4>`);
        } else if (line.startsWith('##')) {
            processedLines.push(`<h4>${line.replace(/^##\s*/, '')}</h4>`);
        } else if (line.startsWith('#')) {
            processedLines.push(`<h4>${line.replace(/^#\s*/, '')}</h4>`);
        } else {
            // Process inline formatting
            let processedLine = line;

            // Bold text
            processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            processedLine = processedLine.replace(/__(.*?)__/g, '<strong>$1</strong>');

            // Italic text (avoid conflicts with bold)
            processedLine = processedLine.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
            processedLine = processedLine.replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>');

            // Inline code
            processedLine = processedLine.replace(/`([^`]+?)`/g, '<code>$1</code>');

            processedLines.push(processedLine);
        }
    }

    // Join lines and handle paragraphs
    const htmlContent = processedLines.join('\n');

    // Handle code blocks
    const withCodeBlocks = htmlContent.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Convert double line breaks to paragraph breaks and wrap non-header content
    const paragraphs = withCodeBlocks.split('\n\n');
    const finalContent = paragraphs.map(para => {
        para = para.trim();
        if (!para) return '';

        // Don't wrap headers, pre blocks, or already wrapped content
        if (para.match(/^<(h[1-6]|pre|div|p)/)) {
            return para;
        }

        // Convert single line breaks to <br> and wrap in paragraph
        const withBreaks = para.replace(/\n/g, '<br>');
        return `<p>${withBreaks}</p>`;
    }).join('');

    return finalContent;
};

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
    const [hoveredRef, setHoveredRef] = useState(null);
    const [refPosition, setRefPosition] = useState({ x: 0, y: 0 });
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Process references from bot response text
    const processReferences = (text) => {
        if (!text) return { processedText: '', references: {} };

        const references = {};
        let orderCounter = 0;

        const processedText = text.replace(
            /<ref\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/ref>/gi,
            (match, refNumber, refContent) => {
                orderCounter++;

                // Clean reference content
                let cleanContent = refContent.trim()
                    .replace(/^From Source \d+--\s*/i, '')
                    .replace(/^Source \d+:\s*/i, '');

                references[orderCounter] = cleanContent;

                // Extract display number
                const numberMatch = refNumber.match(/\d+/);
                const displayNumber = numberMatch ? numberMatch[0] : refNumber;

                return `<span class="reference-link" data-ref="${orderCounter}" data-display="${displayNumber}">[${displayNumber}]</span>`;
            }
        );

        return { processedText, references };
    };

    // Clean response text and process references
    const cleanResponseText = (text) => {
        if (!text) return { cleanedText: '', references: {} };

        const { processedText, references } = processReferences(text);

        let cleanedText = processedText
            .replace(/<\|[^|]*\|>/gi, '') // Remove <|tags|>
            .replace(/###\s*([^#]+?)\s*###/g, '<b>$1</b>') // Convert ### to bold
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Convert ** to bold
            .replace(/\[ref[^\]]*\]/gi, '') // Remove [ref] tags
            .replace(/\{[^}]*\}/g, '') // Remove {tags}
            .replace(/[ \t]+/g, ' ') // Clean whitespace
            .trim();

        return { cleanedText, references };
    };

    // Handle reference tooltip display
    const handleRefHover = (event, orderNumber, references) => {
        if (!references || !references[orderNumber]) return;

        const rect = event.target.getBoundingClientRect();
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        const displayName = event.target.getAttribute('data-display') || orderNumber;

        setRefPosition({
            x: rect.left + scrollLeft + rect.width / 2,
            y: rect.top + scrollTop - 15
        });

        setHoveredRef({
            number: `Source ${displayName}`,
            content: references[orderNumber]
        });
    };

    const handleRefLeave = () => {
        setHoveredRef(null);
    };

    // Component to render message content with reference handling
    const MessageContent = ({ htmlString, references, isBot }) => {
        const contentRef = useRef(null);

        useEffect(() => {
            if (!isBot || !contentRef.current) return;

            const refLinks = contentRef.current.querySelectorAll('.reference-link');

            const cleanup = [];

            refLinks.forEach(link => {
                const refNumber = link.getAttribute('data-ref');

                const handleMouseEnter = (e) => handleRefHover(e, refNumber, references);
                const handleMouseLeave = () => handleRefLeave();

                link.addEventListener('mouseenter', handleMouseEnter);
                link.addEventListener('mouseleave', handleMouseLeave);

                cleanup.push(() => {
                    link.removeEventListener('mouseenter', handleMouseEnter);
                    link.removeEventListener('mouseleave', handleMouseLeave);
                });
            });

            return () => cleanup.forEach(fn => fn());
        }, [htmlString, references, isBot]);

        if (isBot) {
            return (
                <div
                    ref={contentRef}
                    dangerouslySetInnerHTML={{ __html: htmlString }}
                    className="message-content-with-references"
                />
            );
        }

        return <span>{htmlString}</span>;
    };

    // Send message handler
    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        const newMessage = {
            id: messages.length + 1,
            text: inputText,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newMessage]);
        const currentQuery = inputText;
        setInputText('');
        setIsTyping(true);

        setTimeout(async () => {
            const response = await getBotResponse(currentQuery);
            const botResponse = {
                id: messages.length + 2,
                text: response.cleanedText || "Thank you for your message. I'm here to help with any questions about your healthcare journey.",
                sender: 'bot',
                timestamp: new Date(),
                references: response.references || {}
            };
            setMessages(prev => [...prev, botResponse]);
            setIsTyping(false);
        }, 1500);
    };

    // Get bot response from API
    const getBotResponse = async (userMessage) => {
        try {
            const res = await fetch("https://myapi.57.128.85.149.nip.io:5443/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: "test_user",
                    query: userMessage.toLowerCase()
                }),
            });

            const data = await res.json();

            if (data.sources) {
                setAnalysisData({
                    sources: data.sources || [],
                    messageId: data.messageId || `msg_${Date.now()}`,
                    query: userMessage,
                    timestamp: new Date()
                });
            }

            const rawText = data.generated_text || data.message || "I'm here to help you with your healthcare questions.";
            return cleanResponseText(rawText);
        } catch (error) {
            console.error("Error:", error);
            return cleanResponseText("I'm here to help you with your healthcare questions. Please try again.");
        }
    };

    // Handle Enter key press
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Format timestamp
    const formatTime = (timestamp) => {
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Toggle functions
    const toggleExpand = () => setIsExpanded(!isExpanded);
    const toggleAnalysis = () => setShowAnalysis(!showAnalysis);

    const toggleSourceExpansion = (sourceIndex) => {
        const newExpanded = new Set(expandedSources);
        if (newExpanded.has(sourceIndex)) {
            newExpanded.delete(sourceIndex);
        } else {
            newExpanded.add(sourceIndex);
        }
        setExpandedSources(newExpanded);
    };

    // Render analysis panel
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
                                        <h4 className="analysis-section-title">
                                            Sources ({analysisData.sources.length})
                                        </h4>
                                        {analysisData.sources.map((source, index) => {
                                            const isExpanded = expandedSources.has(index);
                                            const content = source.content || source.content_preview || 'No content available';
                                            const displayContent = isExpanded ? content :
                                                (content.length > 150 ? content.substring(0, 150) + '...' : content);

                                            return (
                                                <div key={index} className="source-item">
                                                    <div className="source-header">
                                                        <div className="source-title">
                                                            Source {index + 1}
                                                        </div>
                                                        <button
                                                            onClick={() => toggleSourceExpansion(index)}
                                                            className="view-source-btn"
                                                        >
                                                            {isExpanded ? 'Hide Content' : 'View Source'}
                                                        </button>
                                                    </div>
                                                    <div className="source-filename">
                                                        {source.url}
                                                    </div>
                                                    <div className="source-content">
                                                        <div
                                                            dangerouslySetInnerHTML={{
                                                                __html: parseMarkdown(displayContent)
                                                            }}
                                                            className="source-markdown-content"
                                                        />
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

    // Render messages
    const renderMessages = () => (
        <div className="chatbot-messages">
            {messages.map((message) => (
                <div 
                key={message.id} className={`chatbot-message ${message.sender}`}>
                    <div className={`chatbot-avatar ${message.sender}`}>
                        {message.sender === 'bot' ? <Bot size={18} /> : <User size={18} />}
                    </div>
                    <div className="chatbot-message-content">
                        <div className={`chatbot-bubble ${message.sender}`}>
                            <MessageContent
                                htmlString={message.text}
                                references={message.references || {}}
                                isBot={message.sender === 'bot'}
                            />
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
                    <button onClick={toggleAnalysis} className="analysis-button">
                        {showAnalysis ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showAnalysis ? 'Hide Resources' : 'View Resources'}
                    </button>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );

    // Render input area
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

    // Reference tooltip
    const ReferenceTooltip = () => {
        if (!hoveredRef) return null;

        return (
            <div
                className="reference-tooltip visible"
                style={{
                    position: 'fixed',
                    left: refPosition.x,
                    top: refPosition.y,
                    transform: 'translateX(-50%) translateY(-100%)',
                    zIndex: 10001,
                }}
            >
                <div className="reference-tooltip-content">
                    <div className="reference-tooltip-number">{hoveredRef.number}</div>
                    <div className="reference-tooltip-text">{hoveredRef.content}</div>
                </div>
            </div>
        );
    };

    return (
        <div className="chatbot-container">
            {isExpanded && (
                <div className="chatbot-background-blur" onClick={() => setIsExpanded(false)} />
            )}

            {!isOpen && (
                <button onClick={() => setIsOpen(true)} className="chatbot-floating-button">
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

            <ReferenceTooltip />
        </div>
    );
};

export default Chatbot;