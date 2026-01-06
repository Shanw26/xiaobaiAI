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
