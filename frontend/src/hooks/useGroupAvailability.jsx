import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../api';

export function useGroupAvailability(groupId, rangeStart, rangeEnd, stepMinutes = 30, { mode = 'active_only', minPeople = 0 } = {}) {
  const [data, setData] = useState({ slots: [], activeCount: 0, totalMembers: 0, missingCount: 0, stepMinutes, mode, minPeople });
  const [loading, setLoading] = useState(false);
  const argsRef = useRef({ groupId, rangeStart, rangeEnd, stepMinutes, mode, minPeople });

  useEffect(() => {
    argsRef.current = { groupId, rangeStart, rangeEnd, stepMinutes, mode, minPeople };
  }, [groupId, rangeStart, rangeEnd, stepMinutes, mode, minPeople]);

  const fetchNow = useCallback(async () => {
    const { groupId, rangeStart, rangeEnd, stepMinutes, mode, minPeople } = argsRef.current;
    if (!groupId || !rangeStart || !rangeEnd) return;
    const params = new URLSearchParams({
      start: rangeStart.toISOString(),
      end: rangeEnd.toISOString(),
      step: String(stepMinutes),
      mode,
      min_people: String(minPeople),
      _: String(Date.now()),
    });
    setLoading(true);
    try {
      const res = await api.get(`/api/groups/${groupId}/availability/?${params.toString()}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      setData(res.data);
    } catch {
      setData({ slots: [], activeCount: 0, totalMembers: 0, missingCount: 0, stepMinutes, mode, minPeople });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNow();
  }, [groupId, rangeStart?.toISOString(), rangeEnd?.toISOString(), stepMinutes, mode, minPeople, fetchNow]);

  return { data, loading, refresh: fetchNow };
}
