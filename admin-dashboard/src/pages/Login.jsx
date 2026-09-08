import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck, Shield, Star, CheckCircle } from 'lucide-react';
import logo from '../assets/logo.png';
import './Login.css';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const VITE_API_URL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${VITE_API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('adminToken', data.token);
                navigate('/');
            } else {
                setError(data.error || 'Invalid credentials');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Failed to connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-background">
                {/* Background effects matching the poster's sky and glow */}
                <div className="sky-glow"></div>
                <div className="bottom-glow"></div>
                <div className="stars"></div>
            </div>
            
            <div className="login-content">
                <div className="logo-container">
                    <img src={logo} alt="Need2Done Logo" className="logo" />
                    <p className="tagline">ANYTHING, ANYTIME, ANYWHERE</p>
                </div>

                <div className="hero-text">
                    <h1>SECURE DASHBOARD</h1>
                    <h2 className="highlight-text">ADMIN ACCESS</h2>
                </div>

                <div className="login-card">
                    <div className="card-header">
                        <span>ADMINISTRATOR LOGIN</span>
                    </div>
                    
                    {error && <div className="error-message">{error}</div>}
                    
                    <form onSubmit={handleLogin} className="login-form">
                        <div className="input-group">
                            <div className="input-icon-wrapper">
                                <User size={18} className="input-icon" />
                            </div>
                            <div className="input-field">
                                <label htmlFor="username">Username</label>
                                <input 
                                    type="text" 
                                    id="username" 
                                    placeholder="Enter your username" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="input-group">
                            <div className="input-icon-wrapper orange-icon">
                                <Lock size={18} className="input-icon" />
                            </div>
                            <div className="input-field">
                                <label htmlFor="password">Password</label>
                                <input 
                                    type="password" 
                                    id="password" 
                                    placeholder="Enter your password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        
                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'AUTHENTICATING...' : 'SIGN IN NOW'}
                        </button>
                    </form>
                </div>

                <div className="trust-badges">
                    <div className="badge">
                        <ShieldCheck size={16} className="badge-icon" />
                        <span>SECURE<br/>ACCESS</span>
                    </div>
                    <div className="badge">
                        <Shield size={16} className="badge-icon orange-badge" />
                        <span>ENCRYPTED<br/>DATA</span>
                    </div>
                    <div className="badge">
                        <Star size={16} className="badge-icon" />
                        <span>VERIFIED<br/>ADMIN</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
