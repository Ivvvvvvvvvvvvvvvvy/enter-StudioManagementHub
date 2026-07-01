import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { createPortal } from 'react-dom';
import { X, ZoomIn } from 'lucide-react';
import { SvgPreview, hashSvg } from '@/components/agent/SvgPreview';
import { ChartView } from '@/components/agent/chart/ChartView';
import { parseChartSpec, type ChartSpec } from '@/components/agent/chart/chartSpec';
import { InteractiveViewProgress } from '@/components/agent/InteractiveViewProgress';

/** Allow http(s), data and blob image sources; strip anything else. */
function safeUrlTransform(url: string): string {
  if (/^(https?:|data:image\/|blob:|\/)/i.test(url)) return url;
  return '';
}

/**
 * Normalise agent output so markdown parses correctly:
 *  - Rejoin image syntax / strip whitespace inside image URLs.
 *  - Ensure code fences (```) sit on their own line. Agents sometimes glue a
 *    fence directly onto preceding text (e.g. "...branding```html"), which
 *    stops markdown from recognising the code block and dumps raw HTML as text.
 */
function normalizeAgentMarkdown(raw: string): string {
  let text = raw.replace(
    /(!\[[^\]]*\])\s*\(\s*([^)]*?)\s*\)/g,
    (_m, alt: string, url: string) => `${alt}(${url.replace(/\s+/g, '')})`,
  );

  // Insert a newline before an opening fence that is glued to preceding text.
  // Matches ``` optionally followed by a language word, when not already at
  // the start of a line. Keeps the language identifier on the fence line.
  text = text.replace(/([^\n`])(```[a-zA-Z0-9]*)/g, '$1\n$2');

  return text;
}

function ImageLightbox({ src, alt }: { src: string; alt?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span className="group relative block my-3">
        <img
          src={src}
          alt={alt ?? ''}
          onClick={() => setOpen(true)}
          className="max-w-full h-auto rounded-lg border border-border cursor-zoom-in transition-shadow hover:shadow-card-hover"
        />
        <span className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-md bg-background/80 text-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <ZoomIn className="w-4 h-4" />
        </span>
      </span>
      {open && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={src}
            alt={alt ?? ''}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[95vw] max-h-[92vh] object-contain rounded-lg shadow-card-hover"
          />
        </div>,
        document.body,
      )}
    </>
  );
}

/** Extract text from a react-markdown code node's children. */
function nodeText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(nodeText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return nodeText((children as { props?: { children?: React.ReactNode } }).props?.children);
  }
  return '';
}

/** A piece of the message: plain markdown, a data-chart, or a finished SVG view. */
type Segment =
  | { kind: 'md'; text: string }
  | { kind: 'chart'; spec: ChartSpec; raw: string }
  | { kind: 'svg'; svg: string };

/**
 * Pull a complete <svg>...</svg> out of an arbitrary chunk of text (e.g. the
 * body of a ```svg or legacy ```html fence). Returns null if none/incomplete.
 */
function extractSvg(text: string): string | null {
  const m = /<svg[\s\S]*?<\/svg>/i.exec(text);
  return m ? m[0] : null;
}

/**
 * Split a message into top-level segments, pulling every COMPLETE data view out
 * of the markdown stream so it renders as a stable, top-level node.
 *
 * Recognised forms (all must be fully closed):
 *  - ANY fenced block whose body parses as a chart spec JSON (```chart preferred,
 *    but ```json / bare ``` also work — we are tolerant of the agent's fence),
 *  - a ```svg fenced block,
 *  - a legacy ```html fenced block that contains an <svg> (we lift the svg out),
 *  - a bare <svg>...</svg> sitting directly in the text.
 *
 * Keeping views as stable top-level siblings (keyed by content hash) means they
 * never remount during streaming, so there is zero height jitter.
 */
