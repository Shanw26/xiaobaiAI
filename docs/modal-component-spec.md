# 小白AI 弹窗组件设计规范

## 📋 文档信息

- **创建时间**: 2026-01-07
- **版本**: v2.7.5
- **维护者**: 晓力
- **状态**: ✅ 已实施

---

## 1. 背景

### 1.1 优化前的问题

在开发过程中，项目积累了多个弹窗组件，但由于缺乏统一规范，导致以下问题：

#### 问题 1: 样式不统一
- 遮罩层 z-index 从 1000 到 9999 混乱
- 背景透明度不一致：0.5、0.8
- 圆角大小混用：12px、16px、20px
- 只有 SettingsModal 使用了 `backdrop-filter: blur(10px)`

#### 问题 2: 代码重复
- 每个弹窗都重复定义遮罩层样式
- 按钮类名不统一：`.btn-primary` vs `.btn-modal.primary`
- 大量硬编码颜色值：`#00c885`、`#16a34a`、`#22c55e`

#### 问题 3: 维护困难
- 修改一个全局样式需要更新多个文件
- 新增弹窗时需要复制大量代码
- 容易出现不一致的样式

### 1.2 优化目标

- ✅ 统一所有弹窗的视觉样式
- ✅ 减少代码重复，提高可维护性
- ✅ 建立清晰的设计规范
- ✅ 简化新增弹窗的开发流程

---

## 2. 解决方案

### 2.1 创建基础样式库

新建 `src/components/ModalBase.css`，定义所有弹窗共用的基础样式：

```css
/* 遮罩层 */
.modal-overlay {
  position: fixed;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  z-index: 1000;
  animation: fadeIn 0.25s ease;
}

/* 弹窗容器 */
.modal {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 按钮 */
.btn-modal.primary {
  background: var(--primary);
  color: white;
}

.btn-modal.secondary {
  background: white;
  border: 1.5px solid var(--border);
}
```

### 2.2 使用 CSS 变量

利用 `index.css` 中已定义的全局变量：

```css
--primary: #00cc66
--primary-hover: #00b359
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 16px
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08)
```

### 2.3 弹窗组件改造

改造前：
```css
/* ToastModal.css - 85行 */
.toast-overlay {
  position: fixed;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  animation: fadeIn 0.2s ease-out;
}
/* ... 大量重复代码 */
```

改造后：
```css
/* ToastModal.css - 12行 */
@import './ModalBase.css';

.toast-overlay {
  z-index: 2000; /* 只覆盖特定属性 */
}
```

**代码减少 86%**

---

## 3. 设计规范

### 3.1 弹窗层级体系

| 层级 | z-index | 使用场景 | 示例 |
|------|---------|---------|------|
| 普通弹窗 | 1000 | 一般弹窗 | LoginModal, GuestLimitModal |
| 重要提示 | 2000 | 需要用户注意 | ToastModal, UpdateAvailableModal |
| 强制更新 | 9999 | 阻断式弹窗 | ForceUpdateModal |

### 3.2 弹窗尺寸规范

| 类名 | 最大宽度 | 内边距 | 使用场景 |
|------|---------|--------|---------|
| `.modal.small` | 420px | 32px | 简单确认、提示 |
| `.modal.medium` | 540px | 40px | 表单输入、欢迎页 |
| `.modal.large` | 920px | 自适应 | 设置面板、复杂内容 |

### 3.3 视觉规范

#### 遮罩层
```css
background: rgba(0, 0, 0, 0.5);
backdrop-filter: blur(10px);
animation: fadeIn 0.25s ease;
```

#### 弹窗容器
```css
background: white;
border-radius: 16px;
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
```

#### 主按钮
```css
background: var(--primary);
color: white;
height: 46px;
border-radius: 12px;
font-weight: 600;
```

#### 次要按钮
```css
background: white;
border: 1.5px solid var(--border);
color: var(--text);
height: 46px;
border-radius: 12px;
```

### 3.4 动画规范

| 动画名 | 时长 | 缓动函数 | 使用场景 |
|--------|------|----------|----------|
| fadeIn | 0.25s | ease | 遮罩层显示 |
| slideUp | 0.3s | cubic-bezier(0.34, 1.56, 0.64, 1) | 弹窗显示 |
| bounce | 0.5s | ease-out | 图标强调 |
| spin | 1s | linear infinite | 加载动画 |

---

## 4. 组件使用指南

### 4.1 现有弹窗组件

