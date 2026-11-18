import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

export const checkHealth  = ()     => API.get('/health');
export const checkStatus  = ()     => API.get('/status');
export const initializeKB = ()     => API.post('/initialize');
export const sendMessage  = (data) => API.post('/agent', data);
export const sendAgentV2  = (data) => API.post('/agent-v2', data);  // LangGraph ReAct
export const ragQuery     = (data) => API.post('/rag', data);        // LangChain RAG
export const directQuery  = (data) => API.post('/query', data);
