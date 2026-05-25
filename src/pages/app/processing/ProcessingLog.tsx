import React, { useState } from 'react';
import axios from 'axios';

// Definindo uma interface para os dados de log que virão da API
interface LogEntry {
  id: number;
  step_name: string;
  start_time: string;
  duration_ms: number;
  status: 'completed' | 'failed' | 'in_progress';
  agent_name: string;
  error_message?: string;
}

// URL da sua API. Ajuste se for diferente.
const API_URL = 'http://localhost:8000/api/v1/logs/target';

const ProcessingLog: React.FC = () => {
  const [targetId, setTargetId] = useState('');
  const [logType, setLogType] = useState('exam');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    if (!targetId) {
      setError('Por favor, insira o ID.');
      return;
    }
    setLoading(true);
    setError('');
    setLogs([]);
    try {
      const response = await axios.get<LogEntry[]>(`${API_URL}/${logType}/${targetId}`);
      setLogs(response.data);
    } catch (err) {
      setError('Falha ao buscar os logs. Verifique o ID e o tipo de relatório.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };
  
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#333' }}>Log de Processamento de IA</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <select
          value={logType}
          onChange={(e) => setLogType(e.target.value)}
          style={{ padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="exam">Processamento de Exame (ID Exame)</option>
          <option value="individual">Dossiê Individual (ID Funcionário)</option>
          <option value="epidemiological">Relatório Epidemiológico (ID Empresa)</option>
        </select>
        <input
          type="text"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          placeholder={`Digite o ID para buscar`}
          style={{ padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc', flexGrow: 1 }}
        />
        <button
          onClick={fetchLogs}
          disabled={loading}
          style={{ padding: '10px 20px', fontSize: '16px', borderRadius: '4px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}
        >
          {loading ? 'Buscando...' : 'Buscar Logs'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{
        fontFamily: 'monospace',
        backgroundColor: '#f4f4f4',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {logs.length > 0 ? (
          logs.map((log) => (
            <div key={log.id} style={{
              padding: '8px 0',
              borderBottom: '1px solid #ddd',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: log.status === 'failed' ? '#f8d7da' : 'transparent'
            }}>
              <span style={{
                backgroundColor: '#e0e0e0',
                padding: '2px 8px',
                borderRadius: '4px',
                marginRight: '15px',
                color: '#555'
              }}>{formatTimestamp(log.start_time)}</span>
              <span style={{
                color: '#333',
                fontWeight: 'bold',
                width: '180px'
              }}>{log.agent_name}</span>
               <span style={{
                color: '#0056b3',
                flexGrow: 1
              }}>{log.step_name}</span>
              <span style={{
                backgroundColor: log.status === 'completed' ? '#d4edda' : log.status === 'failed' ? '#f5c6cb' : '#ffeeba',
                color: log.status === 'completed' ? '#155724' : log.status === 'failed' ? '#721c24' : '#856404',
                padding: '2px 8px',
                borderRadius: '4px',
                width: '100px',
                textAlign: 'center'
              }}>{log.status}</span>
               <span style={{
                backgroundColor: '#d1ecf1',
                color: '#0c5460',
                padding: '2px 8px',
                borderRadius: '4px',
                marginLeft: '15px',
                 width: '80px',
                 textAlign: 'right'
              }}>{log.duration_ms} ms</span>
               {log.error_message && <div style={{ color: 'red', marginLeft: '15px', fontSize: '12px' }}>{log.error_message}</div>}
            </div>
          ))
        ) : (
          <p>Nenhum log para exibir. Insira um ID de exame e clique em "Buscar Logs".</p>
        )}
      </div>
    </div>
  );
};

export default ProcessingLog;
