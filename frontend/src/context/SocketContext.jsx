import { createContext, useEffect, useState, useContext } from 'react';
import { useAuth } from './AuthContext.jsx';
import { connectSocket, disconnectSocket, getSocket } from '../services/socketService.js';

export const SocketContext = createContext({
  socket: null,
  isConnected: false,
});

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      // Tear down connection if user logs out
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    // Connect socket lazily
    const activeSocket = connectSocket(token);
    setSocket(activeSocket);

    if (activeSocket) {
      setIsConnected(activeSocket.connected);

      const handleConnect = () => setIsConnected(true);
      const handleDisconnect = () => setIsConnected(false);

      activeSocket.on('connect', handleConnect);
      activeSocket.on('disconnect', handleDisconnect);

      // Clean up local listeners on unmount/reconnect
      return () => {
        activeSocket.off('connect', handleConnect);
        activeSocket.off('disconnect', handleDisconnect);
      };
    }
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
