# SYNAPSE FRONTEND SKILL
# AI-Native RAG Knowledge Assistant — Frontend Build Guide
# Version: 1.0.0

---

## OVERVIEW

This skill governs building the frontend for **Synapse**, a production-grade
RAG (Retrieval-Augmented Generation) knowledge assistant. The frontend is a
React SPA (Vite + TypeScript) that surfaces every backend capability described
in the Synapse backend specification. This is not a generic dashboard — every
screen exists to make the RAG pipeline observable, configurable, and usable.

---

## VISUAL DESIGN SYSTEM

### Theme (extracted from reference mockups)
```
Primary Background:     #0D0D0D  (near-black, deep dark)
Surface / Card:         #141414  (dark elevated panel)
Card Elevated:          #1A1A1A  (modal / popover surface)
Border Default:         rgba(255,255,255,0.07)
Border Emphasis:        rgba(255,255,255,0.12)

Accent Green (primary): #00C07A  (CTA buttons, active states, highlights)
Accent Green Glow:      rgba(0, 192, 122, 0.15)  (ambient ring on primary CTA)
Accent Green Dark:      #009960  (pressed / active CTA)

Text Primary:           #F2F2F2
Text Secondary:         #9A9A9A
Text Muted:             #5A5A5A
Text On Accent:         #001A0D  (dark text on green buttons)

Status High:            #FF4D4D  (high priority tasks / danger)
Status Medium:          #FFA043  (medium priority / warning)
Status Low:             #00C07A  (low priority / success — same as accent)
Status Pending:         #7C6DFF  (indexing / processing states)

Focus Ring:             0 0 0 2px rgba(0,192,122,0.5)
```

### Typography
```
Font Family:            'Inter', system-ui, -apple-system, sans-serif
Font Weight Regular:    400
Font Weight Medium:     500
Font Weight Semibold:   600

Size Scale:
  --text-xs:    11px  (status badges, captions, timestamps)
  --text-sm:    13px  (secondary labels, table cells, sidebar items)
  --text-base:  15px  (body copy, card content)
  --text-md:    17px  (card titles, section labels)
  --text-lg:    20px  (page headings, modal titles)
  --text-xl:    24px  (dashboard metric numbers)
  --text-2xl:   32px  (hero numbers, stat cards)
```

### Spacing & Layout
```
Border Radius:
  --radius-sm:   6px   (badges, chips, small buttons)
  --radius-md:   10px  (inputs, dropdowns, small cards)
  --radius-lg:   14px  (cards, panels, modals)
  --radius-xl:   20px  (full-screen panels, large modals)
  --radius-full: 9999px (pills, toggle tracks)

Spacing Tokens:
  4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px

Sidebar Width:     240px (collapsed: 64px)
Top Nav Height:    56px
Max Content Width: 1280px
Chat Panel Width:  420px (when open alongside retrieval view)
```

### Component Specs

#### Buttons
```
Primary (accent):
  bg: #00C07A | text: #001A0D | border: none
  hover: bg #009960 | active: scale(0.98)
  glow: box-shadow 0 0 20px rgba(0,192,122,0.25)
  height: 36px | padding: 0 16px | radius: var(--radius-md)

Secondary (ghost):
  bg: transparent | text: #F2F2F2 | border: 1px solid rgba(255,255,255,0.12)
  hover: bg rgba(255,255,255,0.05)

Destructive:
  bg: transparent | text: #FF4D4D | border: 1px solid rgba(255,77,77,0.3)
  hover: bg rgba(255,77,77,0.08)

Icon Button:
  width: 32px | height: 32px | radius: var(--radius-sm)
  hover: bg rgba(255,255,255,0.07)
```

#### Inputs & Text Fields
```
bg: rgba(255,255,255,0.04)
border: 1px solid rgba(255,255,255,0.08)
border-radius: var(--radius-md)
color: #F2F2F2
padding: 10px 12px
height: 38px (single line)
placeholder color: #5A5A5A
focus: border-color rgba(0,192,122,0.5) | box-shadow: var(--focus-ring)
```

