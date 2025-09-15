import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import ScheduleBoard from '../components/ScheduleBoard';
import { usePopup } from '../popup/PopupContext';
import { useAuth } from '../auth/AuthContext';
import { useScheduleSocket } from '../hooks/useScheduleSocket';

function toDatetimeLocal(d) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
}

export default function Schedule() {
  const { id } = useParams();
  const { openPopup } = usePopup();
  const { accessToken, isAuthLoaded } = useAuth();

  const [scheduleName, setScheduleName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [loadingName, setLoadingName] = useState(true);

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    async function fetchSchedule() {
      setLoadingName(true);
      try {
        const res = await api.get(`/api/schedules/${id}/`);
        setScheduleName(res.data?.name || 'Untitled');
      } catch {
        setScheduleName('Untitled');
      } finally {
        setLoadingName(false);
      }
    }
    async function fetchEvents() {
      setLoadingEvents(true);
      try {
        const res = await api.get(`/api/schedules/${id}/events/`);
        const formatted = res.data.map((evt) => ({
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
    }
    if (id) {
      fetchSchedule();
      fetchEvents();
    }
  }, [id]);

  const handleNameSave = async () => {
    if (!scheduleName.trim()) return;
    setSavingName(true);
    try {
      await api.patch(`/api/schedules/${id}/`, { name: scheduleName });
      setEditingName(false);
    } catch {
      alert('Failed to save name');
    } finally {
      setSavingName(false);
    }
  };

  const upsertEvent = useCallback((incoming) => {
    if (!incoming) return;
    setEvents((prev) => {
      const normalized = {
        ...incoming,
        start: new Date(incoming.start),
        end: new Date(incoming.end),
        title: incoming.title || 'Event',
      };
      const idx = prev.findIndex((e) => e.id === normalized.id);
      if (idx === -1) return [...prev, normalized];
      const copy = prev.slice();
      copy[idx] = { ...copy[idx], ...normalized };
      return copy;
    });
  }, []);

  const removeEvent = useCallback((idToRemove) => {
    setEvents((prev) => prev.filter((e) => e.id !== idToRemove));
  }, []);

  const onSocketEvent = useCallback((evt) => {
    // If your backend includes a type, you can branch here. Otherwise, treat as upsert.
    // Example:
    // if (evt.type === 'deleted') removeEvent(evt.id); else upsertEvent(evt);
    upsertEvent(evt);
  }, [upsertEvent]);

  const { sendMessage } = useScheduleSocket(id, onSocketEvent, accessToken, isAuthLoaded);

  const handleCreate = () => {
    if (!id) return;
    openPopup('create_event', {
      route: `/api/schedules/${id}/events/`,
      onSuccess: (eventData, action) => {
        upsertEvent(eventData);
        try { sendMessage(eventData); } catch {}
      },
    });
  };

  const handleEdit = (evt) => {
    if (!id || !evt?.id) return;
    const dataForForm = {
      ...evt,
      start: toDatetimeLocal(evt.start),
      end: toDatetimeLocal(evt.end),
      title: evt.title || 'Event',
    };
    openPopup('edit_event', {
      route: `/api/schedules/${id}/events/${evt.id}/`,
      data: dataForForm,
      onSuccess: (eventData, action) => {
        if (action === 'delete') {
          removeEvent(evt.id);
        } else {
          upsertEvent(eventData);
        }
        try { sendMessage(eventData); } catch {}
      },
    });
  };

  if (loadingEvents) return <p>Loading events…</p>;

  return (
    <>
      <div>
        {editingName ? (
          <>
            <input
              type="text"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
            />
            <button onClick={handleNameSave} disabled={savingName}>
              {savingName ? 'Saving...' : 'Save'}
            </button>
          </>
        ) : (
          <>
            <h2>{loadingName ? 'Loading…' : scheduleName}</h2>
            <button onClick={() => setEditingName(true)}>Edit</button>
          </>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <ScheduleBoard
          scheduleId={id}
          showCreateButton
          stepMinutes={30}
          onRequestCreate={handleCreate}
          onRequestEdit={handleEdit}
          events={events}
        />
      </div>
    </>
  );
}
