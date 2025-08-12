import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import MyCalendar from './Calendar';
import { useScheduleSocket } from '../hooks/useScheduleSocket';
import { useAuth } from '../auth/AuthContext';
import { usePopup } from '../popup/PopupContext';

export default function ScheduleBoard({ scheduleId, showCreateButton = true }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const { accessToken, isAuthLoaded } = useAuth();
  const { openPopup } = usePopup();

  const onSocketEvent = useCallback((newEvent) => {
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

  const { sendMessage } = useScheduleSocket(scheduleId, onSocketEvent, accessToken, isAuthLoaded);

  useEffect(() => {
    async function load() {
      if (!scheduleId) {
        setEvents([]);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get(`/api/schedules/${scheduleId}/events/`);
        const formatted = res.data.map(evt => ({
          ...evt,
          start: new Date(evt.start),
          end: new Date(evt.end),
          title: evt.title || 'Event',
        }));
        setEvents(formatted);
      } catch (err) {
        console.error('Failed to load events:', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [scheduleId]);

  const handleSuccess = (eventData, action) => {
    if (action === 'create') {
      setEvents(prev => [...prev, {
        ...eventData,
        start: new Date(eventData.start),
        end: new Date(eventData.end)
      }]);
      sendMessage(eventData);
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
    if (!scheduleId) return;
    openPopup('create_event', {
      route: `/api/schedules/${scheduleId}/events/`,
      onSuccess: handleSuccess
    });
  };

  const handleEdit = (event) => {
    if (!scheduleId) return;
    openPopup('edit_event', {
      route: `/api/schedules/${scheduleId}/events/${event.id}/`,
      data: event,
      onSuccess: handleSuccess
    });
  };

  if (!scheduleId) return <p>Select a schedule to view its calendar.</p>;
  if (loading) return <p>Loading events…</p>;

  return (
    <>
      {showCreateButton && (
        <div style={{ marginBottom: '1rem' }}>
          <button className="link" onClick={handleCreate}>Create</button>
        </div>
      )}
      <MyCalendar events={events} onSelectEvent={handleEdit} />
    </>
  );
}