#### Cards & Panels
```
bg: #141414
border: 1px solid rgba(255,255,255,0.07)
border-radius: var(--radius-lg)
padding: 20px
hover (interactive cards): border-color rgba(255,255,255,0.12)
                            bg rgba(255,255,255,0.015)
```

#### Status Badges
```
Ready/Low:     bg rgba(0,192,122,0.1)   | text #00C07A  | border rgba(0,192,122,0.2)
Indexing:      bg rgba(124,109,255,0.1) | text #7C6DFF  | border rgba(124,109,255,0.2)
Error:         bg rgba(255,77,77,0.1)   | text #FF4D4D  | border rgba(255,77,77,0.2)
Warning:       bg rgba(255,160,67,0.1)  | text #FFA043  | border rgba(255,160,67,0.2)
Pending:       bg rgba(90,90,90,0.15)   | text #9A9A9A  | border rgba(255,255,255,0.08)
height: 22px | padding: 0 8px | radius: var(--radius-sm) | font-size: 11px | font-weight: 500
```

#### Progress / Circular
```
Circular progress: SVG stroke-dasharray trick, stroke #00C07A on #1A1A1A track
Linear progress bar: height 4px | bg rgba(255,255,255,0.06) | fill #00C07A
  (gradient fill during active indexing)
```

#### Sidebar Navigation Items
```
Default:  text #9A9A9A | bg transparent
Hover:    text #F2F2F2 | bg rgba(255,255,255,0.05)
Active:   text #00C07A | bg rgba(0,192,122,0.08) | left-border 2px solid #00C07A
Font:     14px / 500
Height:   36px | padding: 0 12px | radius: var(--radius-md)
```

#### Chat Message Bubbles
```
User message:
  bg: rgba(0,192,122,0.08) | border: 1px solid rgba(0,192,122,0.12)
  border-radius: 14px 14px 4px 14px | max-width: 80%

Assistant message:
  bg: rgba(255,255,255,0.03) | border: 1px solid rgba(255,255,255,0.07)
  border-radius: 14px 14px 14px 4px | max-width: 90%

Citation chip:
  display: inline-flex | bg rgba(0,192,122,0.08) | border 1px solid rgba(0,192,122,0.2)
  color #00C07A | radius: var(--radius-sm) | font-size 11px | padding 2px 6px
  cursor pointer (opens citation panel on click)
```

#### SSE / Streaming UI
```
Typing indicator:  3 dots, each with staggered opacity animation (0.2s delay each)
Streaming text:    renders token by token, no flash/layout shift
Citation events:   appear below text block with slide-in-from-bottom animation
Stage events:      small chips above message with icon + label
  "Retrieving chunks..."  → magnifying glass icon, #7C6DFF
  "Reranking..."         → sort icon, #FFA043
  "Generating..."        → sparkle icon, #00C07A
```

---

## PROJECT ARCHITECTURE

### Tech Stack
```
Framework:         React 18 + TypeScript 5
Build Tool:        Vite 5
State Management:  Zustand (global) + TanStack Query (server state)
Routing:           TanStack Router (type-safe) or React Router v6
API Client:        Axios with interceptors (auth token refresh)
SSE Streaming:     native EventSource + custom hook useSSEStream
Real-time:         SSE (no WebSocket needed — backend is SSE)
Charts/Analytics:  Recharts
Code Highlighting: Shiki or Prism
Markdown:          react-markdown + remark-gfm
Form Handling:     React Hook Form + Zod
Icons:             Lucide React
Animations:        Framer Motion (page transitions, panel open/close)
File Upload:       react-dropzone
Toast/Notify:      Sonner
Date/Time:         date-fns
```

