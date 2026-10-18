import axios from 'axios';
import { 
  SystemStatus, 
  DocumentItem, 
  DocumentDetail, 
  RAGAnswer, 
  User, 
  IncidentItem, 
  SafetyRule, 
  RuleSimulationResult,
  DigitalTwinOverview,
  ZoneSummary
} from '../types';



const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request if stored
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexus_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  login: async (username_or_email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { username_or_email, password });
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  // Health & System
  getHealth: async () => {
    const res = await apiClient.get('/health');
    return res.data;
  },

  getSystemStatus: async (): Promise<SystemStatus> => {
    const res = await apiClient.get('/system/status');
    return res.data;
  },

  // Documents & Knowledge Base
  getDocuments: async (): Promise<DocumentItem[]> => {
    const res = await apiClient.get('/documents');
    return res.data;
  },

  getDocumentDetail: async (id: number): Promise<DocumentDetail> => {
    const res = await apiClient.get(`/documents/${id}`);
    return res.data;
  },

  uploadDocument: async (formData: FormData): Promise<DocumentItem> => {
    const res = await apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  deleteDocument: async (id: number): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },

  // Conversational RAG
  queryRAG: async (question: string, zone_filter?: string): Promise<RAGAnswer> => {
    const res = await apiClient.post('/documents/query', {
      question,
      zone_filter,
    });
    return res.data;
  },

  // Incidents
  getIncidents: async (params?: { status?: string; severity?: string; limit?: number }): Promise<IncidentItem[]> => {

    const res = await apiClient.get('/incidents', { params });
    return res.data;
  },

  getIncidentDetail: async (id: number) => {
    const res = await apiClient.get(`/incidents/${id}`);
    return res.data;
  },

  updateIncidentStatus: async (id: number, data: { status: string; notes?: string; assigned_to?: string }) => {
    const res = await apiClient.patch(`/incidents/${id}/status`, data);
    return res.data;
  },

  // Temporal Events
  getTemporalEvents: async (params: { start_time: string; end_time: string; zone_id?: number; category?: string }) => {
    const res = await apiClient.get('/events/temporal', { params });
    return res.data;
  },

  // Safety Rules
  getSafetyRules: async (params?: { category?: string; severity?: string; is_active?: boolean }): Promise<SafetyRule[]> => {
    const res = await apiClient.get('/safety-rules', { params });
    return res.data;
  },

  createSafetyRule: async (data: Partial<SafetyRule>): Promise<SafetyRule> => {
    const res = await apiClient.post('/safety-rules', data);
    return res.data;
  },

  updateSafetyRule: async (id: number, data: Partial<SafetyRule>): Promise<SafetyRule> => {
    const res = await apiClient.put(`/safety-rules/${id}`, data);
    return res.data;
  },

  deleteSafetyRule: async (id: number): Promise<void> => {
    await apiClient.delete(`/safety-rules/${id}`);
  },

  simulateSafetyRule: async (payload: {
    category: string;
    confidence: number;
    duration_seconds: number;
    zone_id?: number;
    custom_confidence_threshold?: number;
    custom_persistence_seconds?: number;
  }): Promise<RuleSimulationResult> => {
    const res = await apiClient.post('/safety-rules/simulate', payload);
    return res.data;
  },

  // Digital Twin
  getDigitalTwinState: async (): Promise<DigitalTwinOverview> => {
    const res = await apiClient.get('/digital-twin/state');
    return res.data;
  },

  getZoneDetail: async (zoneId: number): Promise<ZoneSummary> => {
    const res = await apiClient.get(`/digital-twin/zones/${zoneId}`);
    return res.data;
  },

  evaluateDigitalTwin: async (): Promise<DigitalTwinOverview> => {
    const res = await apiClient.post('/digital-twin/evaluate');
    return res.data;
  },
};



