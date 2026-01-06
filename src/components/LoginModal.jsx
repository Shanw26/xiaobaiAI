import { useState } from 'react';
import './LoginModal.css';

function LoginModal({ onClose, onLoginSuccess }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('phone'); // phone | code

  // 发送验证码
  const handleSendCode = async () => {
    setError('');

    // 验证手机号
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }

    setLoading(true);

    try {
      const result = await window.electronAPI.sendVerificationCode(phone);

      if (result.success) {
        // 开始倒计时
        setStep('code');
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        // 提示用户查看控制台
        setError('验证码已生成，请在应用控制台中查看（开发阶段）');
      } else {
        setError(result.error || '发送失败，请重试');
      }
    } catch (err) {
      setError('发送失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 登录
  const handleLogin = async () => {
    setError('');

    // 验证验证码
    if (code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }

    setLoading(true);

    try {
      const result = await window.electronAPI.loginWithCode(phone, code);

      if (result.success) {
        onLoginSuccess(result.user);
        onClose();
      } else {
        setError(result.error || '登录失败，请重试');
      }
    } catch (err) {
      setError('登录失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content login-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <div className="login-header">
          <h2>📱 手机号登录</h2>
          <p>登录后可配置自己的API Key</p>
        </div>

        <div className="login-form">
          {step === 'phone' && (
            <>
              <div className="form-group">
                <label>手机号</label>
                <input
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={11}
                  disabled={loading}
                />
              </div>

              <button
                className="btn-primary"
                onClick={handleSendCode}
                disabled={loading || !phone}
              >
                {loading ? '发送中...' : '获取验证码'}
              </button>
            </>
          )}

          {step === 'code' && (
            <>
              <div className="form-group">
                <label>验证码</label>
                <div className="code-input-group">
                  <input
                    type="text"
                    placeholder="请输入6位验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    disabled={loading}
                  />
                  <button
                    className="btn-resend"
                    onClick={handleSendCode}
                    disabled={countdown > 0 || loading}
                  >
                    {countdown > 0 ? `${countdown}秒后重试` : '重新发送'}
                  </button>
                </div>
                <p className="hint">💡 开发阶段：验证码会显示在应用控制台中</p>
              </div>

              <button
                className="btn-primary"
                onClick={handleLogin}
                disabled={loading || code.length !== 6}
              >
                {loading ? '登录中...' : '登录'}
              </button>

              <button
                className="btn-secondary"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError('');
                }}
              >
                返回修改手机号
              </button>
            </>
          )}

          {error && <p className="error-message">{error}</p>}
        </div>

        <div className="login-footer">
          <p>登录即表示同意《用户协议》和《隐私政策》</p>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
