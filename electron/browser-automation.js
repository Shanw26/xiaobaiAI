/**
 * 浏览器自动化模块 - 基于 Playwright
 *
 * 功能：
 * - 智能检测并启动系统默认浏览器
 * - 打开网页、截图、搜索等操作
 * - 自动管理浏览器生命周期
 */

const { chromium, webkit, firefox } = require('playwright');
const { detectDefaultBrowser, getBrowserName, getSupportedBrowsers } = require('./browser-detector');
const path = require('path');
const os = require('os');

/**
 * 安全的日志记录
 */
function safeLog(...args) {
  try {
    if (process.stdout && process.stdout.writable) {
      console.log(...args);
    }
  } catch (error) {
    // 忽略
  }
}

function safeError(...args) {
  try {
    if (process.stderr && process.stderr.writable) {
      console.error(...args);
    }
  } catch (error) {
    // 忽略
  }
}

/**
 * 浏览器管理器（单例模式）
 */
class BrowserManager {
  constructor() {
    this.browser = null;
    this.page = null;
    this.browserType = null;
    this.channel = null;
  }

  /**
   * 初始化浏览器
   */
  async initialize() {
    if (this.browser) {
      safeLog('[浏览器] 已有实例，复用现有浏览器');
      return { browser: this.browser, page: this.page || await this.browser.newPage() };
    }

    safeLog('[浏览器] 正在初始化...');

    // 1. 检测默认浏览器
    this.channel = await detectDefaultBrowser();

    if (!this.channel) {
      const supported = getSupportedBrowsers().join('、');
      throw new Error(
        `未检测到支持的浏览器。\n` +
        `请安装以下浏览器之一：${supported}\n\n` +
        `提示：Safari 是 macOS 系统自带的，可直接使用。`
      );
    }

    const browserName = getBrowserName(this.channel);
    safeLog(`[浏览器] 检测到浏览器: ${browserName}`);

    // 2. 启动对应的浏览器
    try {
      if (this.channel === 'chrome' || this.channel === 'msedge') {
        this.browserType = chromium;
        this.browser = await chromium.launch({
          channel: this.channel,
          headless: false, // 显示浏览器窗口
          args: ['--start-maximized'] // 最大化窗口
        });
      } else if (this.channel === 'webkit') {
        this.browserType = webkit;
        this.browser = await webkit.launch({
          headless: false
        });
      } else if (this.channel === 'firefox') {
        this.browserType = firefox;
        this.browser = await firefox.launch({
          headless: false
        });
      } else {
        throw new Error(`不支持的浏览器类型: ${this.channel}`);
      }

      safeLog(`[浏览器] ✅ ${browserName} 启动成功`);

      // 3. 创建第一个页面
      this.page = await this.browser.newPage();

      return { browser: this.browser, page: this.page };

    } catch (error) {
      safeError(`[浏览器] 启动失败:`, error.message);
      throw new Error(`浏览器启动失败: ${error.message}`);
    }
  }

  /**
   * 打开网页
   */
  async openUrl(url) {
    safeLog(`[浏览器] 正在打开: ${url}`);

    try {
      // 确保浏览器已初始化且还连接着
      if (!this.browser || !this.browser.isConnected()) {
        safeLog('[浏览器] 浏览器未连接，重新初始化...');
        await this.initialize();
      }

      // 确保 page 存在且可用
      if (!this.page) {
        this.page = await this.browser.newPage();
      }

      // 打开网页
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // 等待页面加载完成
      await this.page.waitForTimeout(2000);

      safeLog(`[浏览器] ✅ 网页已打开`);

      return {
        success: true,
        url: this.page.url(),
        title: await this.page.title()
      };

    } catch (error) {
      safeError(`[浏览器] 打开网页失败:`, error.message);

      // 如果是浏览器连接问题，尝试重新初始化并重试一次
      if (error.message.includes('closed') || error.message.includes('been closed')) {
        safeLog('[浏览器] 浏览器已关闭，尝试重新启动...');

        // 清理旧状态
        this.browser = null;
        this.page = null;

        // 重新初始化
        await this.initialize();

        // 重试操作
        safeLog('[浏览器] 重试打开网页...');
        this.page = await this.browser.newPage();
        await this.page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        await this.page.waitForTimeout(2000);

        safeLog(`[浏览器] ✅ 网页已打开（重试成功）`);

        return {
          success: true,
          url: this.page.url(),
          title: await this.page.title()
        };
      }

      throw error;
    }
  }

