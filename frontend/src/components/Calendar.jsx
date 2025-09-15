// MyCalendar.jsx
import { Calendar, Views, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

export default function MyCalendar({
  events,
  onSelectEvent,
  onRangeChange,
  defaultView = 'week',
  date,
  onNavigate,
  slotPropGetter,
  step = 30,
  timeslots = 1,
  repaintNonce = 0,
}) {
  const dayPropGetter = () => ({
    'data-repaint': repaintNonce,
  });

  return (
    <Calendar
      localizer={localizer}
      events={events}
      defaultView={defaultView}
      date={date}
      onNavigate={onNavigate}
      onRangeChange={onRangeChange}
      onSelectEvent={onSelectEvent}
      slotPropGetter={slotPropGetter}
      dayPropGetter={dayPropGetter}
      step={step}
      timeslots={timeslots}
      popup
    />
  );
}
