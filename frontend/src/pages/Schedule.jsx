import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import MyCalendar from '../components/Calendar';
import { useScheduleSocket } from '../hooks/useScheduleSocket';
import { useAuth } from '../auth/AuthContext';
import { usePopup } from '../popup/PopupContext';

function Schedule() {
  const { id } = useParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const { accessToken, isAuthLoaded } = useAuth();
  const { openPopup } = usePopup();

  const onEventReceived = useCallback((newEvent) => {
    setEvents(prev => {
      if (prev.some(evt => evt.id === newEvent.id)) return prev;
      return [
        ...prev,
        {
          ...newEvent,
          start: new Date(newEvent.start),
          end: new Date(newEvent.end),
        }
      ];
    });
  }, []);

  const { sendEvent } = useScheduleSocket(id, onEventReceived, accessToken, isAuthLoaded);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await api.get(`/api/schedules/${id}/events/`);
        const formatted = res.data.map(evt => ({
          ...evt,
          start: new Date(evt.start),
          end: new Date(evt.end),
          title: evt.title || 'Event',
        }));
        setEvents(formatted);
      } catch (error) {
        alert(error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchSchedule() {
      try {
        const res = await api.get(`/api/schedules/${id}/`);
        setScheduleName(res.data.name || 'Untitled');
      } catch (err) {
        console.error('Failed to fetch schedule name:', err);
      }
    }

    fetchEvents();
    fetchSchedule();
  }, [id]);

  const handleNameSave = async () => {
    if (!scheduleName.trim()) return;
    setSavingName(true);
    try {
      await api.patch(`/api/schedules/${id}/`, { name: scheduleName });
      setEditingName(false);
    } catch (err) {
      alert('Failed to save name');
    } finally {
      setSavingName(false);
    }
  };

  const handleSuccess = (eventData, action) => {
    if (action === 'create') {
      setEvents(prev => [...prev, {
        ...eventData,
        start: new Date(eventData.start),
        end: new Date(eventData.end)
      }]);
      sendEvent(eventData);
    } else if (action === 'edit') {
      setEvents(prev => prev.map(evt =>
        evt.id === eventData.id
          ? { ...eventData, start: new Date(eventData.start), end: new Date(eventData.end) }
          : evt
      ));
    } else if (action === 'delete') {
      setEvents(prev => prev.filter(evt => evt.id !== eventData.id));
    }
  };

  const handleCreate = () => {
    openPopup('create_event', {
      route: `/api/schedules/${id}/events/`,
      onSuccess: handleSuccess
    });
  };

  const handleEdit = (event) => {
    openPopup('edit_event', {
      route: `/api/schedules/${id}/events/${event.id}/`,
      data: event,
      onSuccess: handleSuccess
    });
  };

  if (loading) return <p>Loading events...</p>;

  return (
    <>
      <div className="schedule-header">
        {editingName ? (
          <>
            <input
              className="schedule-name-input"
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
            <h2 className="schedule-title">{scheduleName}</h2>
            <button onClick={() => setEditingName(true)}>Edit</button>
          </>
        )}
      </div>
      <div className="schedule-controls">
        <button className="link" onClick={handleCreate}>Create</button>
      </div>
      <MyCalendar
        events={events}
        onSelectEvent={handleEdit}
      />
    </>
  );
}

export default Schedule;
