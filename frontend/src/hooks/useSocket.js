import { useContext } from 'react';
import { SocketContext } from '../context/SocketContext.jsx';

/**
 * Hook to consume SocketContext.
 * Provides the active socket client and connection status (isConnected).
 */
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
export default useSocket;
