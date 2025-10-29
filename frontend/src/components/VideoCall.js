import React, { useRef, useEffect, useState, useContext, useCallback } from "react";
import { WebSocketContext } from "../context/WebSocketContext";
import LiveCaptions from "./LiveCaptions";
import "./VideoCall.css";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ]
};

const VideoCall = ({ roomId, username }) => {
  const { sendMessage, lastMessage } = useContext(WebSocketContext);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isInvitation, setIsInvitation] = useState(false);
  const [inviter, setInviter] = useState("");
  const [mediaErr, setMediaErr] = useState("");
  const [participants, setParticipants] = useState([]);
  const localVideoRef = useRef(null);
  const localStream = useRef(null);
  const peerConnections = useRef({});
  const sentJoinRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  
  const pendingCandidates = useRef({});

  const setupPeerConnection = useCallback((peerUser) => {
    if (peerConnections.current[peerUser]) {
      return peerConnections.current[peerUser];
    }
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    pendingCandidates.current[peerUser] = [];
    
    localStream.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStream.current);
    });
    
    pc.ontrack = (event) => {
      console.log('🎥 ONTRACK EVENT FIRED for:', peerUser, event.streams[0]);
      setParticipants(prev => {
        if (prev.some(p => p.username === peerUser)) {
          return prev.map(p =>
            p.username === peerUser ? { ...p, stream: event.streams[0], isLocal: false } : p
          );
        }
        return [...prev, { username: peerUser, stream: event.streams[0], isLocal: false }];
      });
    };
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage(JSON.stringify({
          type: "webrtc-candidate",
          roomId,
          from: username,
          to: peerUser,
          candidate: event.candidate
        }));
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log('🔌 Connection state changed for', peerUser, ':', pc.connectionState);
    };
    
    peerConnections.current[peerUser] = pc;
    return pc;
  }, [roomId, username, sendMessage]);

  useEffect(() => {
    if (!lastMessage) return;
    let data = null;
    try { data = JSON.parse(lastMessage); } catch (err) { return; }
    if (!data) return;
    if (
      data.type === "webrtc-start-invite" &&
      data.roomId === roomId &&
      data.inviter !== username &&
      !isCallActive &&
      !isInvitation
    ) {
      setIsInvitation(true);
      setInviter(data.inviter);
    }
  }, [lastMessage, roomId, isCallActive, username, isInvitation]);

  const startOrJoinCall = async (isJoiningInvite) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
      localStream.current = stream;
      setParticipants([{ username, stream, isLocal: true }]);
      setIsInvitation(false);

      if (!isJoiningInvite) {
        sendMessage(JSON.stringify({
          type: "webrtc-start-invite",
          inviter: username,
          roomId
        }));
      }
      if (!sentJoinRef.current) {
        sendMessage(JSON.stringify({
          type: "webrtc-join",
          username,
          roomId
        }));
        sentJoinRef.current = true;
      }
      setIsCallActive(true);
    } catch (err) {
      setMediaErr("Could not access camera/mic: " + err.message);
    }
  };

  useEffect(() => {
    if (isCallActive && localVideoRef.current && localStream.current) {
      localVideoRef.current.srcObject = localStream.current;
    }
  }, [isCallActive]);

  useEffect(() => {
    if (!lastMessage) return;
    let data = null;
    try { data = JSON.parse(lastMessage); } catch { return; }
    if (!data) return;

    // 🔴 FIX: If we get a webrtc-join and we're active, send offer
    if (data.type === "webrtc-join" && data.username !== username && isCallActive) {
      const pc = setupPeerConnection(data.username);
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        sendMessage(JSON.stringify({
          type: "webrtc-offer",
          roomId,
          from: username,
          to: data.username,
          offer
        }));
      });
    }
    
    // 🔴 FIX: Handle offer even if NOT active yet - auto-accept and join
    if (data.type === "webrtc-offer" && data.to === username) {
      // If we're not active, auto-start the call (passive join)
      if (!isCallActive) {
        navigator.mediaDevices.getUserMedia({video: true, audio: true})
          .then(stream => {
            localStream.current = stream;
            setParticipants([{ username, stream, isLocal: true }]);
            setIsInvitation(false);
            setIsCallActive(true);
            
            // Now handle the offer
            const pc = setupPeerConnection(data.from);
            return pc.setRemoteDescription(new window.RTCSessionDescription(data.offer))
              .then(() => pc.createAnswer())
              .then(answer => {
                pc.setLocalDescription(answer);
                sendMessage(JSON.stringify({
                  type: "webrtc-answer",
                  roomId,
                  from: username,
                  to: data.from,
                  answer
                }));
              })
              .then(() => {
                // Process queued candidates
                if (pendingCandidates.current[data.from]) {
                  pendingCandidates.current[data.from].forEach(candidate => {
                    pc.addIceCandidate(new window.RTCIceCandidate(candidate))
                      .catch(e => console.error('Error adding queued candidate:', e));
                  });
                  pendingCandidates.current[data.from] = [];
                }
              });
          })
          .catch(err => {
            setMediaErr("Could not access camera/mic: " + err.message);
          });
      } else {
        // We're already active, just handle the offer normally
        const pc = setupPeerConnection(data.from);
        pc.setRemoteDescription(new window.RTCSessionDescription(data.offer))
          .then(() => pc.createAnswer())
          .then(answer => {
            pc.setLocalDescription(answer);
            sendMessage(JSON.stringify({
              type: "webrtc-answer",
              roomId,
              from: username,
              to: data.from,
              answer
            }));
          })
          .then(() => {
            if (pendingCandidates.current[data.from]) {
              pendingCandidates.current[data.from].forEach(candidate => {
                pc.addIceCandidate(new window.RTCIceCandidate(candidate))
                  .catch(e => console.error('Error adding queued candidate:', e));
              });
              pendingCandidates.current[data.from] = [];
            }
          });
      }
    }
    
    if (data.type === "webrtc-answer" && data.to === username && isCallActive) {
      const pc = peerConnections.current[data.from];
      if (pc) {
        pc.setRemoteDescription(new window.RTCSessionDescription(data.answer))
          .then(() => {
            if (pendingCandidates.current[data.from]) {
              pendingCandidates.current[data.from].forEach(candidate => {
                pc.addIceCandidate(new window.RTCIceCandidate(candidate))
                  .catch(e => console.error('Error adding queued candidate:', e));
              });
              pendingCandidates.current[data.from] = [];
            }
          });
      }
    }
    
    if (data.type === "webrtc-candidate" && data.to === username) {
      const pc = peerConnections.current[data.from];
      if (pc && data.candidate) {
        if (!pc.remoteDescription || !pc.remoteDescription.type) {
          if (!pendingCandidates.current[data.from]) {
            pendingCandidates.current[data.from] = [];
          }
          pendingCandidates.current[data.from].push(data.candidate);
        } else {
          pc.addIceCandidate(new window.RTCIceCandidate(data.candidate))
            .catch(e => console.error('Error adding ICE candidate:', e));
        }
      }
    }
    
    if (data.type === "webrtc-leave" && data.from) {
      if (peerConnections.current[data.from]) {
        peerConnections.current[data.from].close();
        delete peerConnections.current[data.from];
        delete pendingCandidates.current[data.from];
      }
      setParticipants(prev => prev.filter(p => p.username !== data.from));
    }
    
    window.onbeforeunload = () => {
      sendMessage(JSON.stringify({
        type: "webrtc-leave",
        from: username,
        roomId
      }));
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
      pendingCandidates.current = {};
    };
  }, [lastMessage, isCallActive, sendMessage, username, roomId, setupPeerConnection]);

  const endCall = () => {
    localStream.current?.getTracks().forEach(t => t.stop());
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    pendingCandidates.current = {};
    sentJoinRef.current = false;
    sendMessage(JSON.stringify({
      type: "webrtc-leave",
      from: username,
      roomId
    }));
    setIsCallActive(false);
    setParticipants([]);
  };
  
  const toggleMute = () => {
    localStream.current?.getAudioTracks().forEach(track => track.enabled = !track.enabled);
    setIsMuted(m => !m);
  };
  
  const toggleCamera = () => {
    localStream.current?.getVideoTracks().forEach(track => track.enabled = !track.enabled);
    setIsCameraOff(c => !c);
  };

  if (isInvitation && !isCallActive) {
    return (
      <div className="video-call-invite-container">
        <div>
          <b>{inviter}</b> started a call. Join?
        </div>
        <button className="start-call-btn" onClick={() => startOrJoinCall(true)}>Join Call</button>
        <button className="end-call-btn" onClick={() => setIsInvitation(false)}>Reject</button>
      </div>
    );
  }

  return (
    <div className="video-call-container">
      {!isCallActive ? (
        <>
          {mediaErr && (<div style={{ color: "red" }}>{mediaErr}</div>)}
          <button className="start-call-btn" onClick={() => startOrJoinCall(false)}>
            📹 Start Video Call
          </button>
        </>
      ) : (
        <div className="video-call-box-grid">
          <div className="video-call-grid">
            {participants.map((p) => (
              <div className="video-call-tile" key={p.username}>
                {p.isLocal
                  ? <video ref={localVideoRef} autoPlay muted playsInline className="video-call-video" />
                  : <RemoteVideo stream={p.stream} name={p.username} />}
                <div className="video-call-user-label">{p.username}</div>
              </div>
            ))}
          </div>
          <div className="video-controls-grid">
            <button className="video-btn" onClick={toggleMute}>
              {isMuted ? "🔇 Muted" : "🔊 Unmute"}
            </button>
            <button className="video-btn" onClick={toggleCamera}>
              {isCameraOff ? "📷 Camera Off" : "📹 Camera On"}
            </button>
            <button className="video-btn end-call-btn" onClick={endCall}>
              End Call
            </button>
          </div>
        </div>
      )}
      <LiveCaptions roomId={roomId} username={username} />
    </div>
  );
};

const RemoteVideo = ({ stream }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className="video-call-video" />;
};

export default VideoCall;