| 组件名 | 文件 | 尺寸 | z-index | 特殊功能 |
|--------|------|------|---------|----------|
| ToastModal | ToastModal.jsx | small | 2000 | 简单提示 |
| GuestLimitModal | GuestLimitModal.jsx | small | 1000 | 游客限制提示 |
| LoginModal | LoginModal.jsx | small | 1000 | 手机验证码登录 |
| ForceUpdateModal | ForceUpdateModal.jsx | small | 9999 | 强制更新（不可关闭） |
| UpdateAvailableModal | UpdateAvailableModal.jsx | medium | 2000 | 可选更新 |
| UpdateDownloadedModal | UpdateDownloadedModal.jsx | small | 2000 | 更新完成提醒 |
| SettingsModal | SettingsModal.jsx | large | 1000 | 设置面板 |

### 4.2 新增弹窗步骤

#### 步骤 1: 创建组件文件

```jsx
// src/components/MyModal.jsx
import './MyModal.css';

function MyModal({ onClose, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">标题</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="modal-description">弹窗内容...</p>
        </div>

        <div className="modal-actions">
          <button className="btn-modal secondary" onClick={onClose}>
            取消
          </button>
          <button className="btn-modal primary" onClick={onConfirm}>
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

export default MyModal;
```

#### 步骤 2: 创建样式文件

```css
/* src/components/MyModal.css */
@import './ModalBase.css';

/* 只定义该弹窗特有的样式 */
.my-modal .special-feature {
  /* 特殊样式 */
}
```

#### 步骤 3: 使用组件

```jsx
import { useState } from 'react';
import MyModal from './components/MyModal';

function App() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)}>打开弹窗</button>

      {showModal && (
        <MyModal
          onClose={() => setShowModal(false)}
          onConfirm={() => {
            // 处理确认
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}
```

### 4.3 自定义样式指南

#### 修改遮罩层透明度

```css
@import './ModalBase.css';

.modal-overlay.custom {
  background: rgba(0, 0, 0, 0.7); /* 更暗的遮罩 */
}
```

#### 修改弹窗宽度

```css
@import './ModalBase.css';

.modal.custom-width {
  max-width: 600px; /* 自定义宽度 */
}
```

#### 添加彩色头部

```css
@import './ModalBase.css';

.custom-header-modal .modal-header {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  color: white;
}
```

---

## 5. 文件结构

```
src/components/
├── ModalBase.css           # 统一基础样式（新增）
├── ToastModal.jsx          # 提示弹窗
├── ToastModal.css          # 样式（优化后 12 行）
├── GuestLimitModal.jsx     # 游客限制弹窗
├── GuestLimitModal.css     # 样式（优化后 67 行）
├── LoginModal.jsx          # 登录弹窗
├── LoginModal.css          # 样式（优化后 149 行）
├── ForceUpdateModal.jsx    # 强制更新弹窗
├── ForceUpdateModal.css    # 样式（优化后保留特殊功能）
├── UpdateAvailableModal.jsx
├── UpdateAvailableModal.css
├── UpdateDownloadedModal.jsx
├── UpdateDownloadedModal.css
└── SettingsModal.jsx       # 设置弹窗（未修改）
```

---

## 6. 最佳实践

### 6.1 DO - 推荐做法

✅ **使用基础类名**
```jsx
<div className="modal small">
<div className="btn-modal primary">
```

✅ **使用 CSS 变量**
```css
color: var(--primary);
border-radius: var(--radius-lg);
```

✅ **导入基础样式**
```css
@import './ModalBase.css';
```

✅ **只覆盖必要的样式**
```css
/* 好的做法 */
.my-modal {
  padding: 48px; /* 只覆盖特定属性 */
}
```

### 6.2 DON'T - 避免的做法

❌ **重复定义基础样式**
```css
/* 不好的做法 */
.my-modal {
  position: fixed;
  top: 0;
  left: 0;
  /* ... 大量重复代码 */
}
```

❌ **硬编码颜色值**
```css
/* 不好的做法 */
background: #00cc66; /* 应该用 var(--primary) */
```

❌ **使用不一致的类名**
```jsx
<!-- 不好的做法 -->
<button className="btn-primary"> <!-- 应该用 btn-modal primary -->
```

❌ **忽略可访问性**
```jsx
<!-- 不好的做法 -->
<div onClick={onClose}> <!-- 缺少 role 和 aria -->
```

```jsx
<!-- 好的做法 -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  onClick={onClose}
>
```

