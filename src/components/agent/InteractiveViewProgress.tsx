import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Playful progress indicator shown while the agent is still streaming an
 * interactive (HTML) view. There is no real "total" to measure against, so the
 * bar combines two honest signals:
 *  - elapsed time, eased so it eases toward (but never reaches) a ceiling, and
 *  - the live byte count of the html block as tokens stream in.
 * The result climbs smoothly, nudges forward whenever new content arrives, and
 * caps just under 100% until the block actually closes.
 */
const STAGES = [
  { at: 0, label: '正在构思视图结构…' },
  { at: 25, label: '正在编排数据与图表…' },
  { at: 50, label: '正在绘制交互组件…' },
  { at: 72, label: '正在打磨样式细节…' },
  { at: 88, label: '马上就好，正在收尾…' },
] as const;

function stageLabel(pct: number): string {
  let label = STAGES[0].label;
  for (const s of STAGES) if (pct >= s.at) label = s.label;
  return label;
}

export function InteractiveViewProgress({ contentLength }: { contentLength: number }) {
  const [pct, setPct] = useState(4);
  const startRef = useRef(Date.now());
  const maxLenRef = useRef(0);
  maxLenRef.current = Math.max(maxLenRef.current, contentLength);

  useEffect(() => {
    const id = setInterval(() => {
      setPct((prev) => {
        const elapsed = (Date.now() - startRef.current) / 1000;
        // Time-based ease toward a 92% ceiling (slows as it climbs).
        const timeTarget = 92 * (1 - Math.exp(-elapsed / 9));
        // Content-based signal: ~1% per 60 chars streamed, capped at 95%.
        const contentTarget = Math.min(95, maxLenRef.current / 60);
        const target = Math.max(timeTarget, contentTarget);
        if (target <= prev) return prev;
        // Approach the target smoothly so the bar never jumps.
        return Math.min(96, prev + (target - prev) * 0.25 + 0.3);
      });
    }, 120);
    return () => clearInterval(id);
  }, []);

  const rounded = Math.round(pct);

  return (
    <div className="my-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3.5">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="w-4 h-4 text-primary animate-pulse shrink-0" />
          {stageLabel(pct)}
        </span>
        <span className="text-sm font-semibold tabular-nums text-primary">{rounded}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-primary/15">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-200 ease-out"
          style={{ width: `${rounded}%` }}
        >
          <div className="h-full w-full animate-shimmer bg-[linear-gradient(110deg,transparent_30%,hsl(var(--primary-foreground)/0.35)_50%,transparent_70%)] bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  );
}
