import { useCallback, useMemo, useState, useEffect } from 'react';
import MyCalendar from './Calendar';
import api from '../api';
import { useGroupAvailability } from '../hooks/useGroupAvailability';

function weekRangeSunday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

export default function ScheduleBoard({
  scheduleId,
  showCreateButton,
  groupId,
  highlightMinAvailable,
  stepMinutes = 30,
  onRequestCreate,
  onRequestEdit,
  events: eventsProp,
  refreshAvailability,
}) {
  const [date, setDate] = useState(() => new Date());
  const [view] = useState('week');
  const [range, setRange] = useState(() => weekRangeSunday(new Date()));
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    setRange(weekRangeSunday(date));
  }, [date]);

  useEffect(() => {
    if (Array.isArray(eventsProp)) {
      setEvents(
        eventsProp.map((evt) => ({
          ...evt,
          start: new Date(evt.start),
          end: new Date(evt.end),
        }))
      );
      return;
    }
    async function fetchEvents() {
      if (!scheduleId) {
        setEvents([]);
        return;
      }
      setLoadingEvents(true);
      try {
        const res = await api.get(`/api/schedules/${scheduleId}/events/`);
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
    fetchEvents();
  }, [scheduleId, eventsProp]);

  const handleRangeChange = useCallback((r) => {
    if (Array.isArray(r) && r.length) {
      const start = new Date(r[0]);
      const end = new Date(r[r.length - 1]);
      end.setDate(end.getDate() + 1);
      end.setHours(0, 0, 0, 0);
      setRange({ start, end });
      setDate(start);
    } else if (r && r.start && r.end) {
      setRange({ start: new Date(r.start), end: new Date(r.end) });
      setDate(new Date(r.start));
    }
  }, []);

  const { data: availability, refresh } = useGroupAvailability(
    groupId,
    range.start,
    range.end,
    stepMinutes
  );

  useEffect(() => {
    if (refreshAvailability == null) return;
    console.log('[avail][trigger] refreshAvailability=', refreshAvailability);
    refresh();
  }, [refreshAvailability, refresh]);

  const slotPropGetter = useCallback(
    (dateCell) => {
      if (!availability?.slots?.length || !highlightMinAvailable || !availability.memberCount) return {};
      const s = availability.slots.find(({ start, end }) => {
        const a = new Date(start);
        const b = new Date(end);
        return dateCell >= a && dateCell < b;
      });
      if (!s) return {};
      if (s.available >= highlightMinAvailable) {
        return { style: { backgroundColor: 'rgba(0, 200, 0, 0.25)' } };
      }
      return {};
    },
    [availability, highlightMinAvailable]
  );

  const legend = useMemo(() => {
    if (!availability?.memberCount) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 14, height: 14, background: 'rgba(0,200,0,0.25)', borderRadius: 2 }} />
        <span>
          Highlighted = at least {highlightMinAvailable}/{availability.memberCount} members free
        </span>
      </div>
    );
  }, [availability, highlightMinAvailable]);

  const handleSelectEvent = useCallback(
    (evt) => {
      if (onRequestEdit) onRequestEdit(evt);
    },
    [onRequestEdit]
  );

  return (
    <div>
      {legend}
      {showCreateButton && onRequestCreate && (
        <div style={{ marginBottom: 8 }}>
          <button onClick={onRequestCreate}>Create</button>
        </div>
      )}
      {loadingEvents ? (
        <p>Loading events…</p>
      ) : (
        <MyCalendar
          events={events}
          onSelectEvent={handleSelectEvent}
          onRangeChange={handleRangeChange}
          defaultView={view}
          date={date}
          onNavigate={setDate}
          slotPropGetter={slotPropGetter}
          step={stepMinutes}
          timeslots={1}
          repaintNonce={refreshAvailability}
        />
      )}
    </div>
  );
}
