import React from 'react';
import { useCanvas } from './Canvas.hook';
import ChatBox from '../ChatBox';
import VideoCall from '../VideoCall';
import LiveCaptions from '../LiveCaptions';
import './Canvas.css';

const Canvas = ({ user, roomId, adminUsername, onSwitchRoom }) => {
  const {
    canvasRef,
    tool,
    setTool,
    color,
    setColor,
    thickness,
    setThickness,
    snapshots,
    handleClear,
    handleUndo,
    handleSaveSnapshot,
    handleRestoreSnapshot,
    handleDeleteRoom,
    isAdmin
  } = useCanvas(user, roomId, adminUsername);

  return (
    <div className="canvas-page">
      {/* Header with room info and actions */}
      <div className="canvas-header">
        <div className="canvas-room-info">
          <h3>Room: {roomId}</h3>
          <span className="canvas-admin-badge">Admin: {adminUsername}</span>
        </div>
        
        <div className="canvas-actions">
          <button className="canvas-btn canvas-btn-secondary" onClick={onSwitchRoom}>
            🏠 Switch Room
          </button>
          
          {isAdmin && (
            <>
              <button className="canvas-btn canvas-btn-warning" onClick={handleClear}>
                🗑️ Clear Board
              </button>
              <button className="canvas-btn canvas-btn-danger" onClick={handleDeleteRoom}>
                ❌ Delete Room
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="canvas-toolbar">
        {/* Tools */}
        <div className="canvas-tool-group">
          <label>Tool:</label>
          <button
            className={`canvas-tool-btn ${tool === 'brush' ? 'active' : ''}`}
            onClick={() => setTool('brush')}
            title="Brush"
          >
            🖌️
          </button>
          <button
            className={`canvas-tool-btn ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => setTool('eraser')}
            title="Eraser"
          >
            🧹
          </button>
          <button
            className={`canvas-tool-btn ${tool === 'rectangle' ? 'active' : ''}`}
            onClick={() => setTool('rectangle')}
            title="Rectangle"
          >
            ▭
          </button>
          <button
            className={`canvas-tool-btn ${tool === 'ellipse' ? 'active' : ''}`}
            onClick={() => setTool('ellipse')}
            title="Ellipse"
          >
            ⭕
          </button>
          <button
            className={`canvas-tool-btn ${tool === 'text' ? 'active' : ''}`}
            onClick={() => setTool('text')}
            title="Text"
          >
            T
          </button>
        </div>

        {/* Color */}
        <div className="canvas-tool-group">
          <label>Color:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="canvas-color-picker"
          />
        </div>

        {/* Thickness */}
        <div className="canvas-tool-group">
          <label>Size:</label>
          <input
            type="range"
            min="1"
            max="20"
            value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
            className="canvas-thickness-slider"
          />
          <span className="canvas-thickness-value">{thickness}px</span>
        </div>

        {/* Actions */}
        <div className="canvas-tool-group">
          <button className="canvas-btn canvas-btn-primary" onClick={handleUndo}>
            ↶ Undo
          </button>
          <button className="canvas-btn canvas-btn-success" onClick={handleSaveSnapshot}>
            💾 Save Snapshot
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={1200}
          height={700}
          className="canvas-board"
        />
      </div>

      {/* Snapshots Panel */}
      {snapshots.length > 0 && (
        <div className="canvas-snapshots">
          <h4>Snapshots:</h4>
          <div className="canvas-snapshot-list">
            {snapshots.map((snap) => (
              <button
                key={snap.id}
                className="canvas-snapshot-item"
                onClick={() => handleRestoreSnapshot(snap.id)}
                title={`Saved by ${snap.saved_by} at ${snap.created_at}`}
              >
                📸 {snap.saved_by} - {new Date(snap.created_at).toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Integrated Components */}
      <ChatBox roomId={roomId} username={user?.username} />
      <VideoCall roomId={roomId} username={user?.username} />
      <LiveCaptions username={user?.username} isEnabled={true} />
    </div>
  );
};

export default Canvas;
