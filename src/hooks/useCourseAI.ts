import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export interface CourseMedia {
  course_id: string;
  description: string | null;
  images: string[];
  video_url: string | null;
  video_task_id?: string | null;
  status: 'idle' | 'generating_text' | 'generating_images' | 'generating_video' | 'done' | 'error';
}

export type GeneratingPart = 'text' | 'images' | 'video' | 'all' | null;

const POLL_INTERVAL = 8000;
const VIDEO_POLL_INTERVAL = 15000;
const MAX_POLLS = 60;

export interface GenerateParams {
  courseName: string;
  courseType: string;
  coachName: string;
  duration: number;
  existingDescription?: string;
  userPrompt?: string;   // custom text generation instructions
  imagePrompt?: string;  // custom image generation prompt
  videoPrompt?: string;  // custom video generation prompt
}

export function useCourseAI(courseId: string) {
  const [media, setMedia] = useState<CourseMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPart, setGeneratingPart] = useState<GeneratingPart>(null);
  const [draftGeneratingPart, setDraftGeneratingPart] = useState<GeneratingPart>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [draftProgress, setDraftProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isResuming = useRef(false);

  const generating = generatingPart !== null;
  const draftGenerating = draftGeneratingPart !== null;

  // Load existing media
  useEffect(() => {
    if (!courseId) return;
    supabase
      .from('course_media')
      .select('*')
      .eq('course_id', courseId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setMedia({
          course_id: data.course_id,
          description: data.description,
          images: (data.images as string[]) || [],
          video_url: data.video_url,
          video_task_id: data.video_task_id ?? null,
          status: data.status as CourseMedia['status'],
        });
        setLoading(false);
      });
  }, [courseId]);

  // Auto-resume polling if a video task_id is saved but video not yet done
  useEffect(() => {
    if (!media?.video_task_id || media.video_url || media.status !== 'generating_video') return;
    if (isResuming.current || generating) return;

    isResuming.current = true;
    setGeneratingPart('video');
    setProgress('Generating video...');

    (async () => {
      try {
        let videoUrl: string | null = null;
        const taskId = media.video_task_id!;
        for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
          await sleep(VIDEO_POLL_INTERVAL);
          setProgress(`Generating video... (${attempt + 1})`);
          const { data: vidStatus } = await supabase.functions.invoke('course-ai-video-status-fcd43878b98b', { body: { taskId } });
          if (vidStatus?.status === 'succeed' && vidStatus.url) { videoUrl = vidStatus.url; break; }
          if (vidStatus?.status === 'failed') break;
        }
        await upsertMedia(courseId, { video_url: videoUrl, video_task_id: null, status: 'done' });
        setMedia(m => m ? { ...m, video_url: videoUrl, video_task_id: null, status: 'done' } : m);
      } finally {
        setGeneratingPart(null);
        setProgress(null);
        isResuming.current = false;
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media?.video_task_id, media?.video_url, media?.status]);

  // ── Save confirmed content to DB ─────────────────────────────────────────
  const saveMedia = useCallback(async (updates: Partial<Pick<CourseMedia, 'description' | 'images' | 'video_url'>>) => {
    await upsertMedia(courseId, { ...updates, status: 'done' });
    setMedia(m => m
      ? { ...m, ...updates, status: 'done' }
      : { course_id: courseId, description: null, images: [], video_url: null, status: 'done', ...updates });
  }, [courseId]);

  // ── Upload file to Supabase Storage ──────────────────────────────────────
  const uploadFile = useCallback(async (file: File, slot: string): Promise<string> => {
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `courses/${courseId}/${slot}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('course-assets').upload(path, file, { upsert: true });
    if (uploadErr) throw new Error(uploadErr.message);
    return supabase.storage.from('course-assets').getPublicUrl(path).data.publicUrl;
  }, [courseId]);

  // ── DRAFT — generate text (no DB save) ───────────────────────────────────
  const generateTextDraft = useCallback(async (params: GenerateParams): Promise<string> => {
    setDraftGeneratingPart('text');
    setDraftProgress('Generating description...');
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke('course-ai-text-fcd43878b98b', {
        body: { ...params, userPrompt: params.userPrompt },
      });
      if (err || !data?.success) throw new Error(data?.message || 'Text generation failed');
      return data.description as string;
    } finally {
      setDraftGeneratingPart(null);
      setDraftProgress(null);
    }
  }, []);

  // ── DRAFT — generate images (no DB save) ─────────────────────────────────
  const generateImagesDraft = useCallback(async (params: GenerateParams): Promise<string[]> => {
    setDraftGeneratingPart('images');
    setDraftProgress('Submitting image generation...');
    setError(null);
    try {
      const { data: imgSubmit, error: imgErr } = await supabase.functions.invoke('course-ai-images-fcd43878b98b', {
        body: { courseType: params.courseType, customPrompt: params.imagePrompt },
      });
      if (imgErr || !imgSubmit?.success) throw new Error(imgSubmit?.message || 'Image submission failed');
      const taskIds: (string | null)[] = imgSubmit.taskIds;
      const imageUrls: string[] = [];
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        await sleep(POLL_INTERVAL);
        const { data: statusData } = await supabase.functions.invoke('course-ai-image-status-fcd43878b98b', { body: { taskIds } });
        if (!statusData?.success) continue;
        const results: { status: string; url: string | null }[] = statusData.results;
        const done = results.filter(r => r.status === 'succeed');
        setDraftProgress(`Generating images... (${done.length}/${results.length})`);
        if (results.every(r => r.status === 'succeed' || r.status === 'failed')) {
          imageUrls.push(...(results.map(r => r.url).filter(Boolean) as string[]));
          break;
        }
      }
      return imageUrls;
    } finally {
      setDraftGeneratingPart(null);
      setDraftProgress(null);
    }
  }, []);

  // ── DRAFT — generate video (no DB save) ──────────────────────────────────
  const generateVideoDraft = useCallback(async (params: GenerateParams): Promise<string | null> => {
    setDraftGeneratingPart('video');
    setDraftProgress('Submitting video generation...');
    setError(null);
    try {
      const { data: vidSubmit, error: vidErr } = await supabase.functions.invoke('course-ai-video-fcd43878b98b', {
        body: { courseType: params.courseType, customPrompt: params.videoPrompt },
      });
      if (vidErr || !vidSubmit?.success) throw new Error(vidSubmit?.message || 'Video submission failed');
      const videoTaskId: string = vidSubmit.taskId;
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        await sleep(VIDEO_POLL_INTERVAL);
        setDraftProgress(`Generating video... (${attempt + 1} / ~6 min)`);
        const { data: vidStatus } = await supabase.functions.invoke('course-ai-video-status-fcd43878b98b', { body: { taskId: videoTaskId } });
        if (vidStatus?.status === 'succeed' && vidStatus.url) return vidStatus.url as string;
        if (vidStatus?.status === 'failed') return null;
      }
      return null;
    } finally {
      setDraftGeneratingPart(null);
      setDraftProgress(null);
    }
  }, []);

  // ── Legacy direct-save functions (kept for Generate All) ─────────────────
  const generateText = useCallback(async (params: GenerateParams) => {
    setGeneratingPart('text'); setError(null);
    try {
      setProgress('Generating course description...');
      const { data, error: err } = await supabase.functions.invoke('course-ai-text-fcd43878b98b', { body: { ...params, userPrompt: params.userPrompt } });
      if (err || !data?.success) throw new Error(data?.message || 'Text generation failed');
      const description: string = data.description;
      await upsertMedia(courseId, { description, status: 'done' });
      setMedia(m => m ? { ...m, description, status: 'done' } : { course_id: courseId, description, images: [], video_url: null, status: 'done' });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Text generation failed'); }
    finally { setGeneratingPart(null); setProgress(null); }
  }, [courseId]);

  const generateImages = useCallback(async (params: GenerateParams) => {
    setGeneratingPart('images'); setError(null);
    try {
      setProgress('Submitting image generation...');
      const { data: imgSubmit, error: imgErr } = await supabase.functions.invoke('course-ai-images-fcd43878b98b', { body: { courseType: params.courseType, customPrompt: params.imagePrompt } });
      if (imgErr || !imgSubmit?.success) throw new Error(imgSubmit?.message || 'Image submission failed');
      const taskIds: (string | null)[] = imgSubmit.taskIds;
      const imageUrls: string[] = [];
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        await sleep(POLL_INTERVAL);
        const { data: statusData } = await supabase.functions.invoke('course-ai-image-status-fcd43878b98b', { body: { taskIds } });
        if (!statusData?.success) continue;
        const results: { status: string; url: string | null }[] = statusData.results;
        setProgress(`Generating images... (${results.filter(r => r.status === 'succeed').length}/${results.length})`);
        if (results.every(r => r.status === 'succeed' || r.status === 'failed')) { imageUrls.push(...(results.map(r => r.url).filter(Boolean) as string[])); break; }
      }
      await upsertMedia(courseId, { images: imageUrls, status: 'done' });
      setMedia(m => m
        ? { ...m, images: imageUrls, status: 'done' }
        : { course_id: courseId, description: null, images: imageUrls, video_url: null, status: 'done' });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Image generation failed'); }
    finally { setGeneratingPart(null); setProgress(null); }
  }, [courseId]);

  const generateVideo = useCallback(async (params: GenerateParams) => {
    setGeneratingPart('video'); setError(null);
    try {
      setProgress('Submitting video generation...');
      const { data: vidSubmit, error: vidErr } = await supabase.functions.invoke('course-ai-video-fcd43878b98b', { body: { courseType: params.courseType, customPrompt: params.videoPrompt } });
      if (vidErr || !vidSubmit?.success) throw new Error(vidSubmit?.message || 'Video submission failed');
      const videoTaskId: string = vidSubmit.taskId;
      // Save task_id immediately so polling can resume if page is refreshed
      await upsertMedia(courseId, { video_task_id: videoTaskId, status: 'generating_video' });
      let videoUrl: string | null = null;
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        await sleep(VIDEO_POLL_INTERVAL);
        setProgress(`Generating video... (${attempt + 1} / ~6 min)`);
        const { data: vidStatus } = await supabase.functions.invoke('course-ai-video-status-fcd43878b98b', { body: { taskId: videoTaskId } });
        if (vidStatus?.status === 'succeed' && vidStatus.url) { videoUrl = vidStatus.url; break; }
        if (vidStatus?.status === 'failed') break;
      }
      await upsertMedia(courseId, { video_url: videoUrl, video_task_id: null, status: 'done' });
      setMedia(m => m
        ? { ...m, video_url: videoUrl, video_task_id: null, status: 'done' }
        : { course_id: courseId, description: null, images: [], video_url: videoUrl, video_task_id: null, status: 'done' });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Video generation failed'); }
    finally { setGeneratingPart(null); setProgress(null); }
  }, [courseId]);

  const generate = useCallback(async (params: GenerateParams) => {
    setGeneratingPart('all'); setError(null);
    try {
      setProgress('Generating course description...');
      const { data: textData, error: textErr } = await supabase.functions.invoke('course-ai-text-fcd43878b98b', { body: params });
      if (textErr || !textData?.success) throw new Error(textData?.message || 'Text generation failed');
      const description: string = textData.description;
      await upsertMedia(courseId, { description, status: 'generating_images' });
      setMedia(m => m ? { ...m, description, status: 'generating_images' } : { course_id: courseId, description, images: [], video_url: null, status: 'generating_images' });

      setProgress('Generating course images...');
      const { data: imgSubmit, error: imgErr } = await supabase.functions.invoke('course-ai-images-fcd43878b98b', { body: { courseType: params.courseType } });
      if (imgErr || !imgSubmit?.success) throw new Error(imgSubmit?.message || 'Image submission failed');
      const taskIds: (string | null)[] = imgSubmit.taskIds;
      const imageUrls: string[] = [];
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        await sleep(POLL_INTERVAL);
        const { data: statusData } = await supabase.functions.invoke('course-ai-image-status-fcd43878b98b', { body: { taskIds } });
        if (!statusData?.success) continue;
        const results: { status: string; url: string | null }[] = statusData.results;
        setProgress(`Generating images... (${results.filter(r => r.status === 'succeed').length}/${results.length})`);
        if (results.every(r => r.status === 'succeed' || r.status === 'failed')) { imageUrls.push(...(results.map(r => r.url).filter(Boolean) as string[])); break; }
      }
      await upsertMedia(courseId, { images: imageUrls, status: 'generating_video' });
      setMedia(m => m
        ? { ...m, images: imageUrls, status: 'generating_video' }
        : { course_id: courseId, description: null, images: imageUrls, video_url: null, status: 'generating_video' });

      setProgress('Submitting video generation (takes 1-3 minutes)...');
      const { data: vidSubmit, error: vidErr } = await supabase.functions.invoke('course-ai-video-fcd43878b98b', { body: { courseType: params.courseType } });
      if (vidErr || !vidSubmit?.success) throw new Error(vidSubmit?.message || 'Video submission failed');
      const videoTaskId: string = vidSubmit.taskId;
      let videoUrl: string | null = null;
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        await sleep(VIDEO_POLL_INTERVAL);
        setProgress(`Generating video... (${attempt + 1} / ~6 min)`);
        const { data: vidStatus } = await supabase.functions.invoke('course-ai-video-status-fcd43878b98b', { body: { taskId: videoTaskId } });
        if (vidStatus?.status === 'succeed' && vidStatus.url) { videoUrl = vidStatus.url; break; }
        if (vidStatus?.status === 'failed') break;
      }
      await upsertMedia(courseId, { video_url: videoUrl, status: 'done' });
      setMedia(m => m
        ? { ...m, video_url: videoUrl, status: 'done' }
        : { course_id: courseId, description: null, images: [], video_url: videoUrl, status: 'done' });
      setProgress(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      await upsertMedia(courseId, { status: 'error' });
    } finally { setGeneratingPart(null); setProgress(null); }
  }, [courseId]);

  return {
    media, loading,
    generating, generatingPart, progress, error,
    draftGenerating, draftGeneratingPart, draftProgress,
    generate, generateText, generateImages, generateVideo,
    generateTextDraft, generateImagesDraft, generateVideoDraft,
    saveMedia, uploadFile,
  };
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function upsertMedia(courseId: string, updates: Record<string, unknown>) {
  await supabase.from('course_media').upsert(
    { course_id: courseId, ...updates, updated_at: new Date().toISOString() },
    { onConflict: 'course_id' }
  );
}
