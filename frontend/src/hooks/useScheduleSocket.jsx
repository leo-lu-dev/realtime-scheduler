import { useEffect, useRef } from 'react';

export function useScheduleSocket(scheduleId, onEventReceived, accessToken, isAuthLoaded) {
  const socketRef = useRef(null);
  const cbRef = useRef(onEventReceived);

  useEffect(() => {
    cbRef.current = onEventReceived;
  }, [onEventReceived]);

  useEffect(() => {
    if (!scheduleId || !accessToken || !isAuthLoaded) return;

    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const url = `${scheme}://${host}/ws/schedules/${scheduleId}/?token=${encodeURIComponent(accessToken)}`;

    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => console.log('[ws][schedule] open', scheduleId);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const evt = data?.event ?? data;
        if (evt && cbRef.current) cbRef.current(evt);
      } catch (err) {
        console.error('[ws][schedule] parse error', err);
      }
    };
    ws.onerror = (e) => console.error('[ws][schedule] error', e);
    ws.onclose = (e) => console.log('[ws][schedule] close', e.code, e.reason || '');

    return () => {
      try { ws.close(); } catch {}
    };
  }, [scheduleId, accessToken, isAuthLoaded]);

  const sendMessage = (eventObj) => {
    const s = socketRef.current;
    if (s && s.readyState === WebSocket.OPEN) {
      s.send(JSON.stringify({ event: eventObj }));
    }
  };

  return { sendMessage };
}
