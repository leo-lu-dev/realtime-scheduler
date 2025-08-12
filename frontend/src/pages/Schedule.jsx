import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import ScheduleBoard from '../components/ScheduleBoard';


export default function Schedule() {
  const { id } = useParams();
  const [scheduleName, setScheduleName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [loadingName, setLoadingName] = useState(true);

  useEffect(() => {
    async function fetchSchedule() {
      setLoadingName(true);
      try {
        const res = await api.get(`/api/schedules/${id}/`);
        setScheduleName(res.data?.name || 'Untitled');
      } catch (err) {
        console.error('Failed to fetch schedule name:', err);
        setScheduleName('Untitled');
      } finally {
        setLoadingName(false);
      }
    }
    fetchSchedule();
  }, [id]);

  const handleNameSave = async () => {
    if (!scheduleName.trim()) return;
    setSavingName(true);
    try {
      await api.patch(`/api/schedules/${id}/`, { name: scheduleName });
      setEditingName(false);
    } catch {
      alert('Failed to save name');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <>
      <div>
        {editingName ? (
          <>
            <input
              type="text"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
            />
            <button onClick={handleNameSave} disabled={savingName}>
              {savingName ? 'Saving...' : 'Save'}
            </button>
          </>
        ) : (
          <>
            <h2>{loadingName ? 'Loading…' : scheduleName}</h2>
            <button onClick={() => setEditingName(true)}>Edit</button>
          </>
        )}
      </div>

      <ScheduleBoard scheduleId={id} showCreateButton />
    </>
  );
}
