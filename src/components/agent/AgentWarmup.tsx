import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Rotating, shimmering "the agent is thinking" label. Used inside the thinking
 * block header while reasoning streams, so the wait feels alive. Renders inline
 * (no card shell) so it can sit in a collapsible header next to a chevron.
 */
const PHRASES_ZH = [
  '正在翻阅经营数据…',
  '精心构建洞察中…',
  '正在连接会员与营收…',
  '酝酿专属建议中…',
  '正在打磨结论…',
] as const;

const PHRASES_EN = [
  'Reading your data…',
  'Crafting insights…',
  'Connecting the dots…',
  'Shaping advice…',
  'Polishing the answer…',
] as const;

export function WarmupLabel({ locale = 'zh' }: { locale?: 'en' | 'zh' }) {
  const phrases = locale === 'en' ? PHRASES_EN : PHRASES_ZH;
  const [idx, setIdx] = useState(0);
  const ref = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      ref.current = (ref.current + 1) % phrases.length;
      setIdx(ref.current);
    }, 2200);
    return () => clearInterval(id);
  }, [phrases.length]);

  return (
    <span className="flex items-center gap-2.5 min-w-0">
      {/* Pulsing brand orb with a soft halo */}
      <span className="relative flex h-5 w-5 items-center justify-center shrink-0">
        <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
        </span>
      </span>

      {/* Rotating, shimmering phrase */}
      <span
        key={idx}
        className="animate-fade-in truncate bg-[linear-gradient(110deg,hsl(var(--foreground))_30%,hsl(var(--primary))_50%,hsl(var(--foreground))_70%)] bg-[length:200%_100%] bg-clip-text text-sm font-medium text-transparent animate-shimmer"
      >
        {phrases[idx]}
      </span>

      {/* Bouncing dots */}
      <span className="flex items-center gap-1 shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce" />
      </span>
    </span>
  );
}
