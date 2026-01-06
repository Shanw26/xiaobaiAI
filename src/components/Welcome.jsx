import './Welcome.css';

function Welcome() {
  return (
    <div className="welcome">
      <div className="welcome-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>
      <h1>欢迎使用小白AI</h1>
      <p>
        上传文件或图片，通过自然语言操作本地文件
        <br />
        分析数据、编写代码、生成报告
      </p>
    </div>
  );
}

export default Welcome;
