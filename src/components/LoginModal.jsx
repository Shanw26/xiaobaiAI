import { useState } from 'react';
import { sendVerificationCode, signInWithPhone } from '../lib/cloudService';
import './LoginModal.css';
import { getPlatformClassNames } from '../lib/platformUtil';

function LoginModal({ onClose, onLoginSuccess }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const result = await sendVerificationCode(phone);

      if (result.success) {
        // 开始倒计时
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

        // 提示用户查看手机短信
        setError('验证码已发送，请查收短信');
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

    // 验证手机号
    if (!phone) {
      setError('请输入手机号');
      return;
    }

    // 验证验证码
    if (code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }

    setLoading(true);

    try {
      const result = await signInWithPhone(phone, code);

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
    <div className={`modal-overlay ${getPlatformClassNames().join(' ')}`} onClick={onClose}>
      <div className="modal small" onClick={(e) => e.stopPropagation()}>
        {/* 关闭按钮 */}
        <button className="btn-close" onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* 标题 */}
        <div className="modal-header" style={{ border: 'none', paddingBottom: '12px', textAlign: 'center' }}>
          <h2 className="modal-title" style={{ fontSize: '24px', margin: '0 0 8px 0' }}>📱 手机号登录</h2>
        </div>

        {/* 表单内容 */}
        <div className="modal-body" style={{ paddingTop: '0' }}>
          <div className="form-group">
            <label className="form-label">手机号</label>
            <input
              type="tel"
              className="form-input"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={11}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">验证码</label>
            <div className="code-input-group" style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="请输入6位验证码"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                disabled={loading}
                style={{ flex: 1 }}
              />
              <button
                className="btn-modal secondary"
                onClick={handleSendCode}
                disabled={countdown > 0 || loading}
                style={{ flex: 'none', width: 'auto', padding: '0 20px' }}
              >
                {countdown > 0 ? `${countdown}秒` : '获取验证码'}
              </button>
            </div>
          </div>

          {error && (
            <p className="modal-error" style={{ marginTop: '16px', marginBottom: '0' }}>{error}</p>
          )}

          <div className="modal-actions" style={{ border: 'none', padding: '0', marginTop: '24px' }}>
            <button className="btn-modal primary" onClick={handleLogin} disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </button>
          </div>

          {/* 底部说明 */}
          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-light)', marginTop: '16px', marginBottom: '0' }}>
            登录即表示同意《用户协议》和《隐私政策》
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