### Folder Structure
```
src/
├── api/                    # API client layer
│   ├── client.ts           # axios instance + interceptors
│   ├── auth.ts
│   ├── knowledgeBases.ts
│   ├── documents.ts
│   ├── chat.ts
│   ├── retrieval.ts
│   ├── evaluation.ts
│   ├── analytics.ts
│   ├── governance.ts
│   ├── admin.ts
│   └── types.ts            # all API type definitions (mirrors backend schemas)
│
├── components/
│   ├── ui/                 # base design system components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   ├── Dropdown.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Progress.tsx
│   │   ├── Tabs.tsx
│   │   ├── Table.tsx
│   │   ├── Toast.tsx
│   │   └── Skeleton.tsx
│   │
│   ├── layout/
│   │   ├── AppShell.tsx        # sidebar + topnav wrapper
│   │   ├── Sidebar.tsx         # collapsible navigation
│   │   ├── TopNav.tsx          # KB selector + user menu
│   │   └── PageHeader.tsx
│   │
│   ├── knowledge-base/
│   │   ├── KBCard.tsx
│   │   ├── KBCreateModal.tsx
│   │   ├── KBHealthBadge.tsx
│   │   └── PipelineConfigEditor.tsx
│   │
│   ├── documents/
│   │   ├── DocumentUploadDropzone.tsx
│   │   ├── DocumentCard.tsx
│   │   ├── DocumentStatusTracker.tsx   # real-time ingestion progress
│   │   ├── ChunkInspector.tsx
│   │   └── VersionHistory.tsx
│   │
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── CitationPanel.tsx           # slide-in citation detail
│   │   ├── StreamingMessage.tsx        # SSE token renderer
│   │   ├── RetrievalStageChip.tsx
│   │   └── AgentThinkingPanel.tsx      # multi-step agentic trace
│   │
│   ├── retrieval/
│   │   ├── RetrievalPlayground.tsx     # raw retrieval testing
│   │   ├── ChunkResultCard.tsx
│   │   └── RetrievalStrategySelector.tsx
│   │
│   ├── evaluation/
│   │   ├── EvalDatasetManager.tsx
│   │   ├── EvalRunComparison.tsx
│   │   ├── MetricGauges.tsx
│   │   └── SyntheticGenPanel.tsx
│   │
│   ├── analytics/
│   │   ├── LatencyChart.tsx
│   │   ├── TokenUsageChart.tsx
│   │   ├── CostEstimateCard.tsx
│   │   ├── TopCitedDocuments.tsx
│   │   └── NoContextRateGauge.tsx
│   │
│   ├── governance/
│   │   ├── PIIPolicyEditor.tsx
│   │   ├── AuditLogTable.tsx
│   │   └── AuditExportPanel.tsx
│   │
│   └── admin/
│       ├── CircuitBreakerStatus.tsx
│       ├── DLQPanel.tsx
│       ├── MilvusCollectionStats.tsx
│       └── EmbeddingCacheStats.tsx
│
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   │
│   ├── dashboard/
│   │   └── DashboardPage.tsx       # focus time, tasks, AI suggestion (matching mockup)
│   │
│   ├── knowledge-bases/
│   │   ├── KBListPage.tsx
│   │   ├── KBDetailPage.tsx
│   │   └── KBSettingsPage.tsx
│   │
│   ├── documents/
│   │   ├── DocumentsPage.tsx
│   │   └── DocumentDetailPage.tsx
│   │
│   ├── chat/
│   │   └── ChatPage.tsx            # main RAG Q&A interface
│   │
│   ├── conversations/
│   │   └── ConversationsPage.tsx   # history list (matches History mockup screen)
│   │
│   ├── retrieval/
│   │   └── RetrievalPage.tsx       # raw retrieval playground
│   │
│   ├── evaluation/
│   │   └── EvaluationPage.tsx
│   │
│   ├── analytics/
│   │   └── AnalyticsPage.tsx
│   │
│   ├── governance/
│   │   └── GovernancePage.tsx
│   │
│   └── admin/
│       └── AdminPage.tsx
│
├── hooks/
│   ├── useSSEStream.ts         # SSE chat streaming hook
│   ├── useFileUpload.ts        # multipart upload with progress
│   ├── useKBSelector.ts        # global KB context
│   └── useIntersectionObserver.ts  # infinite scroll
│
├── stores/
│   ├── authStore.ts
│   ├── kbStore.ts              # active KB, pipeline config
│   └── chatStore.ts            # conversation state
│
├── utils/
│   ├── formatters.ts           # bytes, tokens, latency, cost
│   ├── mimeIcons.ts            # MIME type → icon mapping
│   └── citations.ts            # parse citation markers from answer text
│
└── styles/
    ├── globals.css             # CSS custom properties, resets
    ├── tokens.css              # design tokens
    └── animations.css          # keyframes
```

