import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../api';

export function useGroupAvailability(groupId, rangeStart, rangeEnd, stepMinutes = 30) {
  const [data, setData] = useState({ slots: [], memberCount: 0, stepMinutes });
  const [loading, setLoading] = useState(false);
  const argsRef = useRef({ groupId, rangeStart, rangeEnd, stepMinutes });

  useEffect(() => {
    argsRef.current = { groupId, rangeStart, rangeEnd, stepMinutes };
  }, [groupId, rangeStart, rangeEnd, stepMinutes]);

  const fetchNow = useCallback(async () => {
    const { groupId, rangeStart, rangeEnd, stepMinutes } = argsRef.current;
    if (!groupId || !rangeStart || !rangeEnd) return;
    const params = new URLSearchParams({
      start: rangeStart.toISOString(),
      end: rangeEnd.toISOString(),
      step: String(stepMinutes),
      _: String(Date.now()),
    });
    console.log('[avail][fetch] GET', `/api/groups/${groupId}/availability/?${params}`);
    setLoading(true);
    try {
      const res = await api.get(`/api/groups/${groupId}/availability/?${params.toString()}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      console.log('[avail][ok]', { memberCount: res.data?.memberCount, slots: res.data?.slots?.length });
      setData(res.data);
    } catch (e) {
      console.warn('[avail][err]', e?.message || e);
      setData({ slots: [], memberCount: 0, stepMinutes });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNow();
  }, [groupId, rangeStart?.toISOString(), rangeEnd?.toISOString(), stepMinutes, fetchNow]);

  return { data, loading, refresh: fetchNow };
}
