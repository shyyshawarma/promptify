import { Server } from "socket.io";
import { createServer } from "http";

// If you are running this in a pure node environment without ESM support for top level,
// you might need to use CommonJS (require). But assuming modern Node/ESM environment:

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow connections from anywhere for this demo
    methods: ["GET", "POST"]
  }
});

// -- Game State --
// Map to store active socket connections
const socketPlayers = new Map();
// Persistent storage of players by username
const persistentPlayers = new Map();

function broadcastLeaderboard() {
  const allPlayers = Array.from(persistentPlayers.values())
    .sort((a, b) => b.score - a.score)
    .map((p, index) => ({ ...p, rank: index + 1 }));
  
  io.emit("leaderboard_update", allPlayers);
}

// -- Socket Events --
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Send current state immediately
  broadcastLeaderboard();

  socket.on("join", (userData) => {
    const playerKey = userData.username;
    
    // Check if player already exists (reconnecting)
    let player = persistentPlayers.get(playerKey) || {
      username: userData.username,
      avatarUrl: userData.avatarUrl,
      score: 0,
      status: "Just Joined",
      isBot: false
    };
    
    // Update avatar if provided
    if (userData.avatarUrl) {
      player.avatarUrl = userData.avatarUrl;
    }
    
    persistentPlayers.set(playerKey, player);
    socketPlayers.set(socket.id, playerKey);
    
    console.log(`Player joined: ${userData.username}`);
    broadcastLeaderboard();
  });

  socket.on("update_progress", (data) => {
    const playerKey = socketPlayers.get(socket.id);
    if (playerKey) {
      const player = persistentPlayers.get(playerKey);
      if (player) {
        persistentPlayers.set(playerKey, { ...player, ...data });
        broadcastLeaderboard();
      }
    }
  });

  socket.on("disconnect", () => {
    const playerKey = socketPlayers.get(socket.id);
    if (playerKey) {
      console.log(`Player disconnected: ${playerKey}`);
      socketPlayers.delete(socket.id);
      // Keep the player in persistentPlayers so they can reconnect with their progress
    }
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on http://localhost:${PORT}`);
});