---

## 7. 性能优化

### 7.1 已实施的优化

1. **减少 CSS 体积**
   - ModalBase.css: 320 行（一次定义）
   - 各弹窗 CSS: 平均减少 60-80% 代码

2. **使用 CSS 变量**
   - 方便主题切换
   - 减少编译后的 CSS 体积

3. **统一动画**
   - 使用 GPU 加速的 transform 和 opacity
   - 避免布局抖动

### 7.2 未来优化建议

1. **按需加载**
   ```jsx
   // 动态导入大型弹窗
   const SettingsModal = lazy(() => import('./SettingsModal'));
   ```

2. **弹窗缓存**
   ```jsx
   // 避免频繁创建/销毁弹窗组件
   const [modalCache] = useState(new Map());
   ```

3. **虚拟化长列表**
   - 如果弹窗内容包含长列表，考虑使用虚拟滚动

---

## 8. 浏览器兼容性

### 8.1 支持的浏览器

| 浏览器 | 最低版本 | 说明 |
|--------|---------|------|
| Chrome | 90+ | 完全支持 |
| Edge | 90+ | 完全支持 |
| Firefox | 88+ | 完全支持 |
| Safari | 14+ | 完全支持 |

### 8.2 降级方案

```css
/* backdrop-filter 降级 */
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px); /* 现代浏览器 */
}

@supports not (backdrop-filter: blur(10px)) {
  .modal-overlay {
    background: rgba(0, 0, 0, 0.7); /* 降级：更暗的背景 */
  }
}
```

---

## 9. 常见问题 FAQ

### Q1: 为什么某些弹窗有不同的 z-index？

**A:** 根据重要性和阻断性分为三个层级：
- 1000: 普通弹窗（登录、设置等）
- 2000: 重要提示（Toast、更新提醒）
- 9999: 强制操作（强制更新，不可关闭）

### Q2: 如何覆盖默认样式？

**A:** 有三种方式：
1. **修改 ModalBase.css**（影响所有弹窗）
2. **在组件 CSS 中覆盖**（影响单个弹窗）
3. **使用内联样式**（影响单个元素）

```css
/* 方式 1: 修改全局 */
.modal {
  border-radius: 20px; /* 所有弹窗 */
}

/* 方式 2: 组件覆盖 */
.my-modal .modal {
  border-radius: 20px; /* 仅该弹窗 */
}

/* 方式 3: 内联样式 */
<div style={{ borderRadius: '20px' }}>
```

### Q3: 如何添加自定义动画？

**A:** 在组件 CSS 中定义，并添加到元素的 class：

```css
@keyframes myAnimation {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.my-modal {
  animation: myAnimation 0.3s ease-out;
}
```

### Q4: 弹窗内容太多时怎么办？

**A:** 使用 `.modal-body` 的滚动功能：

```css
.modal-body {
  max-height: 70vh;
  overflow-y: auto;
}
```

### Q5: 如何实现点击遮罩关闭？

**A:** 在遮罩层添加 onClick，在弹窗内容阻止冒泡：

```jsx
<div className="modal-overlay" onClick={onClose}>
  <div className="modal" onClick={(e) => e.stopPropagation()}>
    {/* 内容 */}
  </div>
</div>
```

---

## 10. 更新日志

### v2.7.5 (2026-01-07)

#### 新增
- ✨ 新增 `ModalBase.css` 统一基础样式库
- ✨ 新增弹窗设计规范文档

#### 优化
- 🎨 统一所有弹窗的视觉样式
- 🎨 使用 CSS 变量替代硬编码颜色
- 📉 各弹窗 CSS 平均减少 60-80% 代码
- 🐛 修复 z-index 混乱问题

#### 改造的组件
- ToastModal
- GuestLimitModal
- ForceUpdateModal
- UpdateDownloadedModal
- UpdateAvailableModal
- LoginModal

---

## 11. 相关资源

### 11.1 内部文档
- [CSS 变量定义](../src/index.css)
- [全局样式规范](../src/App.css)
- [组件开发指南](./component-guide.md)

### 11.2 外部参考
- [CSS Modules 最佳实践](https://github.com/css-modules/css-modules)
- [React 可访问性指南](https://react.dev/learn/accessibility)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)

---

## 12. 维护者注

这是一份活文档，随着项目演进会持续更新。如有问题或建议，请联系晓力。

**最后更新**: 2026-01-07
**文档版本**: 1.0.0
