/**
 * 平台检测工具
 * 用于根据不同平台应用不同的样式和行为
 */

/**
 * 检测当前平台
 * @returns {string} 'windows' | 'macos' | 'linux' | 'unknown'
 */
export function getPlatform() {
  const platform = window.navigator.platform.toLowerCase();

  if (platform.includes('win')) {
    return 'windows';
  } else if (platform.includes('mac')) {
    return 'macos';
  } else if (platform.includes('linux')) {
    return 'linux';
  }

  return 'unknown';
}

/**
 * 检测是否为 Windows 平台
 * @returns {boolean}
 */
export function isWindows() {
  return getPlatform() === 'windows';
}

/**
 * 检测是否为 macOS 平台
 * @returns {boolean}
 */
export function isMacOS() {
  return getPlatform() === 'macos';
}

/**
 * 检测是否为 Linux 平台
 * @returns {boolean}
 */
export function isLinux() {
  return getPlatform() === 'linux';
}

/**
 * 获取平台特定的样式类名
 * @param {Object} styles - 样式对象（可选）
 * @returns {string} 平台类名，如 'windows-style', 'macos-style'
 */
export function getPlatformClassName(styles) {
  const platform = getPlatform();
  return `${platform}-style`;
}

/**
 * 获取平台特定的CSS类名数组
 * @returns {string[]} 类名数组
 */
export function getPlatformClassNames() {
  const platform = getPlatform();
  return [`${platform}-style`];
}

/**
 * 判断是否需要使用 Windows 风格
 * @returns {boolean}
 */
export function useWindowsStyle() {
  return isWindows();
}

/**
 * 获取系统字体
 * @returns {string} 字体族
 */
export function getSystemFont() {
  if (isWindows()) {
    return "'Segoe UI', 'Microsoft YaHei', sans-serif";
  } else if (isMacOS()) {
    return "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
  } else {
    return "'Ubuntu', 'Roboto', 'Helvetica Neue', sans-serif";
  }
}

/**
 * 获取标准圆角大小
 * @returns {string} CSS border-radius 值
 */
export function getBorderRadius() {
  if (isWindows()) {
    return '4px'; // Windows Fluent Design
  } else if (isMacOS()) {
    return '12px'; // Apple Human Interface
  } else {
    return '6px'; // Linux 通用
  }
}

/**
 * 获取标准阴影
 * @param {string} type - 阴影类型 'small' | 'medium' | 'large'
 * @returns {string} CSS box-shadow 值
 */
export function getBoxShadow(type = 'medium') {
  if (isWindows()) {
    // Windows Fluent Design: 较小的阴影
    const shadows = {
      small: '0 2px 4px rgba(0, 0, 0, 0.08)',
      medium: '0 4px 12px rgba(0, 0, 0, 0.12)',
      large: '0 8px 24px rgba(0, 0, 0, 0.16)'
    };
    return shadows[type] || shadows.medium;
  } else if (isMacOS()) {
    // macOS: 较大的毛玻璃阴影
    const shadows = {
      small: '0 2px 8px rgba(0, 0, 0, 0.1)',
      medium: '0 12px 24px rgba(0, 0, 0, 0.15)',
      large: '0 20px 60px rgba(0, 0, 0, 0.2)'
    };
    return shadows[type] || shadows.medium;
  } else {
    // Linux: 通用阴影
    const shadows = {
      small: '0 1px 3px rgba(0, 0, 0, 0.12)',
      medium: '0 4px 6px rgba(0, 0, 0, 0.16)',
      large: '0 10px 20px rgba(0, 0, 0, 0.19)'
    };
    return shadows[type] || shadows.medium;
  }
}
