import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { agentsAPI } from '../services/api';

export default function AgentChat() {
  const { id } = useParams();
  const [agent, setAgent] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAgent();
  }, [id]);

  const loadAgent = async () => {
    try {
      const res = await agentsAPI.get(id!);
      setAgent(res.data.agent);
    } catch (err) {
      console.error('Failed to load agent', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await agentsAPI.chat(id!, input);
      const agentMessage = { 
        role: 'agent', 
        content: res.data.content,
        requiresApproval: res.data.requiresApproval,
        sensitivity: res.data.sensitivity
      };
      setMessages(prev => [...prev, agentMessage]);
    } catch (err) {
      console.error('Chat failed', err);
      setMessages(prev => [...prev, { role: 'error', content: 'Failed to get response' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!agent) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Link to="/dashboard">← Back to Dashboard</Link>
      <h1>{agent.name}</h1>
      <p>Role: {agent.role.toUpperCase()} | Authority: {agent.authority_level}</p>

      <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px', minHeight: '400px', marginBottom: '15px', overflowY: 'auto' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: '15px', padding: '10px', backgroundColor: msg.role === 'user' ? '#e3f2fd' : msg.role === 'error' ? '#ffebee' : '#f5f5f5', borderRadius: '6px' }}>
            <strong>{msg.role === 'user' ? 'You' : agent.name}:</strong>
            <p>{msg.content}</p>
            {msg.requiresApproval && (
              <p style={{ color: '#f0ad4e', fontWeight: 'bold' }}>⚠️ Requires Approval (Sensitivity: {msg.sensitivity})</p>
            )}
          </div>
        ))}
        {loading && <p>Agent is thinking...</p>}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask your agent..."
          style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button onClick={handleSend} disabled={loading} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Send
        </button>
      </div>
    </div>
  );
}
