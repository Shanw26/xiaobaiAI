import { useEffect } from 'react';
import { getPlatformClassNames } from '../lib/platformUtil';
import './ModalBase.windows.css';

/**
 * 平台样式初始化组件
 * 在应用根组件使用一次，根据平台动态加载样式
 */
function PlatformStyles({ children }) {
  useEffect(() => {
    // 在 body 上添加平台类名
    const classNames = getPlatformClassNames();
    document.body.classList.add(...classNames);

    return () => {
      // 清理类名
      document.body.classList.remove(...classNames);
    };
  }, []);

  return children;
}

export default PlatformStyles;
