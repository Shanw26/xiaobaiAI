import { useState } from 'react';
import './WelcomeModal.css';

function WelcomeModal({ onComplete }) {
  const [formData, setFormData] = useState({
    name: '',
    occupation: '',
    location: '',
    bio: '',
    preferences: '',
  });

  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '欢迎 👋',
      icon: '🎉',
      description: '欢迎使用小白AI！让我了解一下你的基本信息，以便更好地为你服务。',
    },
    {
      title: '基本信息',
      icon: '👤',
      description: '请告诉我你的姓名、职业和所在地',
    },
    {
      title: '更多关于你',
      icon: '💬',
      description: '还有什么想让我知道的吗？（可选）',
    },
    {
      title: '完成 🎉',
      icon: '✨',
      description: '准备就绪！让我们一起开始吧。',
    },
  ];

  const handleNext = () => {
    if (currentStep === 1 && !formData.name) {
      alert('请至少填写你的姓名');
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      const result = await window.electronAPI.saveUserInfo(formData);
      if (result.success) {
        onComplete();
      } else {
        alert('保存失败: ' + result.error);
      }
    } catch (error) {
      alert('保存失败: ' + error.message);
    }
  };

  const handleSkip = () => {
    if (confirm('跳过引导？你可以随时在设置中补充信息。')) {
      onComplete();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="welcome-content animate-in">
            <div className="welcome-icon">{steps[0].icon}</div>
            <h2 className="welcome-title">{steps[0].title}</h2>
            <p className="welcome-description">{steps[0].description}</p>
            <div className="welcome-features">
              <div className="feature-item">
                <span className="feature-icon">💬</span>
                <span className="feature-text">智能对话</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📝</span>
                <span className="feature-text">文件操作</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🧠</span>
                <span className="feature-text">记忆能力</span>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="welcome-content animate-in">
            <h2 className="welcome-title">{steps[1].title}</h2>
            <p className="welcome-description">{steps[1].description}</p>
            <div className="form-group">
              <label className="form-label">
                姓名 <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="你的名字"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">职业</label>
              <input
                type="text"
                className="form-input"
                placeholder="例如：产品经理、工程师、学生"
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">所在地</label>
              <input
                type="text"
                className="form-input"
                placeholder="例如：北京、上海、深圳"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="welcome-content animate-in">
            <h2 className="welcome-title">{steps[2].title}</h2>
            <p className="welcome-description">{steps[2].description}</p>
            <div className="form-group">
              <label className="form-label">个人简介</label>
              <textarea
                className="form-textarea"
                placeholder="简单介绍一下你自己，你的工作、兴趣爱好等..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows="4"
              />
            </div>
            <div className="form-group">
              <label className="form-label">其他偏好</label>
              <textarea
                className="form-textarea"
                placeholder="例如：喜欢简洁的回复、关注产品细节、擅长数据分析..."
                value={formData.preferences}
                onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
                rows="3"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="welcome-content animate-in">
            <div className="welcome-icon">{steps[3].icon}</div>
            <h2 className="welcome-title">{steps[3].title}</h2>
            <p className="welcome-description">{steps[3].description}</p>
            {formData.name && (
              <div className="welcome-summary">
                <p>
                  <strong>你好，{formData.name}！</strong>
                </p>
                {formData.occupation && <p>职业：{formData.occupation}</p>}
                {formData.location && <p>所在地：{formData.location}</p>}
              </div>
            )}
            <p className="welcome-tip">
              💡 你可以随时在「设置」中修改个人信息
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal welcome-modal">
        <div className="welcome-header">
          <div className="welcome-progress">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`progress-dot ${index <= currentStep ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="modal-body">
          {renderStep()}
        </div>

        <div className="modal-actions">
          {currentStep > 0 && (
            <button className="btn-modal secondary" onClick={handleBack}>
              返回
            </button>
          )}
          <button className="btn-modal secondary" onClick={handleSkip}>
            跳过
          </button>
          <button className="btn-modal primary" onClick={handleNext}>
            {currentStep === steps.length - 1 ? '开始使用' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WelcomeModal;
