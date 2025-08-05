import { useState } from 'react';
import api from '../api';

function toDatetimeLocalFormat(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function EventForm({ route, method, event = {}, onSuccess, onClose }) {
  const isEdit = method === 'edit';

  const [title, setTitle] = useState(event?.title || '');
  const [start, setStart] = useState(
    event?.start ? toDatetimeLocalFormat(event.start) : ''
  );
  const [end, setEnd] = useState(
    event?.end ? toDatetimeLocalFormat(event.end) : ''
  );
  const [description, setDescription] = useState(event?.description || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = { title, start, end, description };
      const res = isEdit
        ? await api.put(route, data)
        : await api.post(route, data);

      if (onSuccess) onSuccess(res.data, isEdit ? 'edit' : 'create');
      if (onClose) onClose();
    } catch (err) {
      alert(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    setLoading(true);
    try {
      await api.delete(route);
      if (onSuccess) onSuccess(event, 'delete');
      if (onClose) onClose();
    } catch (err) {
      alert(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <h2>{isEdit ? 'Edit Event' : 'Create Event'}</h2>

      <input
        className="form-input"
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        className="form-input"
        type="datetime-local"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        required
      />
      <input
        className="form-input"
        type="datetime-local"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        required
      />
      <textarea
        className="form-input"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <button className="form-button" type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </button>
        {isEdit && (
          <button onClick={handleDelete} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </form>
  );
}

export default EventForm;
