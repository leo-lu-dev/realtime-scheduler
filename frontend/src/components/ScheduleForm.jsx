import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { usePopup } from '../popup/PopupContext';

function ScheduleForm() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { closePopup } = usePopup();

  const createSchedule = async () => {
    setLoading(true);
    try {
      const res = await api.post('/api/schedules/', { name: 'Untitled' });
      const newScheduleId = res.data.id;
      navigate(`/schedules/${newScheduleId}`);
      closePopup();
    } catch (err) {
      console.error('Error creating schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
      <button onClick={createSchedule} disabled={loading}>
        {loading ? 'Creating...' : 'New Schedule'}
      </button>

      <button disabled title="Coming soon">
        Import from Google
      </button>

      <button disabled title="Coming soon">
        Import from Outlook
      </button>
    </div>
  );
}

export default ScheduleForm;
