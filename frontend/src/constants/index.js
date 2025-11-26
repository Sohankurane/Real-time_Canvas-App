// API Configuration
export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
export const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:8000";

// Canvas Constants
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 700;

export const COLORS = ['#e53e3e', '#3182ce', '#38a169', '#f6ad55', '#2d3748', '#555'];

export const THICKNESS = [2, 4, 6, 8, 12];

export const TOOLS = [
  { key: 'brush', label: 'Brush' },
  { key: 'eraser', label: 'Eraser' },
  { key: 'rectangle', label: 'Rectangle' },
  { key: 'ellipse', label: 'Ellipse' },
  { key: 'text', label: 'Text' },
  { key: 'undo', label: 'Undo' }
];

export const CURSORS = {
  brush: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'>ircle cx='16' cy='16' r='8' fill='white' stroke='blue' stroke-width='3'/></svg>") 16 16, crosshair`,
  eraser: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect x='7' y='10' width='18' height='8' rx='4' fill='pink' stroke='gray' stroke-width='2'/></svg>") 16 14, pointer`,
  rectangle: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect x='8' y='8' width='16' height='10' stroke='red' fill='white' stroke-width='3'/></svg>") 16 16, crosshair`,
  ellipse: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><ellipse cx='16' cy='16' rx='8' ry='5' stroke='green' fill='white' stroke-width='3'/></svg>") 16 16, crosshair`,
  text: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><text x='4' y='22' font-size='18' font-family='Arial' fill='black'>T</text></svg>") 6 22, text`,
  undo: 'crosshair'
};

// WebSocket Events
export const WS_EVENTS = {
  INIT: 'init',
  DRAW: 'draw',
  BRUSH: 'brush',
  ERASER: 'eraser',
  RECTANGLE: 'rectangle',
  ELLIPSE: 'ellipse',
  TEXT: 'text',
  UNDO: 'undo',
  CLEAR: 'clear',
  CURSOR: 'cursor',
  USER_LEFT: 'user_left',
  CHAT: 'chat',
  SAVE_SNAPSHOT: 'save_snapshot',
  RESTORE_SNAPSHOT: 'restore_snapshot',
  GET_SNAPSHOTS: 'get_snapshots',
  SNAPSHOTS_HISTORY: 'snapshots_history',
  SNAPSHOT_RESTORED: 'snapshot_restored',
  DELETE_ROOM: 'delete_room'
};

// View States
export const VIEWS = {
  LOGIN: 'login',
  REGISTER: 'register',
  ROOM_LIST: 'room',
  CANVAS: 'canvas'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user'
};

// Debounce Delay
export const DEBOUNCE_DELAY = 24;

// History Limit
export const MAX_HISTORY = 500;
