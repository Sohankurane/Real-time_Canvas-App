import React from 'react';
import { useVideoCall } from './VideoCall.hook';
import './VideoCall.css';

const VideoCall = ({ roomId, username }) => {
  const {
    localVideoRef,
    remoteVideoRef,
    isCallActive,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
    startCall,
    endCall
  } = useVideoCall(roomId, username);

  return (
    <div className="videocall-container">
      <div className="videocall-videos">
        {/* Local Video (Your camera) */}
        <div className="videocall-local">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="videocall-video"
          />
          <span className="videocall-label">You ({username})</span>
        </div>

        {/* Remote Video (Other participant) */}
        {isCallActive && (
          <div className="videocall-remote">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="videocall-video"
            />
            <span className="videocall-label">Remote User</span>
          </div>
        )}
      </div>

      {/* Video Call Controls */}
      <div className="videocall-controls">
        {!isCallActive ? (
          <button className="videocall-btn videocall-btn-start" onClick={startCall}>
            📹 Start Video Call
          </button>
        ) : (
          <>
            <button
              className={`videocall-btn ${isMuted ? 'videocall-btn-danger' : 'videocall-btn-primary'}`}
              onClick={toggleMute}
            >
              {isMuted ? '🔇 Unmute' : '🔊 Mute'}
            </button>

            <button
              className={`videocall-btn ${isVideoOff ? 'videocall-btn-danger' : 'videocall-btn-primary'}`}
              onClick={toggleVideo}
            >
              {isVideoOff ? '📹 Camera On' : '📷 Camera Off'}
            </button>

            <button className="videocall-btn videocall-btn-end" onClick={endCall}>
              ❌ End Call
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
