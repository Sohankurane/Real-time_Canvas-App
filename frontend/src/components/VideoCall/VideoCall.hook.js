import { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { WebSocketContext } from '../../context/WebSocketContext';

/**
 * Custom hook for VideoCall component
 * Handles WebRTC peer connections and media streams
 */
export const useVideoCall = (roomId, username) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const { lastMessage, sendMessage } = useContext(WebSocketContext);

  // WebRTC Configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  // Handle receiving WebRTC offer
  const handleReceiveOffer = useCallback(async (offer) => {
    try {
      if (!peerConnectionRef.current) {
        // Get local media stream first
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        peerConnectionRef.current = new RTCPeerConnection(iceServers);

        // Add local stream tracks
        stream.getTracks().forEach(track => {
          peerConnectionRef.current.addTrack(track, stream);
        });

        // Handle remote stream
        peerConnectionRef.current.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        // Handle ICE candidates
        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate && sendMessage) {
            sendMessage(JSON.stringify({
              type: 'webrtc-candidate',
              candidate: event.candidate
            }));
          }
        };
      }

      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      if (sendMessage) {
        sendMessage(JSON.stringify({
          type: 'webrtc-answer',
          answer: answer
        }));
      }

      setIsCallActive(true);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }, [sendMessage, iceServers]);

  // Handle receiving WebRTC answer
  const handleReceiveAnswer = useCallback(async (answer) => {
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }, []);

  // Handle receiving ICE candidate
  const handleReceiveCandidate = useCallback(async (candidate) => {
    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }, []);

  // Handle incoming WebRTC signaling messages
  useEffect(() => {
    if (!lastMessage || !isCallActive) return;

    try {
      const msg = JSON.parse(lastMessage);

      if (msg.type === 'webrtc-offer') {
        handleReceiveOffer(msg.offer);
      } else if (msg.type === 'webrtc-answer') {
        handleReceiveAnswer(msg.answer);
      } else if (msg.type === 'webrtc-candidate') {
        handleReceiveCandidate(msg.candidate);
      }
    } catch (error) {
      console.error('Error handling WebRTC message:', error);
    }
  }, [lastMessage, isCallActive, handleReceiveOffer, handleReceiveAnswer, handleReceiveCandidate]);

  const startCall = async () => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      peerConnectionRef.current = new RTCPeerConnection(iceServers);

      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate && sendMessage) {
          sendMessage(JSON.stringify({
            type: 'webrtc-candidate',
            candidate: event.candidate
          }));
        }
      };

      // Create and send offer
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      if (sendMessage) {
        sendMessage(JSON.stringify({
          type: 'webrtc-offer',
          offer: offer
        }));
      }

      setIsCallActive(true);
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Failed to start video call. Please check camera/microphone permissions.');
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const endCall = () => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setIsCallActive(false);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  return {
    localVideoRef,
    remoteVideoRef,
    isCallActive,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
    startCall,
    endCall
  };
};
