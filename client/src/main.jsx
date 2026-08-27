import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RootErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#4a0404',
          color: '#ffffff',
          fontFamily: "'Noto Sans Devanagari', sans-serif",
          padding: '20px',
          textAlign: 'center'
        }}>
          <img src="/assets/ganesha_logo.png" alt="Ganesha" style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '16px', border: '2px solid #ffd700' }} />
          <h2 style={{ color: '#ffd700', margin: '0 0 8px 0', fontSize: '20px' }}>श्री सिद्धिविनायक मंदिर</h2>
          <p style={{ color: '#fef08a', fontSize: '14px', maxWidth: '400px', lineHeight: 1.5, margin: '0 0 16px 0' }}>
            अ‍ॅप लोड करताना त्रुटी आली. कृपया पान रीलोड करा.
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = '/';
            }}
            style={{
              backgroundColor: '#ffd700',
              color: '#4a0404',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            रीलोड करा (Reload)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function initApp() {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    setTimeout(initApp, 20);
    return;
  }
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
