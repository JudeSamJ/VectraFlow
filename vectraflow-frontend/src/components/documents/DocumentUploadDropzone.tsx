import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LinearProgress } from '../ui/Progress';
import { Skeleton } from '../ui/Skeleton';
import { documentsApi } from '../../api/documents';
import { formatRelativeTime } from '../../utils/formatters';
import type { DocumentStatus } from '../../api/types';

const statusVariant: Record<DocumentStatus, any> = {
  pending: 'pending', parsing: 'indexing', chunking: 'indexing',
  embedding: 'indexing', indexing: 'indexing', ready: 'ready', failed: 'error',
};

const statusProgress: Record<DocumentStatus, number> = {
  pending: 5, parsing: 20, chunking: 40, embedding: 65, indexing: 85, ready: 100, failed: 0,
};

interface DocumentsTabProps {
  kbId: string;
}

export function DocumentsTab({ kbId }: DocumentsTabProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const qc = useQueryClient();
  const prevStatuses = useRef<Record<string, string>>({});

  const { data: rawData, isLoading, refetch } = useQuery({
    queryKey: ['documents', kbId],
    queryFn: () => documentsApi.list(kbId).then(r => r.data),
    refetchInterval: 5000,
  });
  const docs = Array.isArray(rawData) ? rawData : [];

  // When any document transitions to ready/failed, refresh the KB stats card
  useEffect(() => {
    const changed = docs.some(d => {
      const prev = prevStatuses.current[d.id];
      return prev && prev !== d.status && (d.status === 'ready' || d.status === 'failed');
    });
    if (changed) {
      qc.invalidateQueries({ queryKey: ['kb', kbId] });
      qc.invalidateQueries({ queryKey: ['knowledge-bases'] });
    }
    docs.forEach(d => { prevStatuses.current[d.id] = d.status; });
  }, [docs, kbId, qc]);

  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    setUploadProgress(0);
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    try {
      await documentsApi.upload(kbId, fd, setUploadProgress);
      refetch();
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [kbId, refetch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, disabled: uploading });

  const del = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    await documentsApi.delete(kbId, docId);
    refetch();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border-emphasis)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '32px 24px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: isDragActive ? 'rgba(0,192,122,0.04)' : 'transparent',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <input {...getInputProps()} />
        <Upload size={24} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          {uploading ? `Uploading… ${uploadProgress}%` : isDragActive ? 'Drop files here' : 'Drag & drop files, or click to browse'}
        </p>
        {uploading && <LinearProgress value={uploadProgress} gradient style={{ marginTop: 12 }} />}
      </div>

      {/* Document list */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <Skeleton key={i} height={56} />)}
        </div>
      ) : !docs.length ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: '24px 0' }}>
          No documents yet. Upload your first document above.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {docs.map(doc => (
            <Card key={doc.id} style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileText size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 500 }}>{doc.filename}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{doc.chunk_count} chunks</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{formatRelativeTime(doc.created_at)}</span>
                <Badge variant={statusVariant[doc.status]}>{doc.status}</Badge>
                <Button variant="icon" onClick={() => del(doc.id)}><Trash2 size={13} /></Button>
              </div>
              {doc.status !== 'ready' && doc.status !== 'failed' && (
                <div style={{ marginTop: 8 }}>
                  <LinearProgress value={statusProgress[doc.status]} gradient />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
