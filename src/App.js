import React, { useState, useEffect } from 'react';
import './App.css';
import DashboardView from './components/DashboardView.js';
import LiveMapView from './components/LiveMapView.js';
import LoginModal from './components/LoginModal.js';
import ApiService from './api.js';

function App() {
    const [currentView, setCurrentView] = useState('dashboard');
    const [loggedIn, setLoggedIn] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check authentication status on app load
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const userData = await ApiService.getCurrentUser();
            setUser(userData);
            setLoggedIn(true);
        } catch (error) {
            console.log('User not authenticated:', error.message);
            setLoggedIn(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (userData) => {
        setUser(userData);
        setLoggedIn(true);
        setShowLoginModal(false);
    };

    // --- CORRECTED LOGOUT FUNCTION ---
    const handleLogout = async () => {
        try {
            await ApiService.logout();
            console.log('User logged out successfully');
        } catch (error) {
            console.error('Logout API call failed:', error);
            // Continue with frontend logout even if API fails
        } finally {
            // This block will run regardless of API success or failure
            setLoggedIn(false);
            setUser(null);
            setCurrentView('dashboard'); // Always return to a safe, public view
            
            // Clear all storage to ensure complete logout
            localStorage.clear();
            sessionStorage.clear();
            
            // Force a page reload to clear any cached state
            setTimeout(() => {
                window.location.reload();
            }, 100);
        }
    };

    const handleViewChange = (view) => {
        if (!loggedIn && view !== 'dashboard') {
            setShowLoginModal(true);
            return;
        }
        setCurrentView(view);
    };

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div className="App">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="App">
            {/* Header Navigation */}
            <header className="app-header">
                <div className="header-left">
                    <h1 className="app-title">Floatchat AI</h1>
                    <nav className="nav-menu">
                        <button 
                            className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}  
                            onClick={() => handleViewChange('dashboard')}
                        >
                            Dashboard
                        </button>
                        <button 
                            className={`nav-btn ${currentView === 'map' ? 'active' : ''}`}  
                            onClick={() => handleViewChange('map')}
                            disabled={!loggedIn}
                            title={!loggedIn ? "Please login to access Live Map" : ""}
                        >
                            Live Map
                        </button>
                    </nav>
                </div>
                
                <div className="header-right">
                    {loggedIn ? (
                        <div className="user-section">
                            <span className="user-welcome">
                                Welcome, {user?.email || 'User'}
                            </span>
                            <button 
                                className="logout-btn"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="auth-section">
                            <button 
                                className="login-btn"
                                onClick={() => setShowLoginModal(true)}
                            >
                                Login
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="app-main">
                {!loggedIn ? (
                    <div className="auth-required">
                        <div className="welcome-message">
                            <h2>Welcome to FloatTrack Analytics</h2>
                            <p>Please login to access all features including the interactive Live Map with real-time Argo float data.</p>
                            <button 
                                className="get-started-btn"
                                onClick={() => setShowLoginModal(true)}
                            >
                                Get Started - Login or Sign Up
                            </button>
                        </div>
                        
                        {/* Show dashboard preview for non-logged in users */}
                        {currentView === 'dashboard' && (
                            <div className="demo-dashboard">
                                <div className="demo-overlay">
                                    <p>🔒 Login to access the full dashboard with interactive charts and AI chatbot</p>
                                </div>
                                <DashboardView demoMode={true} />
                            </div>
                        )}
                        
                        {/* Show map preview for non-logged in users */}
                        {currentView === 'map' && (
                            <div className="demo-map">
                                <div className="demo-overlay">
                                    <p>🔒 Please login to access the interactive Live Map with real-time Argo float tracking</p>
                                    <button 
                                        className="login-prompt-btn"
                                        onClick={() => setShowLoginModal(true)}
                                    >
                                        Login to Unlock
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {currentView === 'dashboard' && <DashboardView />}
                        {currentView === 'map' && <LiveMapView />}
                    </>
                )}
            </main>

            {/* Login Modal */}
            <LoginModal 
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                setLoggedIn={handleLogin}
            />

            {/* Footer */}
            <footer className="app-footer">
                <p>&copy; 2024 FloatTrack Analytics. Argo float data visualization and analysis platform.</p>
            </footer>
        </div>
    );
}

export default App;