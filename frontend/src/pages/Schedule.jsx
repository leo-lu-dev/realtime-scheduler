import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'
import MyCalendar from '../components/Calendar'

function Schedule() {
  const { id } = useParams()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await api.get(`/api/schedules/${id}/events/`)

        const formatted = res.data.map(evt => ({
        ...evt,
        start: new Date(`${evt.date}T${evt.start_time}`),
        end: new Date(`${evt.date}T${evt.end_time}`),
        title: evt.title || 'Event',
        }))

        setEvents(formatted)
      } catch (error) {
        alert(error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [id])

  if (loading) return <p>Loading events...</p>

  return (
    <MyCalendar
      events={events}
      onSelectEvent={(e) => alert(e.title)}
    />
  )
}

export default Schedule
