collaborative-canvas/
├── backend/
│ ├── app/
│ │ ├── api/
│ │ │ └── routes/
│ │ │ └── auth.py # Authentication endpoints
│ │ ├── core/
│ │ │ └── security.py # JWT & security utilities
│ │ ├── models/
│ │ │ └── user.py # User model
│ │ ├── websocket/
│ │ │ └── manager.py # WebSocket connection manager
│ │ ├── database.py # Database models & connection
│ │ └── main.py # FastAPI app entry point
│ ├── tests/
│ │ └── load_test.py # Performance testing scripts
│ ├── .env.example # Environment variables template
│ ├── .gitignore
│ └── requirements.txt # Python dependencies
├── frontend/
│ ├── public/
│ ├── src/
│ │ ├── components/
│ │ │ ├── Canvas.js # Main drawing canvas
│ │ │ ├── Canvas.css
│ │ │ ├── LoginForm.js # User login
│ │ │ ├── LoginForm.css
│ │ │ ├── RegisterForm.js # User registration
│ │ │ ├── RegisterForm.css
│ │ │ ├── RoomList.js # Room management
│ │ │ └── RoomList.css
│ │ ├── context/
│ │ │ └── WebSocketContext.js # WebSocket state management
│ │ ├── App.js # Main app component
│ │ ├── App.css
│ │ ├── index.js # React entry point
│ │ └── index.css
│ ├── .env.example # Environment variables template
│ ├── .gitignore
│ ├── package.json # Node dependencies
│ └── package-lock.json
├── docs/
│ ├── screenshots/ # Demo screenshots
│ ├── API.md # API documentation
│ ├── PERFORMANCE.md # Performance analysis
│ └── USER_GUIDE.md # User guide
└── README.md # Main documentation