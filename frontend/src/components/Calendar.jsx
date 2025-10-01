import { Calendar, Views, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import styles from '../styles/Calendar.module.css';

const localizer = momentLocalizer(moment);

export default function MyCalendar({
  events,
  onSelectEvent,
  onRangeChange,
  date,
  onNavigate,
  slotPropGetter,
  step = 30,
  timeslots = 1,
  repaintNonce = 0,
}) {
  const dayPropGetter = () => ({ 'data-repaint': repaintNonce });

  return (
    <div className={`rbc-wrap ${styles.container}`}>
      <Calendar
        localizer={localizer}
        events={events}
        views={{ month: true, week: true, day: true, agenda: true }}
        defaultView={Views.WEEK}
        date={date}
        onNavigate={(d, v, a) => onNavigate?.(d, v, a)}
        onRangeChange={(range, view) => onRangeChange?.(range, view)}
        onSelectEvent={onSelectEvent}
        slotPropGetter={slotPropGetter}
        dayPropGetter={dayPropGetter}
        step={step}
        timeslots={timeslots}
        popup
        style={{ height: '64vh', minHeight: 420 }}
      />
    </div>
  );
}
