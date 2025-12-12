// import { Server } from "socket.io";
// import { createServer } from "http";

// // If you are running this in a pure node environment without ESM support for top level,
// // you might need to use CommonJS (require). But assuming modern Node/ESM environment:

// const httpServer = createServer();
// const io = new Server(httpServer, {
//   cors: {
//     origin: "*", // Allow connections from anywhere for this demo
//     methods: ["GET", "POST"]
//   }
// });

// // -- Game State --
// // Map to store active socket connections
// const socketPlayers = new Map();
// // Persistent storage of players by username
// const persistentPlayers = new Map();

// function broadcastLeaderboard() {
//   const allPlayers = Array.from(persistentPlayers.values())
//     .sort((a, b) => b.score - a.score)
//     .map((p, index) => ({ ...p, rank: index + 1 }));
  
//   io.emit("leaderboard_update", allPlayers);
// }

// // -- Socket Events --
// io.on("connection", (socket) => {
//   console.log(`New client connected: ${socket.id}`);

//   // Send current state immediately
//   broadcastLeaderboard();

//   socket.on("join", (userData) => {
//     const playerKey = userData.username;
    
//     // Check if player already exists (reconnecting)
//     let player = persistentPlayers.get(playerKey) || {
//       username: userData.username,
//       avatarUrl: userData.avatarUrl,
//       score: 0,
//       status: "Just Joined",
//       isBot: false
//     };
    
//     // Update avatar if provided
//     if (userData.avatarUrl) {
//       player.avatarUrl = userData.avatarUrl;
//     }
    
//     persistentPlayers.set(playerKey, player);
//     socketPlayers.set(socket.id, playerKey);
    
//     console.log(`Player joined: ${userData.username}`);
//     broadcastLeaderboard();
//   });

//   socket.on("update_progress", (data) => {
//     const playerKey = socketPlayers.get(socket.id);
//     if (playerKey) {
//       const player = persistentPlayers.get(playerKey);
//       if (player) {
//         persistentPlayers.set(playerKey, { ...player, ...data });
//         broadcastLeaderboard();
//       }
//     }
//   });

//   socket.on("disconnect", () => {
//     const playerKey = socketPlayers.get(socket.id);
//     if (playerKey) {
//       console.log(`Player disconnected: ${playerKey}`);
//       socketPlayers.delete(socket.id);
//       // Keep the player in persistentPlayers so they can reconnect with their progress
//     }
//   });
// });

// const PORT = 3000;
// httpServer.listen(PORT, () => {
//   console.log(`Socket.io server running on http://localhost:${PORT}`);
// });



// import { Server } from "socket.io";
// import { createServer } from "http";

// const httpServer = createServer();
// const io = new Server(httpServer, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });

// // -- Game State --
// const socketPlayers = new Map();
// const persistentPlayers = new Map();

// // -- Optimized Broadcast Function --
// function broadcastLeaderboard() {
//   // 1. Sort all players
//   const allPlayers = Array.from(persistentPlayers.values())
//     .sort((a, b) => b.score - a.score);

//   // 2. Optimization: Slice to get only Top 100
//   const topPlayers = allPlayers.slice(0, 100).map((p, index) => ({ 
//     ...p, 
//     rank: index + 1 
//   }));
  
//   // 3. Emit to everyone
//   // Using .volatile is safer for high-frequency updates (drops packets if client is lagging)
//   io.volatile.emit("leaderboard_update", topPlayers);
// }

// // -- The "Game Loop" --
// // Only send updates every 5 seconds (Throttling)
// setInterval(() => {
//   if (persistentPlayers.size > 0) {
//     broadcastLeaderboard();
//   }
// }, 5000);

// // -- Socket Events --
// io.on("connection", (socket) => {
//   // console.log(`New client connected: ${socket.id}`);

//   // Note: We REMOVED broadcastLeaderboard() from here. 
//   // The client will get the data in the next 5-second tick.

//   socket.on("join", (userData) => {
//     const playerKey = userData.username;
    
//     let player = persistentPlayers.get(playerKey) || {
//       username: userData.username,
//       avatarUrl: userData.avatarUrl,
//       score: 0,
//       status: "Just Joined",
//       isBot: false
//     };
    
//     if (userData.avatarUrl) {
//       player.avatarUrl = userData.avatarUrl;
//     }
    
//     persistentPlayers.set(playerKey, player);
//     socketPlayers.set(socket.id, playerKey);
    
