import './Welcome.css';

function Welcome({ currentUser, guestStatus, onLoginClick }) {
  return (
    <div className="welcome">
      <div className="welcome-icon">
        <svg viewBox="0 0 1024 1024" fill="none">
          <defs>
            <linearGradient id="welcomeLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: '#22c55e', stopOpacity: 1}}/>
              <stop offset="100%" style={{stopColor: '#16a34a', stopOpacity: 1}}/>
            </linearGradient>
            <filter id="welcomeLogoShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="20"/>
              <feOffset dx="0" dy="12" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.4"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="0" y="0" width="1024" height="1024" rx="256" fill="url(#welcomeLogoGradient)" filter="url(#welcomeLogoShadow)"/>
          <rect x="248" y="248" width="528" height="528" rx="132" fill="#ffffff"/>
          <circle cx="420" cy="512" r="64" fill="#22c55e" className="eye left-eye"/>
          <circle cx="604" cy="512" r="64" fill="#22c55e" className="eye right-eye"/>
          <ellipse cx="440" cy="492" rx="24" ry="24" fill="#86efac" opacity="0.6" className="eye-highlight left-highlight"/>
          <ellipse cx="624" cy="492" rx="24" ry="24" fill="#86efac" opacity="0.6" className="eye-highlight right-highlight"/>
        </svg>
      </div>
      <h1>欢迎使用小白AI</h1>

      {currentUser && (
        <p className="user-welcome">👋 欢迎回来，{currentUser.phone}</p>
      )}

      <p className="welcome-description">
        一款系统级别的AI助手，可以帮你操作电脑，比如删除或创建文档，
        创建日程或清空回收站，更多功能，等你探索
      </p>
    </div>
  );
}

export default Welcome;
