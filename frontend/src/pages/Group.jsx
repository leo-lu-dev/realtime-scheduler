import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import ScheduleBoard from '../components/ScheduleBoard';
import { useAuth } from '../auth/AuthContext';
import { usePopup } from '../popup/PopupContext';
import { useScheduleSocket } from '../hooks/useScheduleSocket';

function toDatetimeLocal(d) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
}

export default function Group() {
  const { id } = useParams();
  const { isAuthLoaded, user, accessToken } = useAuth();

  const [groupName, setGroupName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [userSchedules, setUserSchedules] = useState([]);
  const [membershipId, setMembershipId] = useState(null);
  const [activeScheduleId, setActiveScheduleId] = useState(null);
  const [activeScheduleName, setActiveScheduleName] = useState('None');

  const [memberCount, setMemberCount] = useState(1);
  const [minRequired, setMinRequired] = useState(1);

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [availabilityNonce, setAvailabilityNonce] = useState(0);

  const { openPopup } = usePopup();
  const wsRef = useRef(null);
  const tokenRef = useRef(null);

  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [groupRes, membersRes, schedulesRes] = await Promise.all([
          api.get(`/api/groups/${id}/`),
          api.get(`/api/groups/${id}/members/`),
          api.get(`/api/schedules/`)
        ]);

        setGroupName(groupRes.data.name);
        const adminField = groupRes.data.admin;
        const adminId = typeof adminField === 'object' ? adminField?.id : adminField;
        setIsAdmin(user?.id === adminId);

        setUserSchedules(schedulesRes.data);

        const membership = membersRes.data.find(m => m.user.id === user.id);
        if (membership) {
          setMembershipId(membership.id);
          setActiveScheduleId(membership.active_schedule);
        }

        const cnt = membersRes.data.length || 1;
        setMemberCount(cnt);
        setMinRequired(prev => Math.min(prev || 1, cnt));
      } catch (err) {
        console.error('Failed to load group data:', err);
      }
    }
    if (user && isAuthLoaded) fetchAll();
  }, [id, user, isAuthLoaded]);

  useEffect(() => {
    if (!id || !isAuthLoaded || !tokenRef.current) return;
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const ws = new WebSocket(`${scheme}://${host}/ws/groups/${id}/?token=${encodeURIComponent(tokenRef.current)}`);
    wsRef.current = ws;

    ws.onopen = () => console.log('[ws][group] open', id);
    ws.onclose = (e) => console.log('[ws][group] close', id, e.code, e.reason || '');
    ws.onerror = (e) => console.log('[ws][group] error', id, e?.message || e);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const evt = data?.event || data;
        console.log('[ws][group] recv', evt);
        if (evt?.type === 'group_name_updated' && String(evt?.groupId) === String(id)) {
          setGroupName(evt.name);
        }
        if (evt?.type === 'availability_changed' && (!evt.groupId || String(evt.groupId) === String(id))) {
          setAvailabilityNonce(n => {
            const next = n + 1;
            console.log('[avail][nonce->]', next);
            return next;
          });
        }
      } catch (e) {
        console.warn('[ws][group] parse err', e?.message || e);
      }
    };

    return () => { try { ws.close(1000, 'unmount'); } catch {} };
  }, [id, isAuthLoaded]);

  useEffect(() => {
    async function fetchActiveName() {
      if (!activeScheduleId) { setActiveScheduleName('None'); return; }
      try {
        const res = await api.get(`/api/schedules/${activeScheduleId}/`);
        setActiveScheduleName(res.data?.name || 'Untitled');
      } catch { setActiveScheduleName('Untitled'); }
    }
    fetchActiveName();
  }, [activeScheduleId]);

  const loadEvents = useCallback(async (scheduleId) => {
    if (!scheduleId) { setEvents([]); return; }
    setLoadingEvents(true);
    try {
      const res = await api.get(`/api/schedules/${scheduleId}/events/`);
      const formatted = res.data.map(evt => ({
        ...evt,
        start: new Date(evt.start),
        end: new Date(evt.end),
        title: evt.title || 'Event',
      }));
      setEvents(formatted);
    } catch {
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    if (activeScheduleId) loadEvents(activeScheduleId);
    else setEvents([]);
  }, [activeScheduleId, loadEvents]);

  const upsertEvent = useCallback((incoming) => {
    if (!incoming) return;
    setEvents(prev => {
      const normalized = {
        ...incoming,
        start: new Date(incoming.start),
        end: new Date(incoming.end),
        title: incoming.title || 'Event',
      };
      const idx = prev.findIndex(e => e.id === normalized.id);
      if (idx === -1) return [...prev, normalized];
      const copy = prev.slice();
      copy[idx] = { ...copy[idx], ...normalized };
      return copy;
    });
  }, []);

  const removeEvent = useCallback((idToRemove) => {
    setEvents(prev => prev.filter(e => e.id !== idToRemove));
  }, []);

  const onScheduleSocketEvent = useCallback((evt) => {
    if (!evt) return;
    console.log('[ws][schedule->group] recv', evt);
    if (evt.type === 'deleted' && evt.id) {
      removeEvent(evt.id);
    } else {
      upsertEvent(evt);
    }
    setAvailabilityNonce(n => {
      const next = n + 1;
      console.log('[avail][nonce->]', next);
      return next;
    });
  }, [removeEvent, upsertEvent]);

  const { sendMessage } = useScheduleSocket(
    activeScheduleId,
    onScheduleSocketEvent,
    accessToken,
    isAuthLoaded
  );

  const handleScheduleChange = async (e) => {
    const newId = e.target.value === 'none' ? null : e.target.value;
    if (!membershipId) return;
    const prev = activeScheduleId;
    setActiveScheduleId(newId);
    try {
      await api.patch(`/api/members/${membershipId}/`, { active_schedule: newId });
      if (newId) await loadEvents(newId);
      else setEvents([]);
      setAvailabilityNonce(n => {
        const next = n + 1;
        console.log('[avail][nonce cause switch->]', next);
        return next;
      });
    } catch {
      setActiveScheduleId(prev);
      alert('Failed to update active schedule.');
    }
  };

  const handleNameSave = async () => {
    if (!groupName.trim()) return;
    setSavingName(true);
    try {
      await api.patch(`/api/groups/${id}/`, { name: groupName });
      setEditingName(false);
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: { type: 'group_name_updated', groupId: id, name: groupName } }));
      }
    } catch {
      alert('Failed to save name');
    } finally {
      setSavingName(false);
    }
  };

  const handleCreate = () => {
    if (!activeScheduleId) return;
    openPopup('create_event', {
      route: `/api/schedules/${activeScheduleId}/events/`,
      onSuccess: (eventData) => {
        upsertEvent(eventData);
        try { sendMessage(eventData); } catch {}
        setAvailabilityNonce(n => {
          const next = n + 1;
          console.log('[avail][nonce cause create->]', next);
          return next;
        });
      }
    });
  };

  const handleEdit = (event) => {
    if (!activeScheduleId || !event?.id) return;
    const dataForForm = {
      ...event,
      title: event.title || 'Event',
      start: toDatetimeLocal(event.start),
      end: toDatetimeLocal(event.end),
    };
    openPopup('edit_event', {
      route: `/api/schedules/${activeScheduleId}/events/${event.id}/`,
      data: dataForForm,
      onSuccess: (eventData, action) => {
        if (action === 'delete') {
          removeEvent(event.id);
        } else {
          upsertEvent(eventData);
        }
        try { sendMessage(eventData); } catch {}
        setAvailabilityNonce(n => {
          const next = n + 1;
          console.log('[avail][nonce cause edit/delete->]', next);
          return next;
        });
      }
    });
  };

  return (
    <div>
      {isAdmin && (
        <button
          onClick={() =>
            openPopup('add_members', {
              route: id,
              onSuccess: ({ created, skipped }) => {
                console.log('Added:', created, 'Skipped:', skipped);
              }
            })
          }
        >
          Add members
        </button>
      )}

      <div style={{ marginTop: 12, marginBottom: 12 }}>
        {isAdmin && editingName ? (
          <>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <button onClick={handleNameSave} disabled={savingName}>
              {savingName ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setEditingName(false)}
              disabled={savingName}
              style={{ marginLeft: 8 }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <h2 style={{ display: 'inline-block', marginRight: 12 }}>{groupName}</h2>
            {isAdmin && <button onClick={() => setEditingName(true)}>Edit</button>}
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <label htmlFor="min-members">Min members free:</label>
        <input
          id="min-members"
          type="range"
          min={1}
          max={memberCount}
          value={minRequired}
          onChange={(e) => setMinRequired(parseInt(e.target.value, 10))}
          style={{ width: 220 }}
        />
        <span>{minRequired} / {memberCount}</span>
      </div>

      <div>
        <label htmlFor="schedule-select">Active Schedule:</label>
        <select
          id="schedule-select"
          value={activeScheduleId || 'none'}
          onChange={handleScheduleChange}
          disabled={!membershipId || userSchedules.length === 0}
        >
          <option value="none">None</option>
          {userSchedules.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <span style={{ marginLeft: 12 }}>
          {activeScheduleId ? `(${activeScheduleName})` : '(None selected)'}
        </span>
      </div>

      <div style={{ marginTop: 12 }}>
        <ScheduleBoard
          scheduleId={activeScheduleId}
          showCreateButton
          groupId={id}
          highlightMinAvailable={minRequired}
          stepMinutes={30}
          onRequestCreate={handleCreate}
          onRequestEdit={handleEdit}
          events={events}
          refreshAvailability={availabilityNonce}
        />
      </div>
    </div>
  );
}
