import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { kbApi } from '../../api/knowledgeBases';

interface Props {
  kbId: string;
  pipelineConfig: Record<string, any>;
}

const DEFAULT_MAX_CHUNK_SIZE = 512;

export function PipelineConfigTab({ kbId, pipelineConfig }: Props) {
  const qc = useQueryClient();
  const [maxChunkSize, setMaxChunkSize] = useState(
    pipelineConfig?.chunking?.max_chunk_size ?? DEFAULT_MAX_CHUNK_SIZE
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMaxChunkSize(pipelineConfig?.chunking?.max_chunk_size ?? DEFAULT_MAX_CHUNK_SIZE);
  }, [pipelineConfig]);

  const saveMutation = useMutation({
    mutationFn: () =>
      kbApi.update(kbId, {
        pipeline_config: {
          ...pipelineConfig,
          chunking: { ...pipelineConfig?.chunking, max_chunk_size: maxChunkSize },
        },
      }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      qc.invalidateQueries({ queryKey: ['kb', kbId] });
    },
  });

  return (
    <Card>
      <p style={{ fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: 4 }}>Chunking</p>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
        Controls how large each indexed chunk can grow before the semantic chunker splits to a new one.
        This only applies to documents ingested <em>after</em> you save — it won't retroactively re-chunk
        documents already indexed (there's no working "Reindex" yet to apply it retroactively; re-upload
        a document to pick up a new setting for it).
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 320, marginBottom: 20 }}>
        <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Max chunk size (tokens)
        </label>
        <input
          type="number"
          min={64}
          max={4096}
          step={32}
          value={maxChunkSize}
          onChange={e => setMaxChunkSize(Number(e.target.value))}
          style={{
            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 'var(--radius-md)', color: '#f2f2f2',
            padding: '8px 12px', fontSize: 'var(--text-sm)', outline: 'none',
          }}
        />
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          Default is 512. Smaller chunks retrieve more precisely but with less surrounding context;
          larger chunks give the LLM more context per citation but retrieve less precisely.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
        {saved && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--accent)' }}>
            <CheckCircle size={14} /> Saved
          </span>
        )}
        {saveMutation.isError && (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--status-high)' }}>Failed to save — try again</span>
        )}
      </div>
    </Card>
  );
}
