import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { ACCESS_TOKEN } from '../constants';

function ScheduleList() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem(ACCESS_TOKEN);

    const fetchSchedules = async () => {
      try {
        const res = await api.get('/api/schedules/', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setSchedules(res.data);
      } catch (error) {
        alert(error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  if (loading) return <p>Loading your schedules...</p>;

  return (
    <div>
      <h2>Your Schedules</h2>
      {schedules.length === 0 ? (
        <p>No schedules found.</p>
      ) : (
        <ul>
          {schedules.map(schedule => (
            <li key={schedule.id}>
              <Link to={`/schedules/${schedule.id}`}>
                <strong>{schedule.name}</strong> – Created on{' '}
                {new Date(schedule.created_at).toLocaleDateString()}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ScheduleList;
