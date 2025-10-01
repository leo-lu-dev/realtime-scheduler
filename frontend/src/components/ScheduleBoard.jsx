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
  onAvailabilityMeta,
  onRequestCreate,
  onRequestEdit,
  events: eventsProp,
  refreshAvailability,
  overlayFreeSet,
  onRangeChangeExternal,
  showLegend = true,
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

  const handleRangeChange = useCallback((r, v) => {
    if (Array.isArray(r) && r.length) {
      const start = new Date(r[0]);
      const end = new Date(r[r.length - 1]);
      end.setDate(end.getDate() + 1);
      end.setHours(0, 0, 0, 0);
      setRange({ start, end });
      onRangeChangeExternal?.({ start, end, stepMinutes });
      return;
    }
    if (r && r.start && r.end) {
      const next = { start: new Date(r.start), end: new Date(r.end) };
      setRange(next);
      onRangeChangeExternal?.({ ...next, stepMinutes });
    }
  }, [onRangeChangeExternal, stepMinutes]);

  const { data: availability, refresh } = useGroupAvailability(
    groupId,
    range.start,
    range.end,
    stepMinutes,
    { mode: 'active_only', minPeople: 0 }
  );

  useEffect(() => {
    if (refreshAvailability == null) return;
    refresh();
  }, [refreshAvailability, refresh]);

  useEffect(() => {
    if (!availability) return;
    onAvailabilityMeta?.({
      activeCount: availability.activeCount || 0,
      totalMembers: availability.totalMembers || 0,
      missingCount: availability.missingCount || 0,
    });
  }, [availability, onAvailabilityMeta]);

  const activeCount = availability?.activeCount || 0;

  const slotPropGetter = useCallback(
    (dateCell) => {
      if (overlayFreeSet && overlayFreeSet.size) {
        const key = new Date(dateCell).getTime();
        if (overlayFreeSet.has(key)) {
          return { className: 'slot-available' };
        }
        return {};
      }
      if (!availability?.slots?.length || !highlightMinAvailable || !activeCount) return {};
      const s = availability.slots.find(({ start, end }) => {
        const a = new Date(start);
        const b = new Date(end);
        return dateCell >= a && dateCell < b;
      });
      if (!s) return {};
      if (s.available >= highlightMinAvailable) {
        return { className: 'slot-available' };
      }
      return {};
    },
    [overlayFreeSet, availability, highlightMinAvailable, activeCount]
  );

  const legend = useMemo(() => {
    if (!showLegend) return null;
    if (!availability) return null;
    if (!activeCount) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 14, height: 14, background: 'rgba(0,200,0,0.25)', borderRadius: 2 }} />
        <span>Highlighted = free based on current filter</span>
      </div>
    );
  }, [availability, activeCount, showLegend]);

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
          date={date}
          onNavigate={(d) => setDate(new Date(d))}
          slotPropGetter={slotPropGetter}
          step={stepMinutes}
          timeslots={1}
          repaintNonce={refreshAvailability}
        />
      )}
    </div>
  );
}
