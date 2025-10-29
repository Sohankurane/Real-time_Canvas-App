import React, { useEffect, useState, useContext, useRef } from "react";
import { WebSocketContext } from "../context/WebSocketContext";
import "./LiveCaptions.css";

const speechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

export default function LiveCaptions({ roomId, username }) {
  const { sendMessage, lastMessage } = useContext(WebSocketContext);
  const [captions, setCaptions] = useState({});
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!speechRecognition) return;
    const recognition = new speechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let lastTranscript = "";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      lastTranscript = transcript.trim();
      if (lastTranscript.length > 0) {
        setCaptions((prev) => ({
          ...prev,
          [username]: lastTranscript,
        }));
        sendMessage({
          type: "caption",
          roomId,
          username,
          transcript: lastTranscript,
        });
      }
    };

    recognition.onend = () => {
      recognition.start();
    };

    recognition.start();
    return () => {
      recognition.onend = null;
      recognition.stop();
    };
  }, [roomId, username, sendMessage]);

  useEffect(() => {
    if (!lastMessage) return;
    let data;
    try {
      data = JSON.parse(lastMessage);
    } catch {
      return;
    }
    if (data.type === "caption" && data.roomId === roomId && data.username !== username && data.transcript) {
      setCaptions((prev) => ({
        ...prev,
        [data.username]: data.transcript,
      }));
    }
  }, [lastMessage, roomId, username]);

  if (!speechRecognition) return <></>;

  return (
    <div className="live-captions-ribbon">
      {Object.entries(captions)
        .filter(([user, txt]) => !!txt)
        .map(([user, txt]) => (
          <div key={user} className="live-caption">
            <span className="live-caption-user">{user}:</span>
            <span className="live-caption-text">{txt}</span>
          </div>
        ))}
    </div>
  );
}
