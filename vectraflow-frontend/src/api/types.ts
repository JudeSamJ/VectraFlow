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
  created_at: string;
  updated_at: string;
}

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

export interface PaginatedResponse<T> {
  items: T[];
  next_cursor: string | null;
  total: number;
}
