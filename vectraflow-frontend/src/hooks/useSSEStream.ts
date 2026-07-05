import { useCallback, useState } from 'react';
import type { Citation } from '../stores/chatStore';

export interface StageEvent {
  stage: string;
  label: string;
}

export function useSSEStream(kbId: string) {
  const [stages, setStages] = useState<StageEvent[]>([]);
  const [streaming, setStreaming] = useState(false);

  const stream = useCallback(
    (
      query: string,
      conversationId: string | null,
      agentMode: boolean,
      onToken: (token: string) => void,
      onDone: (citations: Citation[]) => void,
    ) => {
      const params = new URLSearchParams({
        query,
        agent_mode: String(agentMode),
        ...(conversationId ? { conversation_id: conversationId } : {}),
      });
      const url = `/api/v1/knowledge-bases/${kbId}/chat?${params}`;
      const token = (window as any).__vectraflow_token;
      // EventSource doesn't support auth headers — pass via query for SSE
      const es = new EventSource(token ? `${url}&token=${token}` : url);

      setStages([]);
      setStreaming(true);
      let citations: Citation[] = [];

      es.addEventListener('retrieval_complete', () => {
        setStages(prev => [...prev, { stage: 'retrieval', label: 'Retrieving chunks...' }]);
      });
      es.addEventListener('rerank_complete', () => {
        setStages(prev => [...prev, { stage: 'rerank', label: 'Reranking...' }]);
      });
      es.addEventListener('generation_start', () => {
        setStages(prev => [...prev, { stage: 'generating', label: 'Generating...' }]);
      });
      es.addEventListener('generation_token', e => {
        const data = JSON.parse((e as MessageEvent).data);
        onToken(data.token);
      });
      es.addEventListener('citations', e => {
        const data = JSON.parse((e as MessageEvent).data);
        citations = data.citations;
      });
      es.addEventListener('done', () => {
        es.close();
        setStreaming(false);
        onDone(citations);
      });
      es.onerror = () => {
        es.close();
        setStreaming(false);
        onDone(citations);
      };

      return () => es.close();
    },
    [kbId]
  );

  return { stream, stages, streaming };
}
