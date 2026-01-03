import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { agentsAPI, decisionsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const [agents, setAgents] = useState<any[]>([]);
  const [pendingDecisions, setPendingDecisions] = useState<any[]>([]);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [agentsRes, decisionsRes] = await Promise.all([
        agentsAPI.list(),
        decisionsAPI.pending()
      ]);
      setAgents(agentsRes.data.agents);
      setPendingDecisions(decisionsRes.data.decisions);
    } catch (err) {
      console.error('Failed to load data', err);
    }
  };

  const handleApprove = async (id: string) => {
    await decisionsAPI.approve(id);
    loadData();
  };

  const handleReject = async (id: string) => {
    await decisionsAPI.reject(id);
    loadData();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>AI Workforce Dashboard</h1>
        <div>
          <span>{user?.name} ({user?.role})</span>
          {user?.role === 'admin' && <Link to="/admin" style={{ marginLeft: '15px' }}>Admin Panel</Link>}
          <button onClick={logout} style={{ marginLeft: '15px' }}>Logout</button>
        </div>
      </div>

      <h2>Your AI Agents</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        {agents.map(agent => (
          <Link
            key={agent.id}
            to={`/agent/${agent.id}`}
            style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}
          >
            <h3>{agent.name}</h3>
            <p>Role: {agent.role.toUpperCase()}</p>
            <p>Status: {agent.status}</p>
            <p>Authority: {agent.authority_level}</p>
          </Link>
        ))}
      </div>

      {pendingDecisions.length > 0 && (
        <>
          <h2>Pending Approvals ({pendingDecisions.length})</h2>
          <div>
            {pendingDecisions.map(decision => (
              <div key={decision.id} style={{ padding: '15px', border: '1px solid #f0ad4e', borderRadius: '8px', marginBottom: '10px' }}>
                <h4>{decision.title}</h4>
                <p>{decision.description}</p>
                <p>Sensitivity: <strong>{decision.sensitivity}</strong></p>
                <button onClick={() => handleApprove(decision.id)} style={{ marginRight: '10px', padding: '5px 15px', backgroundColor: '#5cb85c', color: 'white', border: 'none', cursor: 'pointer' }}>
                  Approve
                </button>
                <button onClick={() => handleReject(decision.id)} style={{ padding: '5px 15px', backgroundColor: '#d9534f', color: 'white', border: 'none', cursor: 'pointer' }}>
                  Reject
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
