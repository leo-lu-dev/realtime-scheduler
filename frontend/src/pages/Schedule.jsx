import { useEffect, useState } from 'react'
import api from '../api'
import MyCalendar from '../components/Calendar'

function Schedule(){
    const [events, setEvents] = useState([])

    useEffect(() => {
        async function fetchEvents() {
            const scheduleId = 1
            const res = await api.get(`/schedules/${scheduleId}/events/`)
            const formatted = res.data.map(evt => ({
                ...evt,
                start: new Date(evt.start),
                end: new Date(evt.end),
                title: evt.title,
            }))
            setEvents(formatted)
        }
        fetchEvents()
    }, [])

    return <MyCalendar events={events} onSelectEvent={(e) => alert(e.title)} />
}

export default Schedule