import { type ReactNode, useState } from 'react';

interface Tab {
  label: string;
  key: string;
}

interface TabsProps {
  tabs: Tab[];
  defaultKey?: string;
  onChange?: (key: string) => void;
  children: (activeKey: string) => ReactNode;
}

export function Tabs({ tabs, defaultKey, onChange, children }: TabsProps) {
  const [active, setActive] = useState(defaultKey ?? tabs[0]?.key);

  const select = (key: string) => {
    setActive(key);
    onChange?.(key);
  };

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', marginBottom: 20 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => select(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 16px',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: active === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: active === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children(active)}
    </div>
  );
}
