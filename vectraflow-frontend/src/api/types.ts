<<<<<<< HEAD
export type IndexStatus = 'ready' | 'indexing' | 'pending' | 'error' | 'empty' | 'degraded';
export type DocumentStatus = 'pending' | 'parsing' | 'chunking' | 'embedding' | 'indexing' | 'ready' | 'failed';
export type RetrievalStrategy = 'dense' | 'sparse' | 'hybrid' | 'multi_query' | 'hyde' | 'parent_document';
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  status: IndexStatus;
  document_count: number;
  chunk_count: number;
  total_tokens: number;
  storage_bytes: number;
  last_ingested_at: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  filename: string;
  mime_type: string;
  status: DocumentStatus;
  chunk_count: number;
  file_size_bytes: number;
  error_message?: string | null;
  created_at: string;
  extracted_summary?: string;
}

export interface Chunk {
  id: string;
  document_id: string;
  content: string;
  page_number?: number;
  score?: number;
  rerank_score?: number;
}

export interface Conversation {
  id: string;
  kb_id: string;
  title: string;
=======
// Auth
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
}

// Knowledge Base
export interface KnowledgeBase {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  status: 'empty' | 'indexing' | 'ready' | 'error';
  document_count: number;
  chunk_count: number;
  storage_bytes: number;
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
  created_at: string;
  updated_at: string;
}

<<<<<<< HEAD
export interface EvalDataset {
  id: string;
  kb_id: string;
  name: string;
  item_count: number;
  created_at: string;
}

export interface EvalRun {
  id: string;
  dataset_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  metrics: {
    faithfulness: number;
    answer_relevancy: number;
    context_precision: number;
    context_recall: number;
    hit_rate: number;
  } | null;
  created_at: string;
}

export interface AnalyticsMetrics {
  avg_retrieval_latency_ms: number;
  avg_generation_latency_ms: number;
  no_context_rate: number;
  estimated_daily_cost_usd: number;
  total_documents: number;
  total_chunks: number;
  total_conversations: number;
  total_knowledge_bases: number;
  total_storage_bytes: number;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  kb_id: string;
  action: string;
  created_at: string;
}

export interface CircuitBreaker {
  name: string;
  state: CircuitBreakerState;
  failure_count: number;
  last_failure_at: string | null;
}

export interface DLQEntry {
  id: string;
  document_id: string;
  filename: string;
  error: string;
  failed_at: string;
}

=======
export interface KBStats {
  document_count: number;
  chunk_count: number;
  storage_bytes: number;
  ready_documents: number;
  failed_documents: number;
  indexing_documents: number;
  total_conversations: number;
  total_messages: number;
}

// Document
export type DocumentStatus =
  | 'pending' | 'parsing' | 'embedding' | 'ready' | 'failed';

export interface Document {
  id: string;
  knowledge_base_id: string;
  filename: string;
  mime_type: string;
  file_size_bytes: number;
  status: DocumentStatus;
  error_message: string | null;
  chunk_count: number;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Chunk {
  id: string;
  chunk_index: number;
  page_number: number | null;
  text: string;
  token_count: number;
}

// Pagination wrapper (all list endpoints)
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
export interface PaginatedResponse<T> {
  items: T[];
  next_cursor: string | null;
  total: number;
}
<<<<<<< HEAD
=======

// Chat / SSE
export interface Citation {
  marker: string;           // "[1]"
  chunk_id: string;
  document_id: string;
  document_filename: string;
  page_number: number | null;
  excerpt: string;
  score: number;
}

export interface SSEStartEvent {
  conversation_id: string;
  message_id: string;
}

export interface SSERetrievalDoneEvent {
  chunks_found: number;
  query_used: string;
}

export interface SSETokenEvent {
  text: string;
}

export interface SSEDoneEvent {
  conversation_id: string;
  message_id: string;
  token_count: number;
  chunks_used: number;
}

export interface SSEErrorEvent {
  message: string;
}

export interface SyncChatResponse {
  conversation_id: string;
  message_id: string;
  answer: string;
  citations: Citation[];
  chunks_used: number;
  token_count: number;
}

// Conversation
export interface ConversationListItem {
  id: string;
  title: string | null;
  kb_id: string;
  kb_name: string;
  message_count: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  knowledge_base_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[] | null;
  token_count: number | null;
  created_at: string;
}

// Retrieval
export interface RetrievalResult {
  chunk_id: string;
  text: string;
  score: number;
  document_id: string;
  document_filename: string;
  page_number: number | null;
  chunk_index: number;
  token_count: number;
}

export interface RetrievalResponse {
  results: RetrievalResult[];
  total_found: number;
  latency_ms: number;
}

// Feedback
export interface Feedback {
  id: string;
  message_id: string;
  rating: 'thumbs_up' | 'thumbs_down';
  note: string | null;
  created_at: string;
}

// Health
export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  services: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
    celery: 'ok' | 'error';
  };
}

export type FeedbackRating = 'thumbs_up' | 'thumbs_down';
export type DocumentUploadResult = Document;

>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