function splitSegments(normalized: string): Segment[] {
  const segments: Segment[] = [];
  // Match ANY fenced block (capturing optional lang + body) OR a bare <svg> tag.
  const re = /```([a-zA-Z0-9_-]*)[ \t]*\n?([\s\S]*?)```|(<svg[\s\S]*?<\/svg>)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(normalized)) !== null) {
    const lang = match[1]?.toLowerCase();
    const fenceBody = match[2] ?? '';
    const before = normalized.slice(lastIndex, match.index);

    // 1) Try to read the fence body as a chart spec, regardless of the language
    //    tag. This makes rendering work even when the agent emits ```json or a
    //    bare fence instead of ```chart.
    const spec = parseChartSpec(fenceBody);
    if (spec) {
      if (before.trim()) segments.push({ kind: 'md', text: before });
      segments.push({ kind: 'chart', spec, raw: fenceBody });
      lastIndex = re.lastIndex;
      continue;
    }

    // 2) Otherwise, lift an <svg> out of svg/html fences (or any fence holding one).
    const svg = match[3] ? match[3] : extractSvg(fenceBody);
    if (svg) {
      if (before.trim()) segments.push({ kind: 'md', text: before });
      segments.push({ kind: 'svg', svg });
      lastIndex = re.lastIndex;
      continue;
    }

    // 3) Not a data view — leave this fence to markdown (it stays in `rest`).
    void lang;
  }
  const rest = normalized.slice(lastIndex);
  if (rest.trim() || segments.length === 0) segments.push({ kind: 'md', text: rest });
  return segments;
}

function MarkdownText({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      urlTransform={safeUrlTransform}
      components={{
        img: ({ src, alt }) =>
          src ? <ImageLightbox src={String(src)} alt={alt} /> : null,
        code: ({ className, children, ...props }) => {
          const lang = /language-(\w+)/.exec(className ?? '')?.[1]?.toLowerCase();
          const isBlock = className?.includes('language-');
          // Defensive: any svg block that slips through still renders as a view.
          if (isBlock && (lang === 'svg' || lang === 'html')) {
            const svg = extractSvg(nodeText(children));
            if (svg) return <SvgPreview svg={svg} />;
          }
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

export function AgentMarkdown({ content, streaming = false }: { content: string; streaming?: boolean }) {
  const normalized = normalizeAgentMarkdown(content);

  // While streaming, a data view may be opened but not yet closed:
  //  - a bare <svg> with no matching </svg>, or
  //  - a ```chart / ```svg fence that has not been closed with ```.
  // Detect the trailing open view so we can show a progress placeholder instead
  // of partial markup.
  const lastOpenSvg = normalized.lastIndexOf('<svg');
  const openSvg =
    streaming && lastOpenSvg !== -1 && !/<\/svg>/i.test(normalized.slice(lastOpenSvg));

  // An unclosed ``` fence is still streaming. Treat any odd trailing fence as an
  // open data view so we show progress instead of a half-written code block.
  const openFenceTail = streaming ? lastUnclosedFence(normalized) : '';
  const openFence = openFenceTail.length > 0;
  const lastOpenFence = openFence ? normalized.lastIndexOf('```') : -1;

  const lastOpen = openFence ? lastOpenFence : lastOpenSvg;
  const open = openSvg || openFence;

  // Length of the view streamed so far -- feeds the progress estimate.
  const streamingLen = open ? normalized.length - lastOpen : 0;

  // Strip the still-streaming (unterminated) view before segmenting; the progress
  // indicator stands in for it until it closes.
  const body = open ? normalized.slice(0, lastOpen) : normalized;
  const segments = splitSegments(body);

  return (
    <div className="agent-markdown text-sm leading-relaxed text-foreground">
      {segments.map((seg, i) => {
        if (seg.kind === 'svg') return <SvgPreview key={`svg:${hashSvg(seg.svg)}`} svg={seg.svg} />;
        if (seg.kind === 'chart') return <ChartView key={`chart:${hashSvg(seg.raw)}`} spec={seg.spec} />;
        return <MarkdownText key={`md:${i}`} text={seg.text} />;
      })}
      {open && <InteractiveViewProgress contentLength={streamingLen} />}
    </div>
  );
}

/** True-ish helper: returns the tail after the last ``` if the fence count is odd. */
function lastUnclosedFence(text: string): string {
  const fences = text.match(/```/g);
  if (!fences || fences.length % 2 === 0) return '';
  const idx = text.lastIndexOf('```');
  return text.slice(idx);
}
