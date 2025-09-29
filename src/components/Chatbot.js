import React, { useState, useEffect } from 'react';
import ApiService from '../api';

const Chatbot = ({ onNewChartRequest, isDashboard }) => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);

    // Load chat history on component mount
    useEffect(() => {
        loadChatHistory();
    }, []);

    const loadChatHistory = async () => {
        try {
            const chatMessages = await ApiService.getChatMessages();
            const formattedMessages = chatMessages.map(msg => ({
                sender: msg.user ? 'user' : 'bot',
                text: msg.user ? msg.message : msg.response
            }));
            setMessages(formattedMessages);
        } catch (error) {
            console.error('Failed to load chat history:', error);
            // Set initial message if no history
            setMessages([
                { 
                    sender: 'bot', 
                    text: isDashboard 
                        ? 'Hello! Ask me to generate a chart or analyze data.' 
                        : 'Hello! Ask me about the Argo floats on the map.' 
                }
            ]);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || loading) return;

        const userMessage = { sender: 'user', text: inputValue };
        setMessages(prev => [...prev, userMessage]);
        setLoading(true);
        
        try {
            const response = await ApiService.sendChatMessage(inputValue, isDashboard);
            
            const botMessage = { 
                sender: 'bot', 
                text: response.response 
            };
            setMessages(prev => [...prev, botMessage]);

            // If in dashboard mode and the response indicates chart creation
            if (isDashboard && response.chart_data) {
                onNewChartRequest({
                    id: Date.now(),
                    title: `Analysis for "${inputValue}"`,
                    data: response.chart_data
                });
            }

        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage = { 
                sender: 'bot', 
                text: `Sorry, I encountered an error: ${error.message}` 
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
        
        setInputValue('');
    };

    return (
        <>
            <div className="chatbot-header">FloatChat AI</div>
            <div className="messages-list">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        {msg.text}
                    </div>
                ))}
                {loading && (
                    <div className="message bot">
                        Thinking...
                    </div>
                )}
            </div>
            <form className="message-form" onSubmit={handleSendMessage}>
                <input 
                    type="text" 
                    placeholder={isDashboard ? "Request a chart or ask about data..." : "Ask about a float or location..."} 
                    value={inputValue} 
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={loading}
                />
                <button type="submit" disabled={loading || !inputValue.trim()}>
                    {isDashboard ? "Generate" : "Send"}
                </button>
            </form>
        </>
    );
};

export default Chatbot;