import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api';
import styles from '../styles/AddMembersForm.module.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddMembersForm({
  groupId,
  onClose,
  onSuccess,
}) {
  const [input, setInput] = useState('');
  const [chips, setChips] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [invalidMsg, setInvalidMsg] = useState('');
  const [removingIds, setRemovingIds] = useState(new Set());
  const inputRef = useRef(null);
  const adminIdRef = useRef(null);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const [groupRes, membersRes] = await Promise.all([
          api.get(`/api/groups/${groupId}/`),
          api.get(`/api/groups/${groupId}/members/`)
        ]);
        const adminField = groupRes.data?.admin;
        const adminId = typeof adminField === 'object' ? adminField?.id : adminField;
        adminIdRef.current = String(adminId);
        const members = (membersRes.data || [])
          .map(m => {
            const u = m.user || {};
            const email = (u.email || '').toLowerCase();
            if (!email) return null;
            const isOwner = String(u.id) === String(adminIdRef.current);
            return {
              email,
              existing: true,
              owner: isOwner,
              removable: !isOwner,
              membershipId: m.id,
              displayName: u.display_name || email
            };
          })
          .filter(Boolean)
          .sort((a, b) => {
            if (a.owner && !b.owner) return -1;
            if (!a.owner && b.owner) return 1;
            return a.email.localeCompare(b.email);
          });
        if (!canceled) setChips(members);
      } catch {
        if (!canceled) setChips([]);
      }
    })();
    return () => { canceled = true; };
  }, [groupId]);

  const existingSet = useMemo(
    () => new Set(chips.filter(c => c.existing).map(c => c.email)),
    [chips]
  );
  const chipEmailsSet = useMemo(
    () => new Set(chips.map(c => c.email)),
    [chips]
  );

  const parseEmails = (raw) =>
    raw
      .split(/[\s,;]+/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

  const mergeServerResult = (created = [], skipped = []) => {
    let next = [...chips];
    const toIndex = new Map(next.map(c => [c.email, c]));
    for (const m of created) {
      const u = m.user || {};
      const email = (u.email || '').toLowerCase();
      if (!email) continue;
      const owner = String(u.id) === String(adminIdRef.current);
      const chip = {
        email,
        existing: true,
        owner,
        removable: !owner,
        membershipId: m.id,
        displayName: u.display_name || email
      };
      const existingChip = toIndex.get(email);
      if (existingChip) {
        toIndex.set(email, { ...existingChip, ...chip });
      } else {
        toIndex.set(email, chip);
      }
    }
    next = Array.from(toIndex.values()).filter(Boolean).sort((a, b) => {
      if (a.owner && !b.owner) return -1;
      if (!a.owner && b.owner) return 1;
      return a.email.localeCompare(b.email);
    });
    setChips(next);
    if (skipped.length) {
      const msg = skipped.map(s => {
        if (s.reason === 'already_member') return `${s.email} (already a member)`;
        if (s.reason === 'not_found') return `${s.email} (not found)`;
        return `${s.email} (${s.reason})`;
      }).join(', ');
      setInvalidMsg(`Skipped: ${msg}`);
    } else {
      setInvalidMsg('');
    }
  };

  const addNow = async (emails) => {
    if (!emails.length) return;
    const payload = { emails };
    try {
      const res = await api.post(`/api/groups/${groupId}/members/`, payload);
      const { created = [], skipped = [] } = res.data || {};
      mergeServerResult(created, skipped);
      onSuccess?.(res.data);
    } catch {
      setInvalidMsg('Failed to add members.');
    }
  };

  const handleEnter = async () => {
    const parts = parseEmails(input);
    if (!parts.length) return;
    setInput('');
    const unique = Array.from(new Set(parts))
      .filter(e => EMAIL_RE.test(e))
      .filter(e => !existingSet.has(e));
    const already = parts.filter(e => existingSet.has(e));
    if (already.length) {
      setInvalidMsg(`Already a member: ${Array.from(new Set(already)).join(', ')}`);
    } else {
      setInvalidMsg('');
    }
    if (unique.length) await addNow(unique);
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleEnter();
    } else if (e.key === 'Backspace' && !input && chips.length) {
      const last = chips[chips.length - 1];
      if (last.removable && !last.existing) {
        setChips(prev => prev.slice(0, -1));
      }
    }
  };

  const removeChip = async (chip) => {
    if (!chip) return;
    if (!chip.existing) {
      setChips(prev => prev.filter(c => c.email !== chip.email));
      return;
    }
    if (!chip.removable || !chip.membershipId) return;
    const nextSet = new Set(removingIds);
    nextSet.add(chip.membershipId);
    setRemovingIds(nextSet);
    try {
      await api.delete(`/api/members/${chip.membershipId}/delete/`);
      setChips(prev => prev.filter(c => c.email !== chip.email));
    } catch {
      setInvalidMsg('Failed to remove member.');
    } finally {
      const after = new Set(removingIds);
      after.delete(chip.membershipId);
      setRemovingIds(after);
    }
  };

  const submit = async () => {
    const staged = chips.filter(c => !c.existing).map(c => c.email);
    if (!staged.length) {
      onClose();
      return;
    }
    setSubmitting(true);
    await addNow(staged);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Add members by email</h3>
      <div className={styles.inputWrap} onClick={() => inputRef.current?.focus()}>
        {chips.map(c => (
          <span
            key={c.email}
            className={[
              styles.chip,
              c.owner ? styles.chipOwner : (c.existing ? styles.chipExisting : styles.chipNew)
            ].join(' ')}
          >
            <small className={styles.chipText}>{c.email}</small>
            {c.removable && (
              <button
                className={styles.removeBtn}
                onClick={() => removeChip(c)}
                disabled={c.membershipId ? removingIds.has(c.membershipId) : false}
                aria-label={`Remove ${c.email}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type/paste emails, press Enter…"
          className={styles.input}
          autoFocus
        />
      </div>
      {invalidMsg && <div className={styles.error}>{invalidMsg}</div>}
      <div className={styles.tip}>Paste multiple emails separated by commas or spaces.</div>
      <div className={styles.actions}>
        <button onClick={onClose} disabled={submitting}>Cancel</button>
        <button onClick={submit} disabled={submitting}>
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </div>
    </div>
  );
}
