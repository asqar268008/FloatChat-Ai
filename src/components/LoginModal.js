import React, { useState } from 'react';
import ApiService from '../api';

const LoginModal = ({ isOpen, onClose, setLoggedIn }) => {
    const [authMode, setAuthMode] = useState('login');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
        // Clear error when user starts typing
        if (error) setError('');
    };

    const validateForm = () => {
        if (!formData.email || !formData.password) {
            setError('Email and password are required');
            return false;
        }

        if (authMode === 'signup') {
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match');
                return false;
            }
            if (formData.password.length < 8) {
                setError('Password must be at least 8 characters long');
                return false;
            }
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            if (authMode === 'login') {
                const response = await ApiService.login(formData.email, formData.password);
                console.log('Login successful:', response);
                setLoggedIn(response.user);
                onClose();
            } else {
                const response = await ApiService.register(formData.email, formData.password);
                console.log('Registration successful:', response);
                setLoggedIn(response.user);
                onClose();
            }
        } catch (error) {
            console.error('Auth error:', error);
            if (error.message.includes('already exists')) {
                setError('An account with this email already exists. Please login instead.');
            } else if (error.message.includes('credentials')) {
                setError('Invalid email or password. Please try again.');
            } else if (error.message.includes('non-JSON')) {
                setError('Server error. Please try again later.');
            } else {
                setError(error.message || 'An error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const switchAuthMode = () => {
        setAuthMode(prev => prev === 'login' ? 'signup' : 'login');
        setError('');
        setFormData({
            email: '',
            password: '',
            confirmPassword: ''
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose} disabled={loading}>&times;</button>
                <h2>{authMode === 'login' ? 'Login' : 'Sign Up'}</h2>
                
                {error && (
                    <div className="error-message" style={{
                        color: '#e74c3c',
                        backgroundColor: '#fdf2f2',
                        padding: '10px',
                        borderRadius: '4px',
                        marginBottom: '15px',
                        border: '1px solid #f5c6cb'
                    }}>
                        {error}
                    </div>
                )}
                
                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input 
                            type="email" 
                            id="email" 
                            value={formData.email}
                            onChange={handleInputChange}
                            required 
                            disabled={loading}
                            placeholder="Enter your email"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input 
                            type="password" 
                            id="password" 
                            value={formData.password}
                            onChange={handleInputChange}
                            required 
                            minLength="8"
                            disabled={loading}
                            placeholder="Enter your password"
                        />
                    </div>
                    {authMode === 'signup' && (
                         <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input 
                                type="password" 
                                id="confirmPassword" 
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                required 
                                minLength="8"
                                disabled={loading}
                                placeholder="Confirm your password"
                            />
                        </div>
                    )}
                    <button 
                        type="submit" 
                        className="auth-submit-btn"
                        disabled={loading}
                        style={{
                            opacity: loading ? 0.6 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Processing...' : (authMode === 'login' ? 'Login' : 'Sign Up')}
                    </button>
                </form>
                <div className="switch-auth-mode" style={{ marginTop: '15px', textAlign: 'center' }}>
                    {authMode === 'login' ? (
                        <span>
                            Don't have an account?{' '}
                            <button 
                                type="button"
                                onClick={switchAuthMode} 
                                disabled={loading}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#3498db',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                Sign Up
                            </button>
                        </span>
                    ) : (
                        <span>
                            Already have an account?{' '}
                            <button 
                                type="button"
                                onClick={switchAuthMode} 
                                disabled={loading}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#3498db',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                Login
                            </button>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginModal;