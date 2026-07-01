import { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CourseTypeBadge, getCourseTypeSolidClass, formatCurrency } from '@/components/shared/badges';
import {
  Plus, Pencil, Trash2, Clock, Users, Sparkles, Loader2, AlertCircle,
  Play, RefreshCw, FileText, Images, Video, ChevronRight, DollarSign,
  BookOpen, Upload, Check, X, Wand2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useCourseAI, type GenerateParams, type CourseMedia } from '@/hooks/useCourseAI';
import type { Course } from '@/lib/types';

const PRESET_TYPES = ['yoga', 'pilates', 'meditation', 'barre', 'hiit', 'dance', 'boxing', 'stretching', 'spin'];
const EMPTY_FORM = { name: '', type: 'yoga', coachId: '', capacity: 12, duration: 60, price: 120, description: '', notes: '' };

// ── Shared pending banner ─────────────────────────────────────────────────────

function PendingBanner({ label, onApply, onDiscard, applying }: {
  label: string; onApply: () => void; onDiscard: () => void; applying: boolean;
}) {
  return (
    <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mt-2">
      <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
        <Check className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-muted-foreground" onClick={onDiscard} disabled={applying}>
          <X className="w-3 h-3 mr-1" />Discard
        </Button>
        <Button size="sm" className="h-6 text-xs px-2" onClick={onApply} disabled={applying}>
          {applying ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
          Apply Changes
        </Button>
      </div>
    </div>
  );
}

// ── Description Section ───────────────────────────────────────────────────────

type DescMode = 'view' | 'manual' | 'ai' | 'ai-generating' | 'ai-pending';

function DescriptionSection({ media, params, saveMedia, generateTextDraft, draftGenerating, draftGeneratingPart, draftProgress }: {
  media: CourseMedia | null;
  params: GenerateParams;
  saveMedia: (u: Partial<Pick<CourseMedia, 'description' | 'images' | 'video_url'>>) => Promise<void>;
  generateTextDraft: (p: GenerateParams) => Promise<string>;
  draftGenerating: boolean;
  draftGeneratingPart: string | null;
  draftProgress: string | null;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<DescMode>('view');
  const [manualText, setManualText] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [pendingDesc, setPendingDesc] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isGenerating = draftGenerating && draftGeneratingPart === 'text';

  const startManual = () => { setManualText(media?.description ?? ''); setMode('manual'); };
  const saveManual = async () => {
    setApplying(true);
    try { await saveMedia({ description: manualText }); setMode('view'); toast({ title: 'Description saved' }); }
    catch { toast({ title: 'Save failed', variant: 'destructive' }); }
    finally { setApplying(false); }
  };

  const runAI = async () => {
    setErr(null); setMode('ai-generating');
    try {
      const desc = await generateTextDraft({ ...params, userPrompt: aiPrompt || undefined });
      setPendingDesc(desc); setMode('ai-pending');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Generation failed'); setMode('ai');
    }
  };

  const applyAI = async () => {
    if (!pendingDesc) return;
    setApplying(true);
    try { await saveMedia({ description: pendingDesc }); setPendingDesc(null); setMode('view'); toast({ title: 'Description updated' }); }
    catch { toast({ title: 'Save failed', variant: 'destructive' }); }
    finally { setApplying(false); }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Description
          {media?.description && mode === 'view' && <span className="text-xs text-primary font-normal">Ready</span>}
        </div>
        {mode === 'view' && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={startManual}><Pencil className="w-3 h-3" />Edit</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setMode('ai')}><Wand2 className="w-3 h-3" />AI Generate</Button>
          </div>
        )}
        {(mode === 'manual' || mode === 'ai' || mode === 'ai-generating' || mode === 'ai-pending') && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setMode('view'); setErr(null); setPendingDesc(null); }}>
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Manual edit */}
      {mode === 'manual' && (
        <div className="p-4 space-y-3">
          <Textarea rows={4} className="resize-none text-sm" value={manualText} onChange={e => setManualText(e.target.value)} placeholder="Write the course description..." />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setMode('view')}>Cancel</Button>
            <Button size="sm" onClick={saveManual} disabled={applying}>
              {applying ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}Save
            </Button>
          </div>
        </div>
      )}

      {/* AI input */}
      {mode === 'ai' && (
        <div className="p-4 space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Describe what you want (optional)</Label>
            <Textarea rows={2} className="resize-none text-sm" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. beginner-friendly, focus on breathing, warm and inviting tone" />
          </div>
          {err && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{err}</p>}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setMode('view')}>Cancel</Button>
            <Button size="sm" onClick={runAI} disabled={draftGenerating}>
              <Sparkles className="w-3 h-3 mr-1" />Generate
            </Button>
          </div>
        </div>
      )}

      {/* AI generating */}
      {mode === 'ai-generating' && (
        <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{isGenerating && draftProgress ? draftProgress : 'Generating...'}</span>
        </div>
      )}

      {/* AI pending confirm */}
      {mode === 'ai-pending' && pendingDesc && (
        <div className="p-4 space-y-3">
          <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2"><span className="text-xs bg-primary text-primary-foreground rounded px-1.5 py-0.5 font-medium">New</span></div>
            <p className="text-sm text-foreground leading-relaxed">{pendingDesc}</p>
          </div>
          <PendingBanner label="Description ready — review and apply" onApply={applyAI} onDiscard={() => { setPendingDesc(null); setMode('view'); }} applying={applying} />
        </div>
      )}

      {/* View */}
      {mode === 'view' && (
        <div className="px-4 py-3">
          {media?.description
            ? <p className="text-sm text-foreground leading-relaxed">{media.description}</p>
            : <p className="text-sm text-muted-foreground italic">No description yet. Edit manually or generate with AI.</p>}
        </div>
      )}
    </div>
  );
}

// ── Images Section ────────────────────────────────────────────────────────────

type ImgMode = 'view' | 'upload' | 'ai' | 'ai-generating' | 'ai-pending' | 'upload-preview';

function ImagesSection({ media, params, saveMedia, uploadFile, generateImagesDraft, draftGenerating, draftGeneratingPart, draftProgress }: {
  media: CourseMedia | null;
  params: GenerateParams;
  saveMedia: (u: Partial<Pick<CourseMedia, 'description' | 'images' | 'video_url'>>) => Promise<void>;
  uploadFile: (file: File, slot: string) => Promise<string>;
  generateImagesDraft: (p: GenerateParams) => Promise<string[]>;
  draftGenerating: boolean;
  draftGeneratingPart: string | null;
  draftProgress: string | null;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImgMode>('view');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [pendingImages, setPendingImages] = useState<string[] | null>(null);
  const [applying, setApplying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isGenerating = draftGenerating && draftGeneratingPart === 'images';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 3);
    setSelectedFiles(files);
    setPreviewUrls(files.map(f => URL.createObjectURL(f)));
    setMode('upload-preview');
  };

  const applyUpload = async () => {
    setApplying(true);
    try {
      const urls = await Promise.all(selectedFiles.map((f, i) => uploadFile(f, `img-${i}`)));
      await saveMedia({ images: urls });
      setPreviewUrls([]); setSelectedFiles([]); setMode('view');
      toast({ title: 'Images updated' });
    } catch (e: unknown) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally { setApplying(false); }
  };

  const runAI = async () => {
    setErr(null); setMode('ai-generating');
    try {
      const imgs = await generateImagesDraft({ ...params, imagePrompt: aiPrompt || undefined });
      setPendingImages(imgs); setMode('ai-pending');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Generation failed'); setMode('ai');
    }
  };

  const applyAI = async () => {
    if (!pendingImages) return;
    setApplying(true);
    try { await saveMedia({ images: pendingImages }); setPendingImages(null); setMode('view'); toast({ title: 'Images updated' }); }
    catch { toast({ title: 'Save failed', variant: 'destructive' }); }
    finally { setApplying(false); }
  };

  const reset = () => { setMode('view'); setErr(null); setPendingImages(null); setPreviewUrls([]); setSelectedFiles([]); };

  const ImageGrid = ({ urls, badge }: { urls: string[]; badge?: string }) => (
    <div className="grid grid-cols-3 gap-2">
      {urls.slice(0, 3).map((url, i) => (
        <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          <img src={url} alt={`img ${i + 1}`} className="w-full h-full object-cover" crossOrigin="anonymous" />
          {badge && <span className="absolute top-1 left-1 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium">{badge}</span>}
        </div>
      ))}
    </div>
  );

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Images className="w-3.5 h-3.5 text-muted-foreground" /> Gallery Images
          {(media?.images?.length ?? 0) > 0 && mode === 'view' && <span className="text-xs text-primary font-normal">{media!.images.length} images</span>}
        </div>
        {mode === 'view' && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setMode('upload'); setTimeout(() => fileRef.current?.click(), 50); }}>
              <Upload className="w-3 h-3" />Upload
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setMode('ai')}>
              <Wand2 className="w-3 h-3" />AI Generate
            </Button>
          </div>
        )}
        {mode !== 'view' && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={reset}><X className="w-3.5 h-3.5" /></Button>
        )}
      </div>

      {/* Upload mode */}
      {(mode === 'upload' || mode === 'upload-preview') && (
        <div className="p-4 space-y-3">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
            onChange={handleFileSelect} />
          {previewUrls.length > 0 ? (
            <>
              <ImageGrid urls={previewUrls} badge="New" />
              <p className="text-xs text-muted-foreground">{previewUrls.length} file(s) selected. Click "Apply" to save.</p>
              <PendingBanner label="Images ready — review and apply" onApply={applyUpload} onDiscard={reset} applying={applying} />
            </>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}>
              <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Click to select up to 3 images</p>
              <p className="text-xs text-muted-foreground/70 mt-1">JPEG, PNG, WebP supported</p>
            </div>
          )}
        </div>
      )}

      {/* AI input */}
      {mode === 'ai' && (
        <div className="p-4 space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Describe the visual style (optional)</Label>
            <Textarea rows={2} className="resize-none text-sm" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. outdoor studio, warm sunset tones, natural wood equipment" />
          </div>
          {err && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{err}</p>}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={reset}>Cancel</Button>
            <Button size="sm" onClick={runAI} disabled={draftGenerating}>
              <Sparkles className="w-3 h-3 mr-1" />Generate
            </Button>
          </div>
        </div>
      )}

      {/* AI generating */}
      {mode === 'ai-generating' && (
        <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{isGenerating && draftProgress ? draftProgress : 'Generating images...'}</span>
        </div>
      )}

      {/* AI pending */}
      {mode === 'ai-pending' && pendingImages && pendingImages.length > 0 && (
        <div className="p-4 space-y-3">
          <ImageGrid urls={pendingImages} badge="New" />
          <PendingBanner label="Images ready — review and apply" onApply={applyAI} onDiscard={() => { setPendingImages(null); setMode('view'); }} applying={applying} />
        </div>
      )}

      {/* View */}
      {mode === 'view' && (
        <div className="p-3">
          {(media?.images?.length ?? 0) > 0 ? (
            <ImageGrid urls={media!.images} />
          ) : (
            <p className="text-sm text-muted-foreground italic px-1 py-1">No images yet. Upload your own or generate with AI.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Video Section ─────────────────────────────────────────────────────────────

type VideoMode = 'view' | 'upload' | 'upload-preview' | 'ai' | 'ai-generating' | 'ai-pending';

function VideoSection({ media, params, saveMedia, uploadFile, generateVideoDraft, draftGenerating, draftGeneratingPart, draftProgress }: {
  media: CourseMedia | null;
  params: GenerateParams;
  saveMedia: (u: Partial<Pick<CourseMedia, 'description' | 'images' | 'video_url'>>) => Promise<void>;
  uploadFile: (file: File, slot: string) => Promise<string>;
  generateVideoDraft: (p: GenerateParams) => Promise<string | null>;
  draftGenerating: boolean;
  draftGeneratingPart: string | null;
  draftProgress: string | null;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<VideoMode>('view');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [pendingVideo, setPendingVideo] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pendingPlaying, setPendingPlaying] = useState(false);
  const [applying, setApplying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isGenerating = draftGenerating && draftGeneratingPart === 'video';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMode('upload-preview');
  };

  const applyUpload = async () => {
    if (!selectedFile) return;
    setApplying(true);
    try {
      const url = await uploadFile(selectedFile, 'video');
      await saveMedia({ video_url: url });
      setPreviewUrl(null); setSelectedFile(null); setMode('view');
      toast({ title: 'Video updated' });
    } catch { toast({ title: 'Upload failed', variant: 'destructive' }); }
    finally { setApplying(false); }
  };

  const runAI = async () => {
    setErr(null); setMode('ai-generating');
    try {
      const url = await generateVideoDraft({ ...params, videoPrompt: aiPrompt || undefined });
      if (url) { setPendingVideo(url); setMode('ai-pending'); }
      else { setErr('Video generation returned no result.'); setMode('ai'); }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Generation failed'); setMode('ai');
    }
  };

  const applyAI = async () => {
    if (!pendingVideo) return;
    setApplying(true);
    try { await saveMedia({ video_url: pendingVideo }); setPendingVideo(null); setMode('view'); toast({ title: 'Video updated' }); }
    catch { toast({ title: 'Save failed', variant: 'destructive' }); }
    finally { setApplying(false); }
  };

  const reset = () => { setMode('view'); setErr(null); setPendingVideo(null); setPreviewUrl(null); setSelectedFile(null); };

  const VideoPlayer = ({ src, playState, setPlayState, badge }: { src: string; playState: boolean; setPlayState: (v: boolean) => void; badge?: string }) => (
    <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
      {playState ? (
        <video src={src} autoPlay muted loop playsInline crossOrigin="anonymous" className="w-full h-full object-cover" />
      ) : (
        <>
          {media?.images?.[0] && !badge && (
            <img src={media.images[0]} alt="thumb" className="w-full h-full object-cover opacity-70" crossOrigin="anonymous" />
          )}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <button onClick={() => setPlayState(true)}
              className="w-12 h-12 rounded-full bg-white/90 hover:bg-white transition-colors shadow-xl flex items-center justify-center">
              <Play className="w-5 h-5 text-foreground ml-0.5" />
            </button>
          </div>
          {badge && <span className="absolute top-2 left-2 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium">{badge}</span>}
        </>
      )}
    </div>
  );

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Video className="w-3.5 h-3.5 text-muted-foreground" /> Promo Video
          {media?.video_url && mode === 'view' && <span className="text-xs text-primary font-normal">Ready</span>}
        </div>
        {mode === 'view' && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setMode('upload'); setTimeout(() => fileRef.current?.click(), 50); }}>
              <Upload className="w-3 h-3" />Upload
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setMode('ai')}>
              <Wand2 className="w-3 h-3" />AI Generate
            </Button>
          </div>
        )}
        {mode !== 'view' && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={reset}><X className="w-3.5 h-3.5" /></Button>
        )}
      </div>

      {/* Upload mode */}
      {(mode === 'upload' || mode === 'upload-preview') && (
        <div className="p-4 space-y-3">
          <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleFileSelect} />
          {previewUrl ? (
            <>
              <VideoPlayer src={previewUrl} playState={pendingPlaying} setPlayState={setPendingPlaying} badge="New" />
              <p className="text-xs text-muted-foreground">{selectedFile?.name}</p>
              <PendingBanner label="Video ready — review and apply" onApply={applyUpload} onDiscard={reset} applying={applying} />
            </>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}>
              <Video className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Click to select a video</p>
              <p className="text-xs text-muted-foreground/70 mt-1">MP4, WebM, MOV supported</p>
            </div>
          )}
        </div>
      )}

      {/* AI input */}
      {mode === 'ai' && (
        <div className="p-4 space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Describe the video scene (optional)</Label>
            <Textarea rows={2} className="resize-none text-sm" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. slow motion dancers, dramatic lighting, outdoor garden at sunrise" />
          </div>
          <p className="text-xs text-muted-foreground/70">Video generation takes 1–3 minutes.</p>
          {err && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{err}</p>}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={reset}>Cancel</Button>
            <Button size="sm" onClick={runAI} disabled={draftGenerating}>
              <Sparkles className="w-3 h-3 mr-1" />Generate
            </Button>
          </div>
        </div>
      )}

      {/* AI generating */}
      {mode === 'ai-generating' && (
        <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{isGenerating && draftProgress ? draftProgress : 'Generating video...'}</span>
        </div>
      )}

      {/* AI pending */}
      {mode === 'ai-pending' && pendingVideo && (
        <div className="p-4 space-y-3">
          <VideoPlayer src={pendingVideo} playState={pendingPlaying} setPlayState={setPendingPlaying} badge="New" />
          <PendingBanner label="Video ready — review and apply" onApply={applyAI} onDiscard={() => { setPendingVideo(null); setMode('view'); }} applying={applying} />
        </div>
      )}

      {/* View */}
      {mode === 'view' && (
        <div className="p-3">
          {media?.video_url ? (
            <VideoPlayer src={media.video_url} playState={playing} setPlayState={setPlaying} />
          ) : (
            <p className="text-sm text-muted-foreground italic px-1 py-1">No video yet. Upload your own or generate with AI (1–3 min).</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Course Detail Modal ───────────────────────────────────────────────────────

function CourseDetailModal({ course, coachName, open, onClose }: {
  course: Course; coachName: string; open: boolean; onClose: () => void;
}) {
  const { media, generating, generatingPart, progress, error, generate,
    draftGenerating, draftGeneratingPart, draftProgress,
    generateTextDraft, generateImagesDraft, generateVideoDraft,
    saveMedia, uploadFile } = useCourseAI(course.id);

  const params: GenerateParams = {
    courseName: course.name, courseType: course.type,
    coachName, duration: course.duration, existingDescription: course.description,
  };
  const hasAny = !!(media?.description || (media?.images?.length ?? 0) > 0 || media?.video_url);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Colored header */}
        <div className={cn('px-6 pt-6 pb-4', getCourseTypeSolidClass(course.type))}>
          <DialogHeader>
            <CourseTypeBadge type={course.type} />
            <DialogTitle className="mt-2 text-xl font-serif text-white">{course.name}</DialogTitle>
            <p className="text-white/80 text-sm">with {coachName}</p>
          </DialogHeader>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-white/80">
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{course.duration} min</span>
            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Max {course.capacity}</span>
            <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />{formatCurrency(course.price)}</span>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Static course info */}
          {(course.description || course.notes) && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />Course Info
              </h3>
              {course.description && <p className="text-sm text-foreground leading-relaxed">{course.description}</p>}
              {course.notes && (
                <div className="bg-muted/50 rounded-lg px-3 py-2.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">What to bring: </span>{course.notes}
                </div>
              )}
            </section>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {/* AI content section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />AI Content
              </h3>
              <Button size="sm" variant={hasAny ? 'outline' : 'default'} onClick={() => generate(params)} disabled={generating || draftGenerating}>
                {generating && generatingPart === 'all' ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                {hasAny ? 'Regenerate All' : 'Generate All'}
              </Button>
            </div>
            {generating && progress && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />{progress}
              </div>
            )}

            <DescriptionSection media={media} params={params} saveMedia={saveMedia}
              generateTextDraft={generateTextDraft} draftGenerating={draftGenerating}
              draftGeneratingPart={draftGeneratingPart} draftProgress={draftProgress} />

            <ImagesSection media={media} params={params} saveMedia={saveMedia} uploadFile={uploadFile}
              generateImagesDraft={generateImagesDraft} draftGenerating={draftGenerating}
              draftGeneratingPart={draftGeneratingPart} draftProgress={draftProgress} />

            <VideoSection media={media} params={params} saveMedia={saveMedia} uploadFile={uploadFile}
              generateVideoDraft={generateVideoDraft} draftGenerating={draftGenerating}
              draftGeneratingPart={draftGeneratingPart} draftProgress={draftProgress} />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Course card ────────────────────────────────────────────────────────────────

function CourseCard({ course, coachName, onEdit, onDelete }: {
  course: Course; coachName: string; onEdit: () => void; onDelete: () => void;
}) {
  const { media } = useCourseAI(course.id);
  const [detailOpen, setDetailOpen] = useState(false);
  const thumbUrl = media?.images?.[0] ?? null;

  return (
    <>
      <Card className="overflow-hidden card-hover cursor-pointer" onClick={() => setDetailOpen(true)}>
        <CardContent className="p-0">
          {thumbUrl && (
            <div className="relative h-28 overflow-hidden">
              <img src={thumbUrl} alt={course.name} crossOrigin="anonymous" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              {media?.video_url && (
                <div className="absolute bottom-2 right-2">
                  <span className="text-xs bg-black/60 text-white px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Play className="w-2.5 h-2.5" /> Video
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="flex">
            <div className={cn('w-2 shrink-0', getCourseTypeSolidClass(course.type))} />
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1"><CourseTypeBadge type={course.type} /></div>
                  <h3 className="font-medium text-foreground">{course.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">with {coachName}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.duration} min</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />Max {course.capacity}</span>
                    <span className="font-medium text-foreground">{formatCurrency(course.price)}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <button title="Details & AI content" onClick={() => setDetailOpen(true)}
                    className={cn('h-7 w-7 flex items-center justify-center rounded transition-colors',
                      media?.status === 'done' ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted')}>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              {!thumbUrl && course.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{course.description}</p>}
              <div className="flex items-center gap-1 mt-2 text-xs text-primary/70">
                <ChevronRight className="w-3 h-3" /><span>Click to manage content & AI</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <CourseDetailModal course={course} coachName={coachName} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminCoursesPage() {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const coaches = state.users.filter(u => u.role === 'coach');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [customType, setCustomType] = useState('');
  const isCustom = form.type === '__custom__';

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setCustomType(''); setOpen(true); };
  const openEdit = (course: Course) => {
    setEditing(course);
    const isPreset = PRESET_TYPES.includes(course.type);
    setForm({ name: course.name, type: isPreset ? course.type : '__custom__', coachId: course.coachId, capacity: course.capacity, duration: course.duration, price: course.price, description: course.description, notes: course.notes });
    setCustomType(isPreset ? '' : course.type);
    setOpen(true);
  };

  const handleSave = () => {
    const finalType = isCustom ? customType.trim().toLowerCase() : form.type;
    if (!form.name.trim() || !form.coachId || !finalType) { toast({ title: 'Please fill in all required fields', variant: 'destructive' }); return; }
    if (editing) { dispatch({ type: 'UPDATE_COURSE', payload: { ...editing, ...form, type: finalType } }); toast({ title: 'Class updated' }); }
    else { dispatch({ type: 'ADD_COURSE', payload: { id: `course-new-${Date.now()}`, ...form, type: finalType } }); toast({ title: 'Class added' }); }
    setOpen(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground">Classes</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add Class</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.courses.map(course => {
          const coach = state.users.find(u => u.id === course.coachId);
          return (
            <CourseCard key={course.id} course={course} coachName={coach?.name ?? 'Instructor'}
              onEdit={() => openEdit(course)} onDelete={() => { dispatch({ type: 'DELETE_COURSE', payload: course.id }); toast({ title: 'Class deleted' }); }} />
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Class' : 'Add Class'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Class Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Morning Flow" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Type *</Label>
                <Select value={form.type} onValueChange={v => { setForm(f => ({ ...f, type: v })); if (v !== '__custom__') setCustomType(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRESET_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                    <SelectItem value="__custom__">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {isCustom && <Input placeholder="e.g. aerial, yin, kickboxing" value={customType} onChange={e => setCustomType(e.target.value)} className="mt-1.5" />}
              </div>
              <div className="space-y-1.5"><Label>Instructor *</Label>
                <Select value={form.coachId} onValueChange={v => setForm(f => ({ ...f, coachId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{coaches.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Duration (min)</Label><Input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: +e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Price ($)</Label><Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} className="resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>What to Bring / Notes</Label><Textarea rows={2} className="resize-none" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
