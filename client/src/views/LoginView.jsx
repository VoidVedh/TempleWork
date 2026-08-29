import React, { useState } from 'react';
import { Phone, Lock, Eye, EyeOff, LogIn, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function LoginView({ onBackToPublic, isModal, onClose }) {
  const { login } = useAuth();
  const { t, lang } = useLanguage();

  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mobile || !password) {
      setError(lang === 'mr' ? 'कृपया मोबाईल नंबर व पासवर्ड टाका.' : 'Please enter mobile number and password.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await login(mobile, password);
      if (onClose) onClose();
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || (lang === 'mr' ? 'लॉगिन करताना त्रुटी आली. कृपया तपशील तपासा.' : 'Login failed. Please check credentials.'));
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div className="login-card">
      {/* Sacred Header Banner */}
      <div className="login-header-banner">
        {onClose && (
          <button className="login-modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
        <div className="login-deities-row">
          <div className="deity-circle-wrap">
            <img src="/assets/ganesha_logo.png" alt="श्री गणेश" className="deity-circle-img" />
            <span className="deity-label">श्री गणेश</span>
          </div>

          <div className="login-header-titles">
            <span className="login-invoc">{t('invocation')}</span>
            <span className="login-fest-sub">{t('mandalSub')}</span>
            <h1 className="login-mandal-title">{t('mandalName')}</h1>
            <span className="login-loc">{t('mandalLocation')}</span>
          </div>

          <div className="deity-circle-wrap">
            <img src="/assets/shivaji_maharaj.png" alt="छ. शिवाजी महाराज" className="deity-circle-img" />
            <span className="deity-label">छ. शिवाजी महाराज</span>
          </div>
        </div>
      </div>

      {/* Login Form Body */}
      <div className="login-form-body">
        <h2 className="login-form-title">{lang === 'mr' ? 'मंडळ व्यवस्थापन व कार्यकर्ता लॉगिन' : 'Temple Committee & Staff Login'}</h2>
        <p className="login-form-sub">{lang === 'mr' ? 'नोंदणीकृत मोबाईल नंबर व पासवर्ड वापरून प्रवेश करा' : 'Enter your authorized mobile number and password'}</p>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: '8px', fontSize: '11.5px', marginBottom: '14px', fontWeight: 800, border: '1px solid #fecdd3' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Mobile Number Input */}
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'नोंदणीकृत मोबाईल नंबर (LOGIN ID)' : 'Registered Mobile Number (LOGIN ID)'}</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <Phone size={16} />
              </span>
              <input
                type="tel"
                maxLength={10}
                className="form-input"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                placeholder="उदा. 8149793310"
                required
                id="input-login-mobile"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'पासवर्ड (PASSWORD)' : 'Password'}</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingRight: '36px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                id="input-login-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex'
                }}
                aria-label="Toggle Password Visibility"
                id="btn-toggle-password"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="login-submit-btn"
            disabled={submitting}
            id="btn-login-submit"
          >
            <LogIn size={18} />
            <span>{submitting ? (lang === 'mr' ? 'प्रवेश करत आहे...' : 'Logging in...') : (lang === 'mr' ? 'लॉगिन करा' : 'Login')}</span>
          </button>
        </form>

        {onBackToPublic && (
          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <button
              type="button"
              className="btn-back-to-devotee-link"
              onClick={onBackToPublic}
            >
              &larr; {lang === 'mr' ? 'भक्त पोर्टलवर परत जा (Public Portal)' : 'Back to Devotee Portal'}
            </button>
          </div>
        )}

        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #ebdcd0', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
            ॥ सार्वजनिक गणेशोत्सव २०२४ — सर्व हक्क सुरक्षित ॥
            <br />
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>पासवर्ड विसरल्यास किंवा नवीन खात्यासाठी मुख्य अध्यक्षांशी संपर्क साधा.</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="login-modal-dialog" onClick={(e) => e.stopPropagation()}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="login-page-wrap">
      {content}
    </div>
  );
}
