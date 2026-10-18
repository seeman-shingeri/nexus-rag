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
