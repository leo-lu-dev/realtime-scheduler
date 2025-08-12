import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { ACCESS_TOKEN } from '../constants';
import { useAuth } from '../auth/AuthContext';

function GroupList() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem(ACCESS_TOKEN);
    const fetchGroups = async () => {
      try {
        const res = await api.get('/api/groups/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setGroups(res.data);
      } catch (error) {
        alert(error);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const handleCreate = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    try {
      const res = await api.post('/api/groups/', { name: 'Untitled' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newGroup = res.data;
      setGroups(prev => [...prev, newGroup]);
      navigate(`/groups/${newGroup.id}`);
    } catch {
      alert('Failed to create group.');
    }
  };

  const handleDelete = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    const token = localStorage.getItem(ACCESS_TOKEN);
    try {
      setDeletingId(groupId);
      await api.delete(`/api/groups/${groupId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(prev => prev.filter(group => group.id !== groupId));
    } catch {
      alert('Failed to delete group.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <p>Loading your groups...</p>;

  return (
    <div>
      <button onClick={handleCreate}>Create</button>
      <h2>Your Groups</h2>
      {groups.length === 0 ? (
        <p>No groups found.</p>
      ) : (
        <ul>
          {groups.map(group => {
            const isAdmin = user?.id === group.admin.id;
            return (
              <li key={group.id}>
                <Link to={`/groups/${group.id}`}>
                  <strong>{group.name}</strong> – Created on{' '}
                  {new Date(group.created_at).toLocaleDateString()}
                </Link>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(group.id)}
                    disabled={deletingId === group.id}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    {deletingId === group.id ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default GroupList;
