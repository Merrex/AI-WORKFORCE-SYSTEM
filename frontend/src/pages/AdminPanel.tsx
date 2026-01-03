import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../services/api';

export default function AdminPanel() {
  const [agents, setAgents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ role: 'ceo', name: '', authorityLevel: 'medium' });

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const res = await adminAPI.listAgents();
      setAgents(res.data.agents);
    } catch (err) {
      console.error('Failed to load agents', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminAPI.createAgent(formData);
      setShowForm(false);
      setFormData({ role: 'ceo', name: '', authorityLevel: 'medium' });
      loadAgents();
    } catch (err) {
      console.error('Failed to create agent', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this agent?')) return;
    try {
      await adminAPI.deleteAgent(id);
      loadAgents();
    } catch (err) {
      console.error('Failed to delete agent', err);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <Link to="/dashboard">← Back to Dashboard</Link>
      <h1>Admin Panel</h1>
      
      <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: '20px', padding: '10px 20px', cursor: 'pointer' }}>
        {showForm ? 'Cancel' : '+ Create New Agent'}
      </button>

      {showForm && (
        <form onSubmit={handleCreate} style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label>Role:</label>
            <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} style={{ width: '100%', padding: '8px' }}>
              <option value="ceo">CEO</option>
              <option value="cfo">CFO</option>
              <option value="hr">HR</option>
              <option value="sales">Sales</option>
              <option value="support">Support</option>
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Name:</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '8px' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Authority Level:</label>
            <select value={formData.authorityLevel} onChange={(e) => setFormData({...formData, authorityLevel: e.target.value})} style={{ width: '100%', padding: '8px' }}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer' }}>Create Agent</button>
        </form>
      )}

      <h2>All Agents</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Role</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Authority</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {agents.map(agent => (
            <tr key={agent.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px' }}>{agent.name}</td>
              <td style={{ padding: '10px' }}>{agent.role.toUpperCase()}</td>
              <td style={{ padding: '10px' }}>{agent.status}</td>
              <td style={{ padding: '10px' }}>{agent.authority_level}</td>
              <td style={{ padding: '10px' }}>
                <button onClick={() => handleDelete(agent.id)} style={{ padding: '5px 10px', backgroundColor: '#d9534f', color: 'white', border: 'none', cursor: 'pointer' }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
