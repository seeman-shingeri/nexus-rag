export type UserRole = 'ADMIN' | 'SAFETY_OFFICER' | 'OPERATOR' | 'VIEWER';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  role: UserRole | null;
}

export interface SystemStatus {
  status: string;
  active_cameras: number;
  open_incidents: number;
  critical_alerts: number;
  indexed_documents: number;
  total_chunks: number;
  active_zones: number;
  demo_mode: boolean;
  llm_provider: string;
  privacy_mode: string;
  uptime_seconds: number;
}

export interface DocumentItem {
  id: number;
  title: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  chunk_count: number;
  status: 'PENDING' | 'INDEXED' | 'FAILED';
  category: string;
  uploaded_by: string;
  created_at: string;
}

export interface DocumentChunk {
  id: number;
  chunk_index: number;
  content: string;
  token_count: number;
  page_number?: number;
}

export interface DocumentDetail extends DocumentItem {
  chunks: DocumentChunk[];
}

export interface Citation {
  source: string;
  filename: string;
  page?: number;
  chunk_index: number;
  relevance_score: number;
  excerpt: string;
}

export interface RAGAnswer {
  question: string;
  answer: string;
  citations: Citation[];
  confidence: number;
  evidence_found: boolean;
  insufficient_evidence: boolean;
  security_flag?: boolean;
}

export type ActiveScreen = 
  | 'dashboard' 
  | 'vision' 
  | 'knowledge' 
  | 'incidents' 
  | 'ask' 
  | 'twin' 
  | 'rules' 
  | 'settings';

export type IncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
export type RuleSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface IncidentItem {
  id: number;
  title: string;
  rule_id: number;
  event_id: number;
  zone_id?: number | null;
  camera_id: number;
  severity: RuleSeverity;
  status: IncidentStatus;
  observation_summary: string;
  evidence_path?: string | null;
  confidence: number;
  retrieved_procedure?: string | null;
  citation_source?: string | null;
  recommended_action: string;
  occurrence_count: number;
  assigned_to?: string | null;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  is_demo: boolean;
  last_detected_at: string;
  created_at: string;
}

export interface TemporalEvent {
  id: number;
  camera_id: number;
  zone_id?: number | null;
  category: string;
  confidence: number;
  bounding_box: number[];
  evidence_path?: string | null;
  timestamp: string;
  requires_review: boolean;
}

