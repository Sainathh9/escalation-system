import { useEffect, useRef } from 'react';
import { useSocket } from './useSocket.js';

/**
 * Safely bind and unbind a Socket.IO event listener.
 * Employs a mutable ref to hold the callback, eliminating duplicate listener
 * registrations during component updates or layout changes.
 * 
 * @param {string} eventName - The name of the event to listen for.
 * @param {Function} callback - The event handler function.
 */
export const useSocketEvent = (eventName, callback) => {
  const { socket } = useSocket();
  const callbackRef = useRef(callback);

  // 1️⃣ Keep the callback ref updated with the latest function version
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 2️⃣ Manage the event subscription life-cycle
  useEffect(() => {
    if (!socket) return;

    const eventHandler = (payload) => {
      if (callbackRef.current) {
        callbackRef.current(payload);
      }
    };

    // Bind event
    socket.on(eventName, eventHandler);

    // Unbind event on unmount or socket change
    return () => {
      socket.off(eventName, eventHandler);
    };
  }, [eventName, socket]);
};

export default useSocketEvent;
