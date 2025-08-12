import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import ScheduleBoard from '../components/ScheduleBoard';
import { useAuth } from '../auth/AuthContext';
import { usePopup } from '../popup/PopupContext';

export default function Group() {
  const { id } = useParams();
  const { isAuthLoaded, user } = useAuth();

  const [groupName, setGroupName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [userSchedules, setUserSchedules] = useState([]);
  const [membershipId, setMembershipId] = useState(null);
  const [activeScheduleId, setActiveScheduleId] = useState(null);
  const [activeScheduleName, setActiveScheduleName] = useState('None');
  const { openPopup } = usePopup();

  useEffect(() => {
    async function fetchAll() {
      try {
        const [groupRes, membersRes, schedulesRes] = await Promise.all([
          api.get(`/api/groups/${id}/`),
          api.get(`/api/groups/${id}/members/`),
          api.get(`/api/schedules/`)
        ]);

        setGroupName(groupRes.data.name);
        const adminField = groupRes.data.admin;
        const adminId = typeof adminField === 'object' ? adminField?.id : adminField;
        setIsAdmin(user?.id === adminId);

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

  const handleNameSave = async () => {
    if (!groupName.trim()) return;
    setSavingName(true);
    try {
      await api.patch(`/api/groups/${id}/`, { name: groupName });
      setEditingName(false);
    } catch (err) {
      alert('Failed to save name');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div>
      {isAdmin && (
        <button
          onClick={() =>
            openPopup('add_members', {
              route: id,
              onSuccess: ({ created, skipped }) => {
                console.log('Added:', created, 'Skipped:', skipped);
              }
            })
          }
        >
          Add members
        </button>
      )}

      <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
        {isAdmin && editingName ? (
          <>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <button onClick={handleNameSave} disabled={savingName}>
              {savingName ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setEditingName(false)}
              disabled={savingName}
              style={{ marginLeft: 8 }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <h2 style={{ display: 'inline-block', marginRight: 12 }}>{groupName}</h2>
            {isAdmin && (
              <button onClick={() => setEditingName(true)}>Edit</button>
            )}
          </>
        )}
      </div>

      <div>
        <label htmlFor="schedule-select">Active Schedule:</label>
        <select
          id="schedule-select"
          value={activeScheduleId || 'none'}
          onChange={handleScheduleChange}
          disabled={!membershipId || userSchedules.length === 0}
        >
          <option value="none">None</option>
          {userSchedules.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
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
