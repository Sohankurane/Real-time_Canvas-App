import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for LiveCaptions component
 * Handles speech recognition and caption management
 */
export const useLiveCaptions = (username, isEnabled) => {
  const [captions, setCaptions] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!isEnabled) return;

    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API is not supported in this browser');
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        }
        // Note: We're only using final transcripts, interim results are ignored
      }

      if (finalTranscript) {
        setCaptions(prev => [
          ...prev,
          {
            username: username || 'You',
            text: finalTranscript.trim(),
            timestamp: new Date().toISOString()
          }
        ]);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Restart if no speech detected
        if (isListening) {
          try {
            recognition.start();
          } catch (e) {
            // Ignore if already started
          }
        }
      }
    };

    recognition.onend = () => {
      // Restart if still listening
      if (isListening) {
        try {
          recognition.start();
        } catch (e) {
          // Ignore if already started
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isEnabled, username, isListening]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };

  return {
    captions,
    isListening,
    toggleListening
  };
};