//     // console.log(`Player joined: ${userData.username}`);
    
//     // REMOVED broadcastLeaderboard() from here
//   });

//   socket.on("update_progress", (data) => {
//     const playerKey = socketPlayers.get(socket.id);
//     if (playerKey) {
//       const player = persistentPlayers.get(playerKey);
//       if (player) {
//         // Just update the state; do not broadcast yet
//         persistentPlayers.set(playerKey, { ...player, ...data });
        
//         // REMOVED broadcastLeaderboard() from here
//       }
//     }
//   });

//   socket.on("disconnect", () => {
//     const playerKey = socketPlayers.get(socket.id);
//     if (playerKey) {
//       // console.log(`Player disconnected: ${playerKey}`);
//       socketPlayers.delete(socket.id);
//     }
//   });
// });

// const PORT = 3000;
// httpServer.listen(PORT, () => {
//   console.log(`Socket.io server running on http://localhost:${PORT}`);
// });

import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

// Serve static frontend build
app.use(express.static(path.join(__dirname, "dist")));

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// -- Game State --
const socketPlayers = new Map();
const persistentPlayers = new Map();

// -- Constants for Cleanup --
const PLAYER_TTL_MS = 5 * 60 * 60 * 1000; // 5 Hours in milliseconds
const CLEANUP_INTERVAL_MS = 60 * 1000;    // Run cleanup check every 1 minute

// -- Optimized Broadcast Function --
function broadcastLeaderboard() {
  // 1. Sort all players
  const allPlayers = Array.from(persistentPlayers.values())
    .sort((a, b) => b.score - a.score);

  // 2. Optimization: Slice to get only Top 100
  const topPlayers = allPlayers.slice(0, 100).map((p, index) => ({ 
    ...p, 
    rank: index + 1 
  }));
  
  // 3. Emit to everyone using volatile (droppable packets)
  io.volatile.emit("leaderboard_update", topPlayers);
}

// -- The "Game Loop" (Throttling) --
// Only send updates every 5 seconds
setInterval(() => {
  if (persistentPlayers.size > 0) {
    broadcastLeaderboard();
  }
}, 5000);

// -- The "Garbage Collector" (Memory Optimization) --
// Runs every minute to delete old players
setInterval(() => {
  const now = Date.now();
  let deletedCount = 0;

  for (const [key, player] of persistentPlayers) {
    // If player has a 'lastSeen' timestamp AND it's older than 5 hours
    if (player.lastSeen && (now - player.lastSeen > PLAYER_TTL_MS)) {
      persistentPlayers.delete(key);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`Cleanup: Removed ${deletedCount} inactive players from memory.`);
  }
}, CLEANUP_INTERVAL_MS);


// -- Socket Events --
io.on("connection", (socket) => {
  
  socket.on("join", (userData) => {
    const playerKey = userData.username;
    
    // Check if player already exists
    let player = persistentPlayers.get(playerKey) || {
      username: userData.username,
      avatarUrl: userData.avatarUrl,
      score: 0,
      status: "Just Joined",
      isBot: false
    };

    // IMPORTANT: Player is back online, remove the 'lastSeen' timestamp
    // so they don't get deleted while playing.
    delete player.lastSeen; 
    
    if (userData.avatarUrl) {
      player.avatarUrl = userData.avatarUrl;
    }
    
    persistentPlayers.set(playerKey, player);
    socketPlayers.set(socket.id, playerKey);
  });

  socket.on("update_progress", (data) => {
    const playerKey = socketPlayers.get(socket.id);
    if (playerKey) {
      const player = persistentPlayers.get(playerKey);
      if (player) {
        persistentPlayers.set(playerKey, { ...player, ...data });
        // Note: We do not broadcast here. The "Game Loop" handles it.
      }
    }
  });

  socket.on("disconnect", () => {
    const playerKey = socketPlayers.get(socket.id);
    if (playerKey) {
      const player = persistentPlayers.get(playerKey);
      
      // IMPORTANT: Don't delete immediately. 
      // Mark them with a timestamp so the Garbage Collector can find them later.
      if (player) {
        player.lastSeen = Date.now();
        persistentPlayers.set(playerKey, player);
      }

      socketPlayers.delete(socket.id);
    }
  });
});

// Fallback route for SPA (serve index.html for all unknown routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
  console.log(`Memory cleanup scheduled for inactive players > 5 hours.`);
});