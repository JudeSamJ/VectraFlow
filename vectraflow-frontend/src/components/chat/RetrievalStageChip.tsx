import { Search, ArrowUpDown, Sparkles } from 'lucide-react';

interface Props {
  stage: string;
  label: string;
}

const stageConfig: Record<string, { icon: typeof Search; color: string }> = {
  retrieval:  { icon: Search,      color: '#7C6DFF' },
  rerank:     { icon: ArrowUpDown, color: '#FFA043' },
  generating: { icon: Sparkles,    color: '#00C07A' },
};

export function RetrievalStageChip({ stage, label }: Props) {
  const config = stageConfig[stage] ?? stageConfig.retrieval;
  const Icon = config.icon;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 'var(--radius-sm)',
      background: `${config.color}18`, border: `1px solid ${config.color}30`,
      color: config.color, fontSize: 'var(--text-xs)', fontWeight: 500,
    }}>
      <Icon size={11} />
      {label}
    </span>
  );
}
