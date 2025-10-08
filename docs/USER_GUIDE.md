## User Guide

### Getting Started

#### 1. Registration \& Login

- **Register:** Click "Register" on the welcome screen, enter your full name, username, and password. After successful registration, you'll be logged in automatically.
- **Login:** If you already have an account, enter your username and password on the login screen.


#### 2. Room Management

After logging in, you'll see the **Room List** page.

**Available Actions:**

- **View Rooms:** All active rooms are displayed with their names and admin usernames.
- **Create Room:** Enter a room name in the input field and click "Create Room". You'll become the admin of this room.
- **Join Room:** Click "Join" next to any room to enter and start collaborating.
- **Delete Room:** (Admin only) If you created a room, you can delete it by clicking "Delete" next to it.


#### 3. Drawing Canvas Features

Once inside a room, you'll have access to the collaborative drawing canvas.

**Toolbar Options:**

- **Brush:** Freehand drawing tool (default)
- **Eraser:** Remove parts of the drawing
- **Rectangle:** Draw rectangular shapes
- **Ellipse:** Draw elliptical shapes
- **Text:** Add text to the canvas (click to place, type, and press Enter to confirm)
- **Undo:** Revert the last action
- **Redo:** Re-apply the last undone action

**Color Palette:**

- Select from 6 preset colors for drawing/shapes

**Thickness Selector:**

- Choose from 5 thickness levels (2px to 12px)

**Additional Features:**

- **Clear Canvas:** Remove all drawings (confirmation required)
- **Save Snapshot:** Manually save the current canvas state
- **Restore Snapshot:** Load the last saved snapshot
- **Active Users:** View list of all users currently in the room
- **User Cursors:** See real-time cursor positions of other users
- **Conflict Detection:** Get notified when multiple users draw in the same area simultaneously


#### 4. Real-Time Collaboration

- All drawing actions are instantly synchronized across all users in the room
- User presence indicators show who's active
- Live cursor tracking helps coordinate work
- Canvas state auto-saves periodically and on user actions


#### 5. Session Recovery

- If you disconnect and rejoin, the canvas state is automatically restored
- Historical snapshots ensure no work is lost


#### 6. Leaving a Room

- Click the "Leave Room" or "Back to Rooms" button to exit the canvas and return to the room list
- Your work is automatically saved

***

### Tips for Best Experience

- **Stable Connection:** Ensure a stable internet connection for smooth real-time updates
- **Browser Compatibility:** Use modern browsers (Chrome, Firefox, Edge, Safari)
- **Collaborative Etiquette:** Use the conflict alert feature to avoid overlapping work
- **Regular Snapshots:** Save snapshots frequently during complex work

***

### Troubleshooting

| :-------------------------------| :-------------------------------------------------------------------|
| **Issue**                       | **Solution**                                                        |
| :-------------------------------| :-------------------------------------------------------------------|
| Can't see other users' drawings | Check internet connection, refresh the page, rejoin the room        |
| Snapshot not loading            | Ensure you're in the correct room, check if snapshots exist         |
| Can't delete room               | Only the room admin can delete rooms                                |
| Login fails                     | Verify username/password, check if account exists                   |
| WebSocket connection error      | Backend server might be down, check backend is running on port 8000 |
| :-------------------------------| :-------------------------------------------------------------------|

***

Add this to your README. Next remaining item is **Demonstration Materials (demo video/screenshots)**. Would you like me to create a checklist/guide for recording a demo, or move to the **Performance Analysis** section?

