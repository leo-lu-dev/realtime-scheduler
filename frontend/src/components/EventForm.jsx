import { useState, useEffect } from 'react';
import api from '../api';

function EventForm({ route, method, event = {}, onSuccess, onClose }) {
    const [title, setTitle] = useState(event?.title || '');
    const [start, setStart] = useState(event?.start || '');
    const [end, setEnd] = useState(event?.end || '');
    const [description, setDescription] = useState(event?.description || '');
    const [loading, setLoading] = useState(false);

    const isEdit = method === 'edit';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = { title, start, end, description };
            const res = isEdit
                ? await api.put(route, data)
                : await api.post(route, data);

            if (onSuccess) {
                onSuccess(res.data);
            }
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

            <button className="form-button" type="submit" disabled={loading}>
                {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
        </form>
    );
}

export default EventForm;
