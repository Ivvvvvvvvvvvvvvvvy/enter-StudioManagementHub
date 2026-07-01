# Fix: Interactive HTML preview flickers / jitters / lags during streaming

## Context
The Zenith AI agent's interactive HTML charts (ECharts in a sandboxed iframe via
`HtmlPreview`) flicker, jump, and lag continuously. Previous fixes targeted the
iframe's internal height-measurement loop (dead-band, debounce, freeze). Those
helped the isolated case but the real app still flickers, because the true root
cause is a **React-vs-DOM height conflict during streaming**, not the inner loop.

### Root cause
- During a streaming turn, every token updates `turns` →
  `useCustomAgentChat.semanticMessages` recomputes → `AIAnalystPage` re-renders →
  `AgentMarkdown` re-runs `ReactMarkdown` → `HtmlPreview` / `SandboxFrame`
  re-render many times per second.
- `SandboxFrame` (src/components/agent/HtmlPreview.tsx, line ~143) hardcodes
  `style={{ ... height: 320 ... }}` in JSX, while the iframe's self-measuring
  script sets the *real* height imperatively via `ref.current.style.height`.
- On each re-render React reconciles the inline `style` object and **overwrites
  the imperatively-set height back to 320px**. With charts sized in `%`/`vh`,
  this shrinks inner content → inner `ResizeObserver` re-fires → re-posts a new
  height → React resets it again → visible flicker + layout jank that lasts the
  whole time trailing analysis text streams after the chart.
- Re-parsing the full markdown (incl. the large HTML code block) on every token
  also causes the "卡"/lag.

## Approach (single file: `src/components/agent/HtmlPreview.tsx`)
Make React the **single source of truth** for height and stop unnecessary
re-renders so React never fights the DOM.

1. **Height via React state, not raw DOM mutation.**
   - In `SandboxFrame`, add `const [height, setHeight] = useState(320)`.
   - The `message` handler calls `setHeight(next)` (keep the clamp 120–2400 and
     the ±3px dead-band guard against `appliedRef` to avoid redundant updates).
   - Render `style={{ ..., height }}` from state. Now the JSX value always equals
     the last measured height, so re-renders can't reset it. Remove the
     hardcoded `height: 320` literal and the direct `ref.current.style.height`
     writes.

2. **Memoize `srcDoc` so the iframe never reloads.**
   - `const doc = useMemo(() => wrapHtml(html, channel), [html, channel])` and
     pass `srcDoc={doc}`. Prevents any chance of an iframe reload (ECharts
     re-init) when `html`/`channel` are unchanged.

3. **Stop parent-driven re-renders from reaching the iframe.**
   - Wrap `SandboxFrame` in `React.memo` (props `html`, `channel`, `title`,
     `className` are all stable strings once the code fence closes), so streaming
     of trailing text no longer re-renders the iframe subtree at all. This kills
     both the flicker and the lag.
   - Optionally wrap the exported `HtmlPreview` in `React.memo` keyed on `html`
     for the same reason at the outer boundary.

4. Keep the existing inner-script safeguards (debounce + dead-band + freeze after
   stable / 6s hard stop) — they remain correct and now cooperate with state
   instead of being overwritten.

No changes needed to `AgentMarkdown.tsx`, `AgentMessage.tsx`, or the chat hook:
once `HtmlPreview` is memoized and owns its height via state, parent re-renders
during streaming are harmless.

## Critical files
- `src/components/agent/HtmlPreview.tsx` — all edits here.

## Verification
1. Lint: `run_lint` → 0 errors.
2. Headless reproduction (Playwright, /tmp): mount the memoized component pattern
   with an ECharts `height:100%` chart inside the sandboxed iframe; simulate
   repeated parent re-renders (force prop-stable re-renders ~10x/s for several
   seconds) and assert the applied iframe height changes only a tiny, bounded
   number of times and then stays constant (no oscillation) — i.e. React no
   longer resets to 320.
3. Live app: log in (admin 138-0000-0001 / admin888) → Zenith AI → ask for a
   line chart → confirm the chart renders once, holds a stable height through the
   trailing-text streaming, and does not flicker/jump/lag. Fullscreen view still
   works.
4. Confirm no iframe reload mid-stream (ECharts initialises exactly once).
