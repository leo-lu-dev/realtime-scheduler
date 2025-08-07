import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { ACCESS_TOKEN } from '../constants';
import { usePopup } from '../popup/PopupContext';

function ScheduleList() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const { openPopup } = usePopup();

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

  const handleCreate = () => {
    openPopup('create_schedule', {
      route: '/api/schedules/',
      onSuccess: (newSchedule) => {
        setSchedules((prev) => [...prev, newSchedule]);
      }
    });
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm("Are you sure you want to delete this schedule?");
    if (!confirm) return;

    try {
      await api.delete(`/api/schedules/${id}/`);
      setSchedules(prev => prev.filter(schedule => schedule.id !== id));
    } catch (err) {
      alert('Failed to delete schedule.');
    }
  };

  if (loading) return <p>Loading your schedules...</p>;

  return (
    <div>
      <button onClick={handleCreate}>Create</button>
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
              <button onClick={() => handleDelete(schedule.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ScheduleList;
