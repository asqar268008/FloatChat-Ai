import React, { useState, useEffect } from 'react';
import { Chart, ChartModal } from './Chart';
import ApiService from '../api';

const DashboardView = ({ demoMode = false }) => {
    const [charts, setCharts] = useState([]);
    const [selectedChart, setSelectedChart] = useState(null);
    const [loading, setLoading] = useState(!demoMode);

    // --- Integrated Chatbot Logic ---
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Initialize chatbot with welcome message
        setMessages([
            { 
                sender: 'bot', 
                text: 'Hello! I can generate charts and analyze ARGO ocean data.' 
            }
        ]);
        
        // Load saved charts if not in demo mode
        if (!demoMode) {
            loadSavedCharts();
        }
    }, [demoMode]);

    const loadSavedCharts = async () => {
        setLoading(true);
        setError('');
        try {
            const dashboardData = await ApiService.getDashboardData();
            const savedCharts = dashboardData.map(item => ({
                id: item.id,
                title: item.chart_data?.title || `Chart ${item.id}`,
                data: item.chart_data,
                query: item.query || ''
            }));
            setCharts(savedCharts);
        } catch (error) {
            console.error('Failed to load saved charts:', error);
            setError('Failed to load saved charts. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    };

    const addChart = async (newChart) => {
        try {
            const chartDataToSave = {
                title: newChart.title,
                type: 'analysis',
                data: newChart.data || {},
                query: newChart.query || '',
                timestamp: new Date().toISOString()
            };
            
            const response = await ApiService.createDashboardData(chartDataToSave);
            
            const savedChart = {
                id: response.id,
                title: newChart.title,
                data: chartDataToSave,
                query: newChart.query || ''
            };
            
            setCharts(prev => [...prev, savedChart]);
            setError(''); // Clear any previous errors on success
        } catch (error) {
            console.error('Failed to save new chart:', error);
            setError('Failed to save chart. Please try again.');
        }
    };

    // Main function to handle agent requests
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || chatLoading) return;

        const userMessage = { sender: 'user', text: inputValue };
        setMessages(prev => [...prev, userMessage]);
        const query = inputValue;
        setInputValue('');
        setChatLoading(true);
        
        try {
            console.log('Sending query to agent:', query);
            
            // Call the agent function directly for visualization
            const response = await ApiService.generateVisualization(query);
            console.log('Agent response:', response);
            
            if (response.chart_data) {
                // Success - chart was generated
                const botMessage = { 
                    sender: 'bot', 
                    text: `✅ I've generated a chart for: "${query}"`
                };
                setMessages(prev => [...prev, botMessage]);

                // Create and add the chart to dashboard
                const newChart = {
                    id: response.data?.id || Date.now(),
                    title: response.data?.filename || `Analysis: ${query.substring(0, 50)}...`,
                    data: response.chart_data,
                    query: query,
                    timestamp: new Date().toISOString()
                };
                
                console.log('Creating new chart:', newChart);
                addChart(newChart);
                
            } else if (response.agent_response) {
                // Agent responded but no chart data
                const botMessage = { 
                    sender: 'bot', 
                    text: response.message || 'I processed your request. ' + response.agent_response
                };
                setMessages(prev => [...prev, botMessage]);
            } else {
                // Fallback to AI chat
                const chatResponse = await ApiService.aiChat(query);
                const botMessage = { 
                    sender: 'bot', 
                    text: chatResponse.response || 'I processed your request but could not generate a chart.'
                };
                setMessages(prev => [...prev, botMessage]);
            }

        } catch (error) {
            console.error('Failed to process request:', error);
            const errorMessage = { 
                sender: 'bot', 
                text: `❌ Sorry, I encountered an error: ${error.message}. Please try again.` 
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleChartDoubleClick = (chartData) => setSelectedChart(chartData);
    const handleCloseModal = () => setSelectedChart(null);
    const handleRetry = () => loadSavedCharts();

    if (loading && !demoMode) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <>
            <ChartModal chart={selectedChart} onClose={handleCloseModal} />
            <div className="dashboard-view">
                <div className="dashboard-chatbot">
                    {/* --- Integrated Chatbot JSX --- */}
                    <div className="chatbot-container">
                        <div className="chatbot-header">
                            <h3>Data Analysis & Visualization</h3>
                            
                        </div>
                        
                        {error && (
                            <div className="error-banner">
                                <span>{error}</span>
                                <button onClick={handleRetry} className="retry-button">Retry</button>
                            </div>
                        )}
                        
                        <div className="messages-list">
                            {messages.map((msg, index) => (
                                <div key={index} className={`message ${msg.sender}`}>
                                    <div className="message-content">
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="message bot loading">
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                    Processing your request...
                                </div>
                            )}
                        </div>
                        
                        <form className="message-form" onSubmit={handleSendMessage}>
                            <div className="input-group">
                                <input 
                                    type="text" 
                                    placeholder="Ask me to analyze" 
                                    value={inputValue} 
                                    onChange={(e) => setInputValue(e.target.value)}
                                    disabled={chatLoading}
                                    className="chat-input"
                                />
                                <button 
                                    type="submit" 
                                    disabled={chatLoading || !inputValue.trim()}
                                    className="send-button"
                                >
                                    {chatLoading ? '...' : 'Generate'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <div className="charts-area">
                    {charts.map(chart => (
                        <Chart 
                            key={chart.id} 
                            id={chart.id} 
                            title={chart.title} 
                            data={chart.data}
                            query={chart.query}
                            onDoubleClick={handleChartDoubleClick} 
                        />
                    ))}
                    {charts.length === 0 && !error && (
                        <div className="chart-placeholder" style={{gridColumn: "1 / -1", height: "100%"}}>
                            <div className="placeholder-content">
                                <h3>Welcome to Your Dashboard</h3>
                                <p>Your generated charts will appear here. Ask the chatbot to create an analysis!</p>
                                <div className="suggestions">
                                    <p><strong>Try asking:</strong></p>
                                    <ul>
                                        <li>"Show me temperature data as a line chart at atlantic ocean in 2005"</li>
                                        <li>"Create a graph for distribution of humidity values at pacific ocean in 2006"</li>
                                        <li>"Plot wind speed over time at indian ocean in 2007"</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default DashboardView;