---

## KEY SCREENS — BEHAVIOR CONTRACT

### 1. Dashboard Page
Matches the reference mockup:
- Greeting with user name + avatar
- "Today's Focus Time" card with circular progress (50% shown) + "View Task" button
- AI Suggestion card: context-aware tip with the Synapse sparkle icon
- "Start Focus Session" CTA — green glowing button, full width
- Task list: each task has a status dot (green = active), priority badge ("High" in green-bordered chip), tags, and a play button
- Top right: bell notification icon

### 2. Knowledge Base List
- Grid of KB cards (2-col on desktop, 1-col mobile)
- Each card: KB name, description, document count, chunk count, index status badge, last ingested time
- "+ New Knowledge Base" button top right
- Cards are clickable → KB detail page

### 3. KB Detail / Documents Page
- Header: KB name, status badge, action buttons (Reindex, Settings, Clone, Delete)
- Stats row: doc count, chunk count, total tokens, storage bytes
- Tab navigation: Documents | Pipeline Config | Chunks | Health
- Documents tab: dropzone (drag-and-drop upload) + document list table
  - Each row: filename, type icon, status (with animated progress for indexing), chunk count, uploaded time, actions
  - Clicking a document → document detail drawer with chunk list + version history

### 4. Chat Page (Core Feature)
- Left panel: Conversation list (sidebar) — matches "History" mockup screen
- Main panel: Chat interface
  - Top: KB name + model indicator
  - Message thread with user + assistant bubbles
  - SSE streaming: tokens appear one by one, stage chips appear above
  - Citations render as clickable `[1]` chips in the answer text
  - Clicking a citation opens a right-side drawer with:
    - Excerpt text
    - Source document + page number
    - Link to document
  - Bottom: input bar with Send button (green), optional agentic toggle, as_of date picker
- Agentic toggle: when on, shows "Agent mode" badge and the thinking trace panel above the answer (sub-questions + sufficiency checks visible step by step)

### 5. Document Detail (Summary Screen)
Matches the "Design Mockup" middle mockup screen:
- Document title + timestamp
- "The note has been summarized into key UI decisions for clarity" — auto-generated summary card
- Bullet list of key points (from extracted_summary)
- "Copy Summary" + "Save to History" buttons
- AI Suggestion chip below
- Clean, card-based layout with generous whitespace

### 6. Conversations / History Page
Matches the "History" right-side mockup screen:
- "← History" header with filter icon
- "List of Past Summaries" heading
- Each item: document/conversation title + timestamp, bullet point preview, "View Summary" button
- "View More" pagination button at bottom

### 7. Retrieval Playground
- Query input + strategy selector (dense / sparse / hybrid / multi_query / hyde / parent_document)
- Filter builder: tag, created_after, source_type
- Rerank toggle + top_k slider
- Results list: each result card shows score, rerank_score, excerpt, source + page number
- Latency indicator bottom right

### 8. Evaluation Page
- Two-panel: Dataset manager (left) | Run results (right)
- Dataset: create manual or generate synthetic (button → async job)
- Run history: table with pipeline config snapshot, metric summary row, "Compare" multi-select
- Compare view: side-by-side metric gauges (faithfulness, answer_relevancy, context_precision, context_recall, hit_rate)
- Per-item breakdown expandable drawer

### 9. Analytics Page
- Metric cards row: avg retrieval latency, avg generation latency, no-context rate, estimated daily cost
- Charts: latency p50/p95/p99 over time, token usage by provider, top cited documents bar chart
- Circuit breaker status cards with live state (closed / open / half-open)

