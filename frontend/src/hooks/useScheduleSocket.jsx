import { useEffect, useRef } from 'react';

export function useScheduleSocket(scheduleId, onEventReceived, accessToken, isAuthLoaded) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!scheduleId || !accessToken || !isAuthLoaded) return;

    const socket = new WebSocket(`ws://localhost:8080/ws/schedules/${scheduleId}/?token=${accessToken}`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("✅ WebSocket connected.");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event) {
          onEventReceived(data.event);
        }
      } catch (err) {
        console.error("❌ WebSocket JSON error:", err);
      }
    };

    socket.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
    };

    socket.onclose = (e) => {
      console.log(`🔌 WebSocket closed: ${e.code}`);
    };

    return () => {
      socket.close();
    };
  }, [scheduleId, onEventReceived, accessToken, isAuthLoaded]); // dependencies

  const sendEvent = (event) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event }));
    }
  };

  return { sendEvent };
}
