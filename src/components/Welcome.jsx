import './Welcome.css';

function Welcome({ currentUser, guestStatus, onLoginClick }) {
  return (
    <div className="welcome">
      <div className="welcome-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>
      <h1>欢迎使用小白AI</h1>

      {!currentUser && guestStatus && (
        <div className="guest-info">
          <p className="guest-message">
            👋 游客模式可免费使用 <strong>{guestStatus.remaining}</strong> 次
          </p>
          <button className="btn-login" onClick={onLoginClick}>
            登录获取更多次数
          </button>
        </div>
      )}

      {currentUser && (
        <p className="user-welcome">👋 欢迎回来，{currentUser.phone}</p>
      )}

      <p className="welcome-description">
        上传文件或图片，通过自然语言操作本地文件
        <br />
        分析数据、编写代码、生成报告
      </p>
    </div>
  );
}

export default Welcome;
