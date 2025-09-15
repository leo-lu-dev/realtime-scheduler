import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddMembersForm({ groupId, onClose, onSuccess }) {
  const [input, setInput] = useState('');
  const [chips, setChips] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  const set = useMemo(() => new Set(chips), [chips]);

  const addEmails = (raw) => {
    const parts = raw
      .split(/[\s,;]+/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...chips];
    for (const e of parts) {
      if (!set.has(e)) next.push(e);
    }
    setChips(next);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim()) addEmails(input);
    } else if (e.key === 'Backspace' && !input && chips.length) {
      setChips(prev => prev.slice(0, -1));
    }
  };

  const removeChip = (email) => {
    setChips(prev => prev.filter(x => x !== email));
  };

  const submit = async () => {
    if (!chips.length) return;
    setSubmitting(true);
    try {
      const payload = { emails: chips };
      const res = await api.post(`/api/groups/${groupId}/members/`, payload);
      onSuccess?.(res.data);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to add members.');
    } finally {
      setSubmitting(false);
    }
  };

  // optional: auto-validate current token
  const invalids = chips.filter(e => !EMAIL_RE.test(e));

  return (
    <div style={{ width: 480 }}>
      <h3>Add members by email</h3>

      <div
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 8,
          border: '1px solid #ddd', borderRadius: 8, padding: 8
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {chips.map(e => (
          <span key={e}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 8px', borderRadius: 999,
              background: EMAIL_RE.test(e) ? '#f0f2f5' : '#ffe6e6'
            }}>
            <small>{e}</small>
            <button
              onClick={() => removeChip(e)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              aria-label={`Remove ${e}`}
            >×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type/paste emails, press Enter…"
          style={{ flex: 1, minWidth: 160, border: 'none', outline: 'none' }}
          autoFocus
        />
      </div>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
        Tip: paste multiple emails separated by commas or spaces.
      </div>

      {invalids.length > 0 && (
        <div style={{ color: '#b00020', marginTop: 8, fontSize: 13 }}>
          Invalid: {invalids.join(', ')}
        </div>
      )}

      <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} disabled={submitting}>Cancel</button>
        <button
          onClick={submit}
          disabled={!chips.length || invalids.length > 0 || submitting}
        >
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </div>
    </div>
  );
}
