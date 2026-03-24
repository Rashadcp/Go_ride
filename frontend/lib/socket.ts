import { io } from "socket.io-client";

// Derive socket host from the API host; fall back to the running backend port (5001)
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001/api";
const SOCKET_URL = apiUrl.replace(/\/api\/?$/, "");

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
});

export const connectSocket = () => {
    if (!socket.connected) {
        socket.connect();
    }
};

export const disconnectSocket = () => {
    if (socket.connected) {
        socket.disconnect();
    }
};
