import { memo, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, BarChart3 } from 'lucide-react';
import DOMPurify from 'dompurify';

/**
 * Stable, collision-resistant key for a chunk of markup (length + rolling hash).
 * Used to key the component so identical SVG keeps the same React identity across
 * streaming re-renders and never remounts.
 */
export function hashSvg(svg: string): string {
  let h = 5381;
  for (let i = 0; i < svg.length; i++) h = ((h << 5) + h + svg.charCodeAt(i)) | 0;
  return `${svg.length}:${h}`;
}

/**
 * Sanitise agent-provided SVG before inlining it into the DOM.
 *
 * SVG can carry active content (<script>, on* handlers, <foreignObject>,
 * javascript: hrefs). DOMPurify in SVG profile strips all of that and keeps only
 * safe drawing primitives, so the markup renders as a static vector graphic with
 * zero script execution -- no iframe, no sandbox, no height measurement needed.
 */
function sanitizeSvg(raw: string): string {
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['use'],
    FORBID_TAGS: ['script', 'foreignObject', 'a'],
    FORBID_ATTR: ['onload', 'onclick', 'onmouseover'],
  });
}

/**
 * Make an SVG responsive: ensure it scales to its container width while keeping
 * aspect ratio. We strip any hard-coded width/height (they cause overflow or
 * fixed sizing) and rely on viewBox + CSS for fluid layout.
 */
function makeResponsive(svg: string): string {
  let out = svg;
  // Drop literal width/height attributes on the root <svg> so CSS can size it.
  out = out.replace(/(<svg\b[^>]*?)\swidth="[^"]*"/i, '$1');
  out = out.replace(/(<svg\b[^>]*?)\sheight="[^"]*"/i, '$1');
  // Guarantee a sensible preserveAspectRatio if none is set.
  if (!/preserveAspectRatio=/i.test(out)) {
    out = out.replace(/<svg\b/i, '<svg preserveAspectRatio="xMidYMid meet"');
  }
  return out;
}

function SvgCanvas({ svg, className }: { svg: string; className?: string }) {
  const cleaned = useMemo(() => makeResponsive(sanitizeSvg(svg)), [svg]);
  return (
    <div
      className={className}
      // The markup is sanitised above; inlining lets the browser size the SVG by
      // its own intrinsic viewBox, so there is no measurement loop and no jitter.
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  );
}

export const SvgPreview = memo(function SvgPreview({ svg }: { svg: string }) {
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
      <SvgCanvas
        svg={svg}
        className="block p-3 [&>svg]:block [&>svg]:w-full [&>svg]:h-auto"
      />

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
            <SvgCanvas
              svg={svg}
              className="w-full max-w-5xl [&>svg]:block [&>svg]:w-full [&>svg]:h-auto"
            />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
});
