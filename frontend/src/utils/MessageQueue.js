// MessageQueue - FIFO queue for WebSocket messages during disconnection
// Stores messages when WebSocket is unavailable and replays them on reconnection

class MessageQueue {
  constructor(maxSize = 100) {
    this.queue = [];
    this.maxQueueSize = maxSize;
  }

  // Add message to queue with timestamp, Drops oldest message if queue is full
  enqueue(message) {
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('Message queue full, dropping oldest message');
      this.queue.shift();
    }
    
    this.queue.push({
      message,
      timestamp: Date.now(),
      retries: 0
    });
  }

  // Remove and return first message from queue
  dequeue() {
    return this.queue.shift();
  }

  // Get first message without removing it
  peek() {
    return this.queue[0];
  }

  // Check if queue is empty
  isEmpty() {
    return this.queue.length === 0;
  }

  // Get current queue size
  size() {
    return this.queue.length;
  }

  // Clear all messages from queue
  clear() {
    this.queue = [];
  }

  // Get copy of all messages (for debugging)
  getAllMessages() {
    return [...this.queue];
  }

  // Process queue with retry logic
  // sendFunction - Function to send each message
  async processQueue(sendFunction) {
    while (!this.isEmpty()) {
      const item = this.dequeue();
      
      try {
        await sendFunction(item.message);
        // Small delay between messages to prevent flooding
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        console.error('Failed to send queued message:', error);
        
        // Retry logic: put back if retries < 3
        if (item.retries < 3) {
          item.retries++;
          this.queue.unshift(item);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.error('Message dropped after 3 retries:', item.message);
        }
      }
    }
  }
}

export default MessageQueue;