### 10. Governance / PII Page
- PII policy editor: category checkboxes + action selector + region allowlist
- Audit log table: paginated, filterable by date / user / KB
- Export button → async CSV/JSON job with download link

### 11. Admin Page
- Milvus collection stats table
- DLQ (dead-letter queue) panel: document rows with error reason + manual retry button
- Embedding cache stats: hit rate gauge, total entries, size
- Circuit breaker panel (same as analytics, with manual trip/reset controls)
- Ingestion queue depth

---

## API INTEGRATION RULES

### Auth
- JWT access token (15 min) stored in memory (not localStorage)
- Refresh token (7 days) stored in httpOnly cookie (if available) or in-memory
- Axios interceptor auto-refreshes on 401 before retrying
- API key flow: `syn_live_` prefixed keys for programmatic access — display in user settings

### SSE Streaming (Chat)
```typescript
// Custom hook pattern
function useSSEStream(kbId: string) {
  const [stages, setStages] = useState<StageEvent[]>([]);
  const [tokens, setTokens] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);

  const stream = useCallback(async (query: string, conversationId: string) => {
    const es = new EventSource(`/api/v1/knowledge-bases/${kbId}/chat?...`);
    es.addEventListener('retrieval_complete', e => ...);
    es.addEventListener('generation_token', e => {
      setTokens(prev => prev + JSON.parse(e.data).token);
    });
    es.addEventListener('citations', e => setCitations(JSON.parse(e.data).citations));
    es.addEventListener('done', () => es.close());
  }, [kbId]);

  return { stream, stages, tokens, citations };
}
```

### File Upload with Progress
```typescript
// Multipart with onUploadProgress
axios.post(`/api/v1/knowledge-bases/${kbId}/documents/upload`, formData, {
  onUploadProgress: e => setProgress(Math.round((e.loaded / e.total!) * 100))
});
// Poll /documents/{doc_id}/status every 2s until status = "ready" | "failed"
```

### Pagination
- All list endpoints use cursor-based pagination
- TanStack Query `useInfiniteQuery` for scroll-based loading
- Load more button as fallback

---

## ANIMATION GUIDELINES

### Page Transitions
```
Page enter:  opacity 0→1 + translateY(8px→0) | duration 200ms | ease-out
Page exit:   opacity 1→0 | duration 150ms | ease-in
```

### Panel / Drawer
```
Right drawer (citation, chunk inspector):
  enter: translateX(100%→0) | duration 250ms | cubic-bezier(0.16, 1, 0.3, 1)
  exit:  translateX(0→100%) | duration 200ms | ease-in
```

### Chat Messages
```
New message appear: opacity 0→1 + translateY(6px→0) | duration 200ms
Streaming token: no animation (performance) — just append to text node
Citation chip: scale 0.8→1 + opacity 0→1 | stagger 80ms per chip
```

### Loading States
```
Skeleton: bg rgba(255,255,255,0.06) with shimmer animation
           (linear-gradient sweep left-to-right, 1.5s infinite)
Circular progress: SVG stroke-dashoffset animation
Indexing status: pulsing dot (opacity 1→0.4→1, 1s loop)
```

### Ingestion Progress
```
Document status transitions:
  pending → parsing → chunking → embedding → indexing → ready
  Each stage: progress bar fills proportionally, stage label updates
  Failed: shake animation on card + error red border flash
```

---

## REAL-TIME CONSIDERATIONS

### Polling Strategy
```
Document ingestion status:  poll every 2s while status != ready/failed
KB health:                  poll every 30s on KB detail page
Admin circuit breakers:     poll every 10s on admin page
Eval run status:            poll every 3s while status = running
```

### Optimistic Updates
```
Chat send:         immediately render user message bubble, then stream assistant
Document delete:   immediately remove from list, revert on API error
Feedback rating:   immediately update thumbs icon, sync in background
```

---

## ACCESSIBILITY & RESPONSIVENESS

### Breakpoints
```
Mobile:   < 640px  (single column, bottom nav)
Tablet:   640-1024px (collapsed sidebar, 2-col grid)
Desktop:  > 1024px (full sidebar, multi-panel layouts)
```

