import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import api from '../api';
import ScheduleBoard from '../components/ScheduleBoard';
import { useAuth } from '../auth/AuthContext';
import { usePopup } from '../popup/PopupContext';
import { useScheduleSocket } from '../hooks/useScheduleSocket';
import styles from '../styles/Group.module.css';

function toDatetimeLocal(d) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
}

function overlaps(evStart, evEnd, slotStart, slotEnd) {
  return !(evEnd <= slotStart || evStart >= slotEnd);
}

export default function Group() {
  const { id } = useParams();
  const { isAuthLoaded, user, accessToken } = useAuth();

  const [accessStatus, setAccessStatus] = useState('loading');
  const [denyCode, setDenyCode] = useState(null);

  const [groupName, setGroupName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [userSchedules, setUserSchedules] = useState([]);
  const [membershipId, setMembershipId] = useState(null);
  const [activeScheduleId, setActiveScheduleId] = useState(null);

  const [activeCount, setActiveCount] = useState(1);
  const [totalMembers, setTotalMembers] = useState(1);
  const [missingCount, setMissingCount] = useState(0);
  const [minRequired, setMinRequired] = useState(1);

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [availabilityNonce, setAvailabilityNonce] = useState(0);

  const [memberships, setMemberships] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [rangeInfo, setRangeInfo] = useState(null);
  const [overlayFreeSet, setOverlayFreeSet] = useState(new Set());

  const { openPopup } = usePopup();
  const wsRef = useRef(null);
  const tokenRef = useRef(null);
  const scheduleEventsCache = useRef(new Map());
  const dropdownRef = useRef(null);

  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);

  useEffect(() => {
    if (!id || !isAuthLoaded) return;
    let alive = true;
    (async () => {
      try {
        await api.get(`/api/groups/${id}/`);
        if (alive) setAccessStatus('ok');
      } catch (err) {
        if (!alive) return;
        const code = err?.response?.status || 403;
        setDenyCode(code);
        setAccessStatus('forbidden');
      }
    })();
    return () => { alive = false; };
  }, [id, isAuthLoaded]);

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
        setTotalMembers(membersRes.data.length || 1);
        const list = membersRes.data.map(m => ({
          membershipId: m.id,
          userId: m.user.id,
          email: (m.user.email || '').toLowerCase(),
          name: m.user.display_name || m.user.email || 'User',
          activeScheduleId: m.active_schedule,
          isSelf: m.user.id === user.id
        }));
        setMemberships(list);
      } catch (err) {
        console.error('Failed to load group data:', err);
      }
    }
    if (user && isAuthLoaded && accessStatus === 'ok') fetchAll();
  }, [id, user, isAuthLoaded, accessStatus]);

  useEffect(() => {
    if (!id || !isAuthLoaded || !tokenRef.current) return;
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const ws = new WebSocket(`${scheme}://${host}/ws/groups/${id}/?token=${encodeURIComponent(tokenRef.current)}`);
    wsRef.current = ws;
    ws.onopen = () => {};
    ws.onclose = () => {};
    ws.onerror = () => {};
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const evt = data?.event || data;
        if (evt?.type === 'group_name_updated' && String(evt?.groupId) === String(id)) {
          setGroupName(evt.name);
        }
        if (evt?.type === 'availability_changed' && (!evt.groupId || String(evt.groupId) === String(id))) {
          setAvailabilityNonce(n => n + 1);
        }
      } catch {}
    };
    return () => { try { ws.close(1000, 'unmount'); } catch {} };
  }, [id, isAuthLoaded]);

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
    if (evt.type === 'deleted' && evt.id) {
      removeEvent(evt.id);
    } else {
      upsertEvent(evt);
    }
    setAvailabilityNonce(n => n + 1);
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
      setAvailabilityNonce(n => n + 1);
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

  const handleAvailabilityMeta = useCallback(({ activeCount, totalMembers, missingCount }) => {
    setActiveCount(activeCount || 0);
    setTotalMembers(totalMembers || 0);
    setMissingCount(missingCount || 0);
    const basis = Math.max(1, activeCount || 1);
    setMinRequired(m => Math.min(Math.max(1, m || 1), basis));
  }, []);

  const onRangeChangeExternal = useCallback((info) => {
    setRangeInfo(info);
  }, []);

  const selectedPlusMeMin = useMemo(() => 1 + selectedMemberIds.length, [selectedMemberIds.length]);

  useEffect(() => {
    if (!selectedMemberIds.length) {
      setOverlayFreeSet(new Set());
      return;
    }
    if (!rangeInfo || !activeScheduleId) {
      setOverlayFreeSet(new Set());
      return;
    }
    const selectedSchedules = [];
    const me = memberships.find(m => m.isSelf);
    if (!me || !me.activeScheduleId) {
      setOverlayFreeSet(new Set());
      return;
    }
    selectedSchedules.push(me.activeScheduleId);
    for (const mid of selectedMemberIds) {
      const m = memberships.find(x => x.membershipId === mid);
      if (m && m.activeScheduleId) selectedSchedules.push(m.activeScheduleId);
    }
    async function ensureScheduleEvents(scheduleId) {
      if (scheduleEventsCache.current.has(scheduleId)) return scheduleEventsCache.current.get(scheduleId);
      try {
        const res = await api.get(`/api/schedules/${scheduleId}/events/`);
        const formatted = res.data.map(e => ({
          start: new Date(e.start),
          end: new Date(e.end),
        }));
        scheduleEventsCache.current.set(scheduleId, formatted);
        return formatted;
      } catch {
        scheduleEventsCache.current.set(scheduleId, []);
        return [];
      }
    }
    (async () => {
      const perSched = [];
      for (const sid of selectedSchedules) {
        const evts = await ensureScheduleEvents(sid);
        perSched.push(evts);
      }
      const start = new Date(rangeInfo.start);
      const end = new Date(rangeInfo.end);
      const step = Number(rangeInfo.stepMinutes || 30);
      const result = new Set();
      let cursor = start;
      while (cursor < end) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(Math.min(end.getTime(), cursor.getTime() + step * 60 * 1000));
        let allFree = true;
        for (const evts of perSched) {
          let busy = false;
          for (const ev of evts) {
            if (overlaps(ev.start, ev.end, slotStart, slotEnd)) {
              busy = true;
              break;
            }
          }
          if (busy) {
            allFree = false;
            break;
          }
        }
        if (allFree) {
          result.add(slotStart.getTime());
        }
        cursor = slotEnd;
      }
      setOverlayFreeSet(result);
    })();
  }, [selectedMemberIds, memberships, activeScheduleId, rangeInfo]);

  useEffect(() => {
    const min = selectedPlusMeMin;
    setMinRequired(prev => Math.max(min, prev));
  }, [selectedPlusMeMin]);

  useEffect(() => {
    function onDocClick(e) {
      if (!dropdownRef.current) return;
      if (dropdownRef.current.contains(e.target)) return;
      setDropdownOpen(false);
    }
    if (dropdownOpen) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [dropdownOpen]);

  if (accessStatus === 'loading') return null;
  if (accessStatus === 'forbidden') {
    return <Navigate to="/error" replace state={{ code: denyCode, resource: 'group', id }} />;
  }

  const others = memberships.filter(m => !m.isSelf).map(m => ({
    ...m,
    disabled: !m.activeScheduleId
  }));
  const selectedSet = new Set(selectedMemberIds);

  return (
    <div>
      {isAdmin && (
        <button
          onClick={() =>
            openPopup('add_members', {
              route: id,
              onSuccess: () => {
                setAvailabilityNonce(n => n + 1);
              }
            })
          }
        >
          Add members
        </button>
      )}

      <div className={styles.headerRow}>
        {isAdmin && editingName ? (
          <>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className={styles.nameInput}
            />
            <button onClick={handleNameSave} disabled={savingName}>
              {savingName ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setEditingName(false)}
              disabled={savingName}
              className={styles.linkBtn}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <h2 className={styles.title}>{groupName}</h2>
            {isAdmin && <button onClick={() => setEditingName(true)} className={styles.linkBtn}>Edit</button>}
          </>
        )}
      </div>

      <div className={styles.controlsRow}>
        <div className={styles.filterBlock} ref={dropdownRef}>
          <label className={styles.label}>Filter by members</label>
          <button
            className={styles.dropdownTrigger}
            onClick={() => setDropdownOpen(v => !v)}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            {selectedMemberIds.length === 0 ? 'None selected' : `${selectedMemberIds.length} selected`}
            <span className={styles.caret}>▾</span>
          </button>
          {dropdownOpen && (
            <div className={styles.dropdownPanel} role="listbox" aria-multiselectable="true">
              {others.map(m => (
                <label key={m.membershipId} className={`${styles.option} ${m.disabled ? styles.disabled : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedSet.has(m.membershipId)}
                    disabled={m.disabled}
                    onChange={(e) => {
                      const idv = m.membershipId;
                      setSelectedMemberIds(prev => {
                        const s = new Set(prev);
                        if (s.has(idv)) s.delete(idv);
                        else s.add(idv);
                        return Array.from(s);
                      });
                    }}
                  />
                  <span className={styles.optionText}>
                    {m.name}{m.disabled ? ' (no schedule)' : ''}
                  </span>
                </label>
              ))}
            </div>
          )}
          {selectedMemberIds.length > 0 && (
            <div className={styles.chips}>
              {selectedMemberIds.map(mid => {
                const m = others.find(x => x.membershipId === mid);
                if (!m) return null;
                return (
                  <span key={mid} className={styles.chip}>
                    {m.name}
                    <button
                      className={styles.chipX}
                      onClick={() => setSelectedMemberIds(prev => prev.filter(x => x !== mid))}
                      aria-label={`Remove ${m.name}`}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.sliderBlock}>
          <label htmlFor="min-members" className={styles.label}>Min Members Free</label>
          <div className={styles.sliderRow}>
            <input
              id="min-members"
              type="range"
              min={selectedPlusMeMin}
              max={Math.max(selectedPlusMeMin, Math.max(1, activeCount || 1))}
              value={Math.max(minRequired, selectedPlusMeMin)}
              onChange={(e) => setMinRequired(parseInt(e.target.value, 10))}
              className={styles.slider}
            />
            <span className={styles.count}>
              {Math.max(minRequired, selectedPlusMeMin)} / {Math.max(selectedPlusMeMin, Math.max(1, activeCount || 1))}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.row}>
        <label htmlFor="schedule-select" className={styles.label}>Active Schedule</label>
        <select
          id="schedule-select"
          value={activeScheduleId || 'none'}
          onChange={handleScheduleChange}
          disabled={!membershipId || userSchedules.length === 0}
          className={styles.select}
        >
          <option value="none">None</option>
          {userSchedules.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.calendarWrap}>
        <ScheduleBoard
          scheduleId={activeScheduleId}
          showCreateButton
          groupId={id}
          highlightMinAvailable={Math.max(minRequired, selectedPlusMeMin)}
          stepMinutes={30}
          onAvailabilityMeta={handleAvailabilityMeta}
          onRequestCreate={() => {
            if (!activeScheduleId) return;
            openPopup('create_event', {
              route: `/api/schedules/${activeScheduleId}/events/`,
              onSuccess: (eventData) => {
                upsertEvent(eventData);
                try { sendMessage(eventData); } catch {}
                setAvailabilityNonce(n => n + 1);
              }
            });
          }}
          onRequestEdit={(event) => {
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
                if (action === 'delete') removeEvent(event.id);
                else upsertEvent(eventData);
                try { sendMessage(eventData); } catch {}
                setAvailabilityNonce(n => n + 1);
              }
            });
          }}
          events={events}
          refreshAvailability={availabilityNonce}
          overlayFreeSet={overlayFreeSet}
          onRangeChangeExternal={onRangeChangeExternal}
          showLegend={false}
        />
      </div>
    </div>
  );
}
