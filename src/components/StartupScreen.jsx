import './StartupScreen.css';

function StartupScreen() {
  return (
    <div className="startup-screen">
      <div className="startup-animation">
        <div className="startup-logo">
          <svg viewBox="0 0 1024 1024" fill="none">
            <defs>
              <linearGradient id="startupLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: '#22c55e', stopOpacity: 1}}/>
                <stop offset="100%" style={{stopColor: '#16a34a', stopOpacity: 1}}/>
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="1024" height="1024" rx="256" fill="url(#startupLogoGradient)"/>
            <rect x="248" y="248" width="528" height="528" rx="132" fill="#ffffff"/>
            <circle cx="420" cy="512" r="64" fill="#22c55e" className="eye left-eye"/>
            <circle cx="604" cy="512" r="64" fill="#22c55e" className="eye right-eye"/>
            <ellipse cx="440" cy="492" rx="24" ry="24" fill="#86efac" opacity="0.6" className="eye-highlight left-highlight"/>
            <ellipse cx="624" cy="492" rx="24" ry="24" fill="#86efac" opacity="0.6" className="eye-highlight right-highlight"/>
          </svg>
        </div>
        <div className="startup-text">
          <h1 className="startup-title">小白AI</h1>
          <p className="startup-subtitle">系统级 AI 助手</p>
        </div>
        <div className="loading-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    </div>
  );
}

export default StartupScreen;
