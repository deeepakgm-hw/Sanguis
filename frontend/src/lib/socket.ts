import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth.store";

let socket: Socket | null = null;

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://localhost:5000";

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  const token = useAuthStore.getState().accessToken;

  if (!socket && token) {
    socket = io(BACKEND_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
    });

    socket.on("connect", () => {
      console.log("⚡ Socket.IO connected:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("⚡ Socket.IO disconnected");
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
