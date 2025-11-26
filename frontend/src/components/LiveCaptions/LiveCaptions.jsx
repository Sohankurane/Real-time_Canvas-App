import React from 'react';
import { useLiveCaptions } from './LiveCaptions.hook';
import './LiveCaptions.css';

const LiveCaptions = ({ username, isEnabled }) => {
  const {
    captions,
    isListening,
    toggleListening
  } = useLiveCaptions(username, isEnabled);

  if (!isEnabled) return null;

  return (
    <div className="livecaptions-container">
      <div className="livecaptions-header">
        <span className="livecaptions-title">🎤 Live Captions</span>
        <button
          className={`livecaptions-toggle ${isListening ? 'livecaptions-active' : ''}`}
          onClick={toggleListening}
        >
          {isListening ? '⏸ Pause' : '▶ Start'}
        </button>
      </div>

      <div className="livecaptions-display">
        {captions.length === 0 ? (
          <div className="livecaptions-empty">
            {isListening ? 'Listening... Speak now!' : 'Click Start to begin captions'}
          </div>
        ) : (
          captions.map((caption, index) => (
            <div key={index} className="livecaptions-item">
              <span className="livecaptions-user">{caption.username}:</span>
              <span className="livecaptions-text">{caption.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LiveCaptions;
