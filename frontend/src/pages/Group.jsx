import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import ScheduleBoard from '../components/ScheduleBoard';
import { useAuth } from '../auth/AuthContext';

export default function Group() {
  const { id } = useParams();
  const { isAuthLoaded, user } = useAuth();

  const [groupName, setGroupName] = useState('');
  const [userSchedules, setUserSchedules] = useState([]);
  const [membershipId, setMembershipId] = useState(null);
  const [activeScheduleId, setActiveScheduleId] = useState(null);
  const [activeScheduleName, setActiveScheduleName] = useState('None');

  useEffect(() => {
    async function fetchAll() {
      try {
        const [groupRes, membersRes, schedulesRes] = await Promise.all([
          api.get(`/api/groups/${id}/`),
          api.get(`/api/groups/${id}/members/`),
          api.get(`/api/schedules/`)
        ]);

        setGroupName(groupRes.data.name);
        setUserSchedules(schedulesRes.data);

        const membership = membersRes.data.find(m => m.user.id === user.id);
        if (membership) {
          setMembershipId(membership.id);
          setActiveScheduleId(membership.active_schedule);
        }
      } catch (err) {
        console.error('Failed to load group data:', err);
      }
    }
    if (user && isAuthLoaded) fetchAll();
  }, [id, user, isAuthLoaded]);

  useEffect(() => {
    async function fetchActiveName() {
      if (!activeScheduleId) {
        setActiveScheduleName('None');
        return;
      }
      try {
        const res = await api.get(`/api/schedules/${activeScheduleId}/`);
        setActiveScheduleName(res.data?.name || 'Untitled');
      } catch {
        setActiveScheduleName('Untitled');
      }
    }
    fetchActiveName();
  }, [activeScheduleId]);

  const handleScheduleChange = async (e) => {
    const newId = e.target.value === 'none' ? null : e.target.value;
    if (!membershipId) return;

    const prev = activeScheduleId;
    setActiveScheduleId(newId);
    try {
      await api.patch(`/api/members/${membershipId}/`, { active_schedule: newId });
    } catch (err) {
      setActiveScheduleId(prev);
      console.error('PATCH failed:', err?.response?.status ?? '(no status)', err?.response?.data ?? '(no data)');
      alert('Failed to update active schedule.');
    }
  };

  return (
    <div>
      <h2>{groupName}</h2>

      <div>
        <label htmlFor="schedule-select">Active Schedule:</label>
        <select
          id="schedule-select"
          value={activeScheduleId || 'none'}
          onChange={handleScheduleChange}
          disabled={!membershipId || userSchedules.length === 0}
        >
          <option value="none">None</option>
          {userSchedules.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <span style={{ marginLeft: '0.75rem' }}>
          {activeScheduleId ? `(${activeScheduleName})` : '(None selected)'}
        </span>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <ScheduleBoard scheduleId={activeScheduleId} showCreateButton />
      </div>
    </div>
  );
}
