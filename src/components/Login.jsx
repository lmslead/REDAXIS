import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaEye, FaEyeSlash } from 'react-icons/fa';
import './Login.css';

import logoMark from '../assets/Logo.png';
import bg1 from '../assets/bg1.jpg';
import bg2 from '../assets/bg2.jpg';
import bg3 from '../assets/bg3.jpg';
import bg4 from '../assets/bg4.jpg';
import bg5 from '../assets/bg5.png';
import bg6 from '../assets/bg6.jpg';

const backgrounds = [bg1, bg2, bg3, bg4, bg5, bg6];

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return localStorage.getItem('rememberMe') === 'true';
  });
  const [backgroundIndex, setBackgroundIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setBackgroundIndex((prev) => (prev + 1) % backgrounds.length);
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authAPI.login({ email, password });
      localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="background-slideshow">
        {backgrounds.map((bg, index) => (
          <div
            key={bg}
            className={`background-slide ${index === backgroundIndex ? 'active' : ''}`}
            style={{ backgroundImage: `url(${bg})` }}
          />
        ))}
      </div>

      <div className="login-overlay" />

      <header className="brand-badge page-brand" aria-label="RG Staff Hub">
        <img src={logoMark} alt="RG Staff Hub" />
        <span>RG Staff Hub</span>
      </header>

      <div className="login-wrapper">
        <section className="welcome-panel">
          <div className="welcome-heading">
            <span className="welcome-title">Welcome</span>
            <span className="welcome-title">Back</span>
          </div>
          <p className="welcome-subheading"></p>

          <p className="welcome-text">
            Empower your workforce with seamless attendance, payroll, and collaboration tools.
          </p>

          <div className="social-links">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
              <FaFacebookF />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter">
              <FaTwitter />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
              <FaInstagram />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <FaLinkedinIn />
            </a>
          </div>
        </section>

        <section className="form-panel">
          <div className="form-header">
            <h2 className="form-title">Sign in</h2>
            <p className="form-subtitle">Secure access for HR teams and employees</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <label htmlFor="email">Email address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="form-actions">
              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <button type="button" className="forgot-link">
                Forgot password?
              </button>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* <div className="demo-note">
            <p><strong>Demo credentials</strong></p>
            <ul>
              <li>Admin: admin@rgstaffhub.com / Admin@123</li>
              <li>HR: maria@rgstaffhub.com / Maria@123</li>
              <li>Employee: john@rgstaffhub.com / John@123</li>
            </ul>
          </div> */}
        </section>
      </div>
    </div>
  );
};

export default Login;
