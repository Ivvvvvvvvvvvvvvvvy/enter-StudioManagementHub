import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, BarChart3 } from 'lucide-react';
import { type ChartSpec } from './chartSpec';
import { ChartRenderer } from './ChartRenderer';

/**
 * Card shell around a data-driven chart. The agent emits a tiny ChartSpec JSON;
 * ChartRenderer turns it into a static, on-brand SVG. Memoised + keyed by content
 * upstream so it never remounts during streaming (no flicker, no height jitter).
 */
export const ChartView = memo(function ChartView({ spec }: { spec: ChartSpec }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-3 rounded-xl border border-border bg-card overflow-hidden shadow-card">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <BarChart3 className="w-3.5 h-3.5 text-primary" />
          数据视图
        </span>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          全屏
        </button>
      </div>
      <div className="p-3">
        <ChartRenderer spec={spec} />
      </div>

      {open && createPortal(
        <div className="fixed inset-0 z-[60] flex flex-col bg-background/95 backdrop-blur-sm animate-fade-in">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <BarChart3 className="w-4 h-4 text-primary" />
              数据视图
            </span>
            <button
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-6 flex items-start justify-center" style={{ scrollbarGutter: 'stable' }}>
            <div className="w-full max-w-4xl">
              <ChartRenderer spec={spec} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
});
