import { useState, useRef, useEffect } from 'react';
import './ScreenshotPreview.css';

function ScreenshotPreview({ screenshot, onConfirm, onCancel }) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [boxes, setBoxes] = useState([]);
  const [currentBox, setCurrentBox] = useState(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    // 在组件挂载后绘制图片和所有标注框
    drawCanvas();
  }, [screenshot, boxes]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    // 绘制图片
    ctx.drawImage(image, 0, 0);

    // 绘制所有标注框
    boxes.forEach(box => {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    });

    // 绘制当前正在画的框
    if (currentBox) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
    }
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setCurrentBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentBox) return;

    const pos = getMousePos(e);
    setCurrentBox({
      ...currentBox,
      width: pos.x - currentBox.x,
      height: pos.y - currentBox.y,
    });
    drawCanvas();
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox) return;

    // 只有当框有一定大小时才添加
    if (Math.abs(currentBox.width) > 10 && Math.abs(currentBox.height) > 10) {
      // 标准化框坐标（处理负宽高）
      const normalizedBox = {
        x: currentBox.width < 0 ? currentBox.x + currentBox.width : currentBox.x,
        y: currentBox.height < 0 ? currentBox.y + currentBox.height : currentBox.y,
        width: Math.abs(currentBox.width),
        height: Math.abs(currentBox.height),
      };
      setBoxes([...boxes, normalizedBox]);
    }

    setIsDrawing(false);
    setCurrentBox(null);
    drawCanvas();
  };

  const handleClearBoxes = () => {
    setBoxes([]);
    drawCanvas();
  };

  return (
    <div className="screenshot-preview-overlay" onClick={onCancel}>
      <div className="screenshot-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="screenshot-preview-header">
          <h3>截图预览</h3>
          <div className="screenshot-preview-actions">
            <button className="btn-secondary" onClick={handleClearBoxes}>
              清除标注
            </button>
            <button className="btn-secondary" onClick={onCancel}>
              取消
            </button>
            <button className="btn-primary" onClick={() => onConfirm(screenshot, boxes)}>
              确认发送
            </button>
          </div>
        </div>
        <div className="screenshot-preview-content">
          <div className="canvas-container">
            <img
              ref={imageRef}
              src={screenshot.preview}
              alt="Screenshot"
              style={{ display: 'none' }}
              onLoad={drawCanvas}
            />
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
          <div className="screenshot-preview-tips">
            <p>💡 提示：在截图上拖拽鼠标可以画框标注重点区域</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScreenshotPreview;
