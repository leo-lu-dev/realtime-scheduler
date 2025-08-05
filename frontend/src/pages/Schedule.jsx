import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../api';
import MyCalendar from '../components/Calendar';
import { useScheduleSocket } from '../hooks/useScheduleSocket';
import Popup from '../components/Popup';
import { useAuth } from '../auth/AuthContext';

function Schedule() {
  const { id } = useParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { accessToken, isAuthLoaded } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const method = searchParams.get('popup');
  const selectedId = searchParams.get('id');
  const selectedEvent = events.find(e => e.id?.toString() === selectedId);

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

  const openPopup = (method, eventId = null) => {
    const params = { popup: method };
    if (eventId) params.id = eventId;
    setSearchParams(params);
  };
  const closePopup = () => setSearchParams({});

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

    fetchEvents();
  }, [id]);

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

  if (loading) return <p>Loading events...</p>;

  return (
    <>
      <div>
        <button className='link' onClick={() => openPopup('create_event')}>Create</button>
      </div>
      <MyCalendar
        events={events}
        onSelectEvent={(event) => openPopup('edit_event', event.id)}
      />

      {method === 'create_event' && (
        <Popup
          method="create_event"
          onClose={closePopup}
          route={`/api/schedules/${id}/events/`}
          onSuccess={handleSuccess}
        />
      )}

      {method === 'edit_event' && selectedEvent && (
        <Popup
          method="edit_event"
          onClose={closePopup}
          event={selectedEvent}
          route={`/api/schedules/${id}/events/${selectedEvent.id}/`}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}

export default Schedule;