### Accessibility
- All interactive elements have visible focus rings (var(--focus-ring))
- Color is never the only status indicator (icon + text accompanies every badge)
- SSE streaming text is announced to screen readers via aria-live="polite"
- Modal traps focus (focus-trap-react)
- Sidebar collapse state persists in localStorage

---

## ERROR STATES

### API Errors — Consistent Pattern
```json
{"error": "VALIDATION_ERROR", "message": "...", "details": [...], "request_id": "uuid"}
```
- Parse error code → localized, human-readable message
- Toast for transient errors (network, rate limit)
- Inline error for form validation
- Full-page error boundary for fatal failures (Milvus unreachable, etc.)

### Empty States
```
No knowledge bases:   "Create your first knowledge base to start ingesting documents"
No documents in KB:   Dropzone-style empty state with drag-and-drop prompt
No conversations:     "Ask your first question to start a conversation"
No eval datasets:     "Create a dataset manually or generate synthetic Q&A pairs"
```

---

## SPECIFIC COMPONENT BEHAVIORS

### Pipeline Config Editor
- JSONB config rendered as structured form (not a raw textarea)
- Each section (parsing, chunking, embedding, indexing, retrieval, generation) is a collapsible accordion
- Changing embedding provider/model/dimensions shows a warning: "Changing embedding settings will trigger a full reindex of your knowledge base. This may take several minutes."
- Save button disabled until changes are made; shows dirty indicator

### Agentic Mode UI
- Toggle in chat input: "Agent mode" (default off)
- When on: chat messages show a thinking panel ABOVE the final answer
- Thinking panel: expandable, shows each step:
  - Sub-question text
  - Chunks retrieved for that step (count + preview)
  - Sufficiency verdict ("Continuing..." or "Sufficient — generating answer")
- Loop guard hit: shows "Partial answer (reached step limit of 4)" badge on message

### Document Version Diff
- Accessible from Document Detail → Versions tab
- Side-by-side diff view: left = old version text, right = new version text
- Chunk-level diff: added chunks highlighted in green, removed in red/strikethrough
- "Restore" button on old versions (with confirmation modal)

### Citation Panel (right drawer)
- Opens on citation chip click
- Shows: excerpt text (highlighted), document name, page number, chunk score
- "Go to Document" link
- Stable across conversation history (resolves against version-locked chunk IDs)

---

## DO NOT BUILD

- OAuth social login buttons (not in backend scope)
- Billing / subscription UI
- Team invite flows
- Slack/Gmail connectors (only webhook-based ingestion)
- Drag-and-drop workflow builder
- Any feature not backed by a real backend endpoint

---

## DELIVERABLES CHECKLIST

- [ ] Login / Register pages with JWT auth flow
- [ ] Dashboard page matching reference mockup (focus time, tasks, AI suggestion)
- [ ] Knowledge base list + create modal
- [ ] KB detail: documents tab with drag-and-drop upload + real-time status
- [ ] KB detail: pipeline config editor (structured, not raw JSON)
- [ ] KB detail: chunk inspector (browse/filter individual chunks)
- [ ] Chat page with SSE streaming, stage chips, citation panel, agentic mode
- [ ] Conversations / History page matching reference mockup
- [ ] Document summary view matching reference mockup
- [ ] Retrieval playground (raw retrieval, no generation)
- [ ] Evaluation: dataset manager + synthetic generation + run comparison
- [ ] Analytics: latency charts + token usage + cost + circuit breaker cards
- [ ] Governance: PII policy editor + audit log + export
- [ ] Admin: Milvus stats + DLQ + embedding cache + circuit breakers
- [ ] Prompt template manager (Jinja2 preview renderer)
- [ ] Feedback (thumbs up/down per message, promote to eval dataset)
- [ ] Responsive layout (mobile sidebar collapses to bottom nav)
- [ ] Skeleton loading states on all list views
- [ ] Error boundaries + consistent error toast system
- [ ] Dark theme throughout (no light mode toggle needed)
