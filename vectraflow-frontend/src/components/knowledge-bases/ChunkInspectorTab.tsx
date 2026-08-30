import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { kbApi } from '../../api/knowledgeBases';
import { documentsApi } from '../../api/documents';

interface Props {
  kbId: string;
}

const PAGE_SIZE = 20;

export function ChunkInspectorTab({ kbId }: Props) {
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['kb-chunks', kbId, offset],
    queryFn: () => kbApi.chunks(kbId, PAGE_SIZE, offset).then(r => r.data),
  });

  const { data: docs = [] } = useQuery({
    queryKey: ['documents', kbId],
    queryFn: () => documentsApi.list(kbId).then(r => r.data),
  });
  const filenameById = Object.fromEntries(docs.map(d => [d.id, d.filename]));

  const toggle = (id: string) => {
    setExpanded(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} height={48} />)}
        </div>
      </Card>
    );
  }

  const chunks = data?.chunks ?? [];

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>Chunk Inspector</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
            Read directly from Zilliz — {data?.total ?? 0} chunks indexed for this knowledge base
          </p>
        </div>
      </div>

      {chunks.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: '32px 0' }}>
          No chunks indexed yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {chunks.map(chunk => {
            const isOpen = expanded.has(chunk.chunk_id);
            return (
              <div
                key={chunk.chunk_id}
                style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px 14px', cursor: 'pointer' }}
                onClick={() => toggle(chunk.chunk_id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isOpen ? 8 : 0 }}>
                  <FileText size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', flex: 1 }}>
                    {filenameById[chunk.document_id] ?? `doc ${chunk.document_id.slice(0, 8)}…`}
                    {chunk.section_heading ? ` — ${chunk.section_heading}` : ''}
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    #{chunk.chunk_index} · {chunk.token_count} tok
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6,
                    display: isOpen ? 'block' : '-webkit-box',
                    WebkitLineClamp: isOpen ? undefined : 2,
                    WebkitBoxOrient: isOpen ? undefined : 'vertical',
                    overflow: isOpen ? 'visible' : 'hidden',
                  }}
                >
                  {chunk.text}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <Button
          variant="secondary" size="sm"
          onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
          disabled={offset === 0 || isFetching}
        >
          Previous
        </Button>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {chunks.length ? `${offset + 1}–${offset + chunks.length}` : '0'} of {data?.total ?? 0}
        </span>
        <Button
          variant="secondary" size="sm"
          onClick={() => setOffset(o => o + PAGE_SIZE)}
          disabled={!data?.has_more || isFetching}
        >
          Next
        </Button>
      </div>
    </Card>
  );
}