  /**
   * 网页截图
   */
  async screenshot(options = {}) {
    safeLog('[浏览器] 正在截图...');

    try {
      if (!this.page) {
        throw new Error('浏览器未打开网页，无法截图');
      }

      // 默认保存到临时目录
      const tempDir = os.tmpdir();
      const filename = `xiaobai-screenshot-${Date.now()}.png`;
      const screenshotPath = path.join(tempDir, filename);

      await this.page.screenshot({
        path: screenshotPath,
        fullPage: options.fullPage || false,
        ...options
      });

      safeLog(`[浏览器] ✅ 截图已保存: ${screenshotPath}`);

      return {
        success: true,
        path: screenshotPath,
        filename: filename
      };

    } catch (error) {
      safeError(`[浏览器] 截图失败:`, error.message);
      throw error;
    }
  }

  /**
   * 搜索引擎搜索
   */
  async search(query, searchEngine = 'baidu') {
    safeLog(`[浏览器] 正在搜索: ${query}（引擎: ${searchEngine}）`);

    try {
      // 构建搜索 URL
      let searchUrl;

      if (searchEngine === 'baidu') {
        searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`;
      } else if (searchEngine === 'google') {
        searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      } else if (searchEngine === 'bing') {
        searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
      } else {
        throw new Error(`不支持的搜索引擎: ${searchEngine}`);
      }

      // 打开搜索页面
      const result = await this.openUrl(searchUrl);

      safeLog(`[浏览器] ✅ 搜索完成`);

      return {
        success: true,
        query: query,
        searchEngine: searchEngine,
        url: result.url
      };

    } catch (error) {
      safeError(`[浏览器] 搜索失败:`, error.message);
      throw error;
    }
  }

  /**
   * 获取页面信息
   */
  async getPageInfo() {
    try {
      if (!this.page) {
        return {
          success: false,
          message: '浏览器未打开网页'
        };
      }

      const title = await this.page.title();
      const url = this.page.url();

      return {
        success: true,
        title: title,
        url: url
      };

    } catch (error) {
      safeError(`[浏览器] 获取页面信息失败:`, error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 点击页面元素
   * @param {string} selector - CSS 选择器
   * @param {object} options - 选项
   */
  async clickElement(selector, options = {}) {
    safeLog(`[浏览器] 正在点击元素: ${selector}`);

    try {
      // 确保浏览器已初始化且还连接着
      if (!this.browser || !this.browser.isConnected()) {
        safeLog('[浏览器] 浏览器未连接，重新初始化...');
        await this.initialize();
      }

      // 确保 page 存在
      if (!this.page) {
        throw new Error('浏览器未打开网页');
      }

      // 等待元素可见
      await this.page.waitForSelector(selector, {
        timeout: options.timeout || 5000
      });

      // 点击元素
      await this.page.click(selector, {
        timeout: options.timeout || 5000
      });

      // 等待页面响应
      await this.page.waitForTimeout(1000);

      safeLog(`[浏览器] ✅ 元素已点击`);

      return {
        success: true,
        selector: selector
      };

    } catch (error) {
      safeError(`[浏览器] 点击元素失败:`, error.message);

      // 如果是浏览器连接问题，尝试重新初始化并重试
      if (error.message.includes('closed') || error.message.includes('been closed')) {
        safeLog('[浏览器] 浏览器已关闭，尝试重新启动...');

        this.browser = null;
        this.page = null;

        await this.initialize();
        this.page = await this.browser.newPage();

        // 重试点击
        safeLog('[浏览器] 重试点击元素...');
        await this.page.waitForSelector(selector, { timeout: 5000 });
        await this.page.click(selector);
        await this.page.waitForTimeout(1000);

        safeLog(`[浏览器] ✅ 元素已点击（重试成功）`);

        return {
          success: true,
          selector: selector
        };
      }

      throw error;
    }
  }

  /**
   * 关闭浏览器
   */
  async close() {
    safeLog('[浏览器] 正在关闭...');

    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      this.channel = null;
      this.browserType = null;

      safeLog('[浏览器] ✅ 已关闭');

    } catch (error) {
      safeError(`[浏览器] 关闭失败:`, error.message);
    }
  }

  /**
   * 检查浏览器是否已打开
   */
  isOpen() {
    return this.browser !== null && this.browser.isConnected();
  }
}

// 导出单例
const browserManager = new BrowserManager();

module.exports = {
  browserManager,
  detectDefaultBrowser,
  getBrowserName,
  getSupportedBrowsers,
};
