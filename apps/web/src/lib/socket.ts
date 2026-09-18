/**
 * Client Socket.IO utility
 */

import { io, type Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Get or create authenticated Socket.IO client instance
 */
export function getSocket(token?: string): Socket {
  if (socketInstance && (!token || socketInstance.connected)) {
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
  }

  socketInstance = io(SOCKET_URL, {
    auth: {
      token: token || '',
    },
    transports: ['websocket', 'polling'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socketInstance;
}

/**
 * Disconnect and cleanup active socket
 */
export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
