import { io, Socket } from "socket.io-client";
import { LeaderboardEntry, User } from "../types";

// Ensure this matches your server URL.
// In production, this should be your deployed server URL
const SERVER_URL = (import.meta as any).env.VITE_SERVER_URL || "http://localhost:3000";

export class SocketService {
  private socket: Socket | null = null;

  connect(user: User, onLeaderboardUpdate: (data: LeaderboardEntry[]) => void) {
    if (this.socket?.connected) return;

    this.socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'], // fallback
    });

    this.socket.on("connect", () => {
      console.log("Connected to leaderboard server", this.socket?.id);
      
      // Join game immediately upon connection
      this.socket?.emit("join", {
        username: user.username,
        avatarUrl: user.avatarUrl
      });
    });

    this.socket.on("leaderboard_update", (data: LeaderboardEntry[]) => {
      onLeaderboardUpdate(data);
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });
  }

  updateProgress(score: number, status: string) {
    if (this.socket?.connected) {
      this.socket.emit("update_progress", { score, status });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();