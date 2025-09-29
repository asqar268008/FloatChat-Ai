import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import Chatbot from './Chatbot';
import { argoFloatData } from '../data/argoFloatData';
import ApiService from '../api';

const LiveMapView = () => {
    const [sidebarWidth, setSidebarWidth] = useState(350);
    const [userLocation, setUserLocation] = useState(null);
    const [argoData, setArgoData] = useState([]);
    const mapRef = useRef(null);
    const isResizing = useRef(false);

    // Load user location and Argo data
    useEffect(() => {
        loadUserLocation();
        loadArgoData();
    }, []);

    const loadUserLocation = async () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ latitude, longitude });
                    
                    try {
                        await ApiService.saveLocation(latitude, longitude);
                    } catch (error) {
                        console.error('Failed to save location:', error);
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error);
                }
            );
        }
    };

    const loadArgoData = async () => {
        try {
            // Try to get Argo data from backend
            const backendData = await ApiService.getArgoFloats();
            setArgoData(backendData);
        } catch (error) {
            console.error('Failed to load Argo data from backend, using local data:', error);
            // Fallback to local data
            setArgoData(argoFloatData);
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

    // Create custom icon for user location
    const userIcon = L.divIcon({
        className: 'user-location-icon',
        html: `<div style="background-color: #007bff; color: white; padding: 8px; border-radius: 50%; font-size: 10px; font-weight: bold; text-align: center; box-shadow: 2px 2px 5px rgba(0,0,0,0.5); border: 2px solid #fff;">YOU</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    return (
        <div className="main-content">
            <aside className="chatbot-sidebar" style={{ width: `${sidebarWidth}px` }}>
                <Chatbot isDashboard={false} />
            </aside>
            <div className="resizer" onMouseDown={handleMouseDown} />
            <main className="map-container">
                <MapContainer 
                    center={[10, 80]} 
                    zoom={5} 
                    ref={mapRef}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer 
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                        attribution='Tiles &copy; Esri' 
                    />
                    
                    {/* User location marker */}
                    {userLocation && (
                        <Marker 
                            position={[userLocation.latitude, userLocation.longitude]} 
                            icon={userIcon}
                        >
                            <Popup>
                                <b>Your Current Location</b><br />
                                Lat: {userLocation.latitude.toFixed(4)}, Lon: {userLocation.longitude.toFixed(4)}
                            </Popup>
                        </Marker>
                    )}
                    
                    {/* Argo float markers */}
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
                                {trackPositions.length > 1 && (
                                    <Polyline 
                                        pathOptions={{ color: '#ffc107', weight: 2 }} 
                                        positions={trackPositions} 
                                    />
                                )}
                                <Marker 
                                    position={[latestPosition.lat, latestPosition.lon]} 
                                    icon={customIcon}
                                >
                                    <Popup>
                                        <b>Float: {float.name} (ID: {float.id})</b><br />
                                        Lat: {latestPosition.lat.toFixed(4)}, Lon: {latestPosition.lon.toFixed(4)}<br />
                                        Last Update: {new Date(latestPosition.timestamp).toLocaleDateString()}
                                    </Popup>
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