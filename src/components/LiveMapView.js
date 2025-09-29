import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { argoFloatData as localArgoData } from '../data/argoFloatData';
import ApiService from '../api';

const LiveMapView = () => {
    const [sidebarWidth, setSidebarWidth] = useState(350);
    const [argoData, setArgoData] = useState([]);
    const mapRef = useRef(null);
    const isResizing = useRef(false);

    // --- Chatbot Logic is Now Directly Inside This Component ---
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    useEffect(() => {
        // Load initial data for the map and chat
        loadArgoData();
        loadChatHistory();
    }, []);

    const loadArgoData = async () => {
        try {
            const backendData = await ApiService.getArgoFloats();
            setArgoData(backendData);
        } catch (error) {
            console.error('Failed to load Argo data, using local fallback:', error);
            setArgoData(localArgoData);
        }
    };

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
            setMessages([{ sender: 'bot', text: 'Hello! Ask me about the Argo floats on the map.' }]);
        }
    };

    // --- Chatbot's handleSendMessage function ---
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || chatLoading) return;

        const userMessage = { sender: 'user', text: inputValue };
        setMessages(prev => [...prev, userMessage]);
        const query = inputValue;
        setInputValue('');
        setChatLoading(true);
        
        try {
            // isDashboard is explicitly false for this component
            const response = await ApiService.sendChatMessage(query, false); 
            const botMessage = { sender: 'bot', text: response.response };
            setMessages(prev => [...prev, botMessage]);
            // Future logic for map interactions (like zooming to a float) could go here
        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage = { sender: 'bot', text: `Sorry, I encountered an error: ${error.message}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleMouseMove = useCallback((e) => {
        if (!isResizing.current) return;
        const newWidth = e.clientX;
        if (newWidth > 300 && newWidth < window.innerWidth - 300) {
            setSidebarWidth(newWidth);
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        isResizing.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        if (mapRef.current) {
            mapRef.current.invalidateSize();
        }
    }, [handleMouseMove]);

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        isResizing.current = true;
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove, handleMouseUp]);

    return (
        <div className="main-content">
            <aside className="chatbot-sidebar" style={{ width: `${sidebarWidth}px` }}>
                {/* --- Chatbot JSX is Now Part of This File --- */}
                <div className="chatbot-header">FloatChat AI</div>
                <div className="messages-list">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.sender}`}>{msg.text}</div>
                    ))}
                    {chatLoading && <div className="message bot">Thinking...</div>}
                </div>
                <form className="message-form" onSubmit={handleSendMessage}>
                    <input 
                        type="text" 
                        placeholder="Ask about a float or location..." 
                        value={inputValue} 
                        onChange={(e) => setInputValue(e.target.value)}
                        disabled={chatLoading}
                    />
                    <button type="submit" disabled={chatLoading || !inputValue.trim()}>
                        Send
                    </button>
                </form>
            </aside>
            <div className="resizer" onMouseDown={handleMouseDown} />
            <main className="map-container">
                <MapContainer center={[10, 80]} zoom={5} ref={mapRef}>
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='&copy; Esri' />
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" zIndex={10} />
                    {argoData.map((float) => {
                        const latestPosition = float.positions[float.positions.length - 1];
                        const trackPositions = float.positions.map(p => [p.lat, p.lon]);
                        const customIcon = L.divIcon({
                            className: 'custom-div-icon',
                            html: `<div style="background-color: #d9534f; color: white; padding: 5px 8px; border-radius: 50%; font-size: 12px; font-weight: bold; text-align: center; box-shadow: 2px 2px 5px rgba(0,0,0,0.5); border: 1px solid #fff;">${float.name}</div>`,
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        });
                        return (
                            <React.Fragment key={float.id}>
                                {trackPositions.length > 1 && <Polyline pathOptions={{ color: '#ffc107', weight: 2 }} positions={trackPositions} />}
                                <Marker position={[latestPosition.lat, latestPosition.lon]} icon={customIcon}>
                                    <Popup><b>Float: {float.name} (ID: {float.id})</b><br />Lat: {latestPosition.lat.toFixed(4)}, Lon: {latestPosition.lon.toFixed(4)}</Popup>
                                </Marker>
                            </React.Fragment>
                        );
                    })}
                </MapContainer>
            </main>
        </div>
    );
};

export default LiveMapView;

