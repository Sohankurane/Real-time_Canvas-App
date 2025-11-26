import { useState, useCallback, useContext } from 'react';
import { WebSocketContext } from '../../../context/WebSocketContext';
import { WS_EVENTS } from '../../../constants';

/**
 * Custom hook for canvas snapshot operations
 */
export const useCanvasSnapshots = (canvasRef, roomId, username) => {
  const [snapshots, setSnapshots] = useState([]);
  const { sendMessage, lastMessage } = useContext(WebSocketContext);

  // Listen for snapshot updates
  useState(() => {
    if (!lastMessage) return;

    try {
      const msg = JSON.parse(lastMessage);
      
      if (msg.type === WS_EVENTS.SNAPSHOTS_HISTORY) {
        setSnapshots(msg.snapshots || []);
      }
    } catch (error) {
      console.error('Error parsing snapshot message:', error);
    }
  }, [lastMessage]);

  // Load snapshots from server
  const loadSnapshots = useCallback(() => {
    if (sendMessage) {
      sendMessage(JSON.stringify({
        type: WS_EVENTS.GET_SNAPSHOTS
      }));
    }
  }, [sendMessage]);

  // Save current canvas as snapshot
  const handleSaveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const snapshotData = canvas.toDataURL('image/png');
      
      if (sendMessage) {
        sendMessage(JSON.stringify({
          type: WS_EVENTS.SAVE_SNAPSHOT,
          snapshot: snapshotData,
          username
        }));
      }

      alert('Snapshot saved successfully!');
    } catch (error) {
      console.error('Error saving snapshot:', error);
      alert('Failed to save snapshot');
    }
  }, [canvasRef, sendMessage, username]);

  // Restore a saved snapshot
  const handleRestoreSnapshot = useCallback((snapshotId) => {
    if (!snapshotId) return;

    if (window.confirm('Restore this snapshot? Current canvas will be replaced.')) {
      if (sendMessage) {
        sendMessage(JSON.stringify({
          type: WS_EVENTS.RESTORE_SNAPSHOT,
          snapshot_id: snapshotId,
          username
        }));
      }
    }
  }, [sendMessage, username]);

  return {
    snapshots,
    handleSaveSnapshot,
    handleRestoreSnapshot,
    loadSnapshots
  };
};
