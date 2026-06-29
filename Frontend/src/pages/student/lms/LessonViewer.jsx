import { useEffect, useRef, useState } from 'react';
import { Loader2, ExternalLink, FileText, AlertCircle, Download } from 'lucide-react';
import { getLessonUrl } from '../../../services/lms.service';
import YouTubePlayer from './YouTubePlayer';
import VideoPlayer from './VideoPlayer';
import { isYouTube, isVimeo, vimeoEmbed, officeEmbed, docRenderMode } from './lessonType';

/**
 * Resolves a lesson's playback URL (GET /course-lessons/:id/url) and renders the content by type:
 * YouTube/Vimeo/direct video, PDF, Office docs, images, audio, external links, or inline text.
 * For video it forwards onTime/onEnded/onPlayingChange so the page can track progress + completion.
 * For non-video content it reports "viewing" via onPlayingChange so time-spent still accrues.
 */
export default function LessonViewer({ lesson, startAt = 0, onTime, onEnded, onPlayingChange }) {
  const [info, setInfo] = useState(null); // { url, kind, contentType, fileName, textContent }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cbRef = useRef({ onPlayingChange });
  cbRef.current = { onPlayingChange };

  useEffect(() => {
    if (!lesson?._id) return undefined;
    let alive = true;
    setLoading(true);
    setError(null);
    setInfo(null);
    getLessonUrl(lesson._id)
      .then((res) => {
        if (alive) setInfo(res);
      })
      .catch((e) => {
        if (alive) setError(e.message || 'Could not load this lesson.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [lesson?._id]);

  const contentType = info?.contentType || lesson?.contentType;
  const url = info?.url;
  const isVideo = contentType === 'video';
  const trackedVideo = isVideo && (info?.kind === 'file' || (info?.kind === 'external' && isYouTube(url)));

  // For content the players don't drive (Vimeo embeds, docs, images, text, links), report "viewing"
  // while the lesson is open so the page's time-spent timer keeps running.
  useEffect(() => {
    if (loading || error || trackedVideo) return undefined;
    cbRef.current.onPlayingChange?.(true);
    return () => cbRef.current.onPlayingChange?.(false);
  }, [loading, error, trackedVideo, lesson?._id]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black/95 text-white/80">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-card p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-danger" />
          <p className="text-sm font-medium text-foreground">Couldn’t load this lesson</p>
          <p className="mt-1 text-xs text-muted-foreground">{error || 'No playable content.'}</p>
        </div>
      </div>
    );
  }

  const header = (
    <div className="shrink-0 border-b border-border bg-card px-4 py-3">
      <h2 className="text-sm font-semibold text-foreground">{lesson.title}</h2>
      {lesson.description ? <p className="mt-0.5 text-xs text-muted-foreground">{lesson.description}</p> : null}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium hover:underline"
          style={{ color: 'var(--color-accent)' }}
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
        </a>
      ) : null}
    </div>
  );

  // ---- Video ----------------------------------------------------------
  if (isVideo) {
    if (info.kind === 'external' && isYouTube(url)) {
      return (
        <div className="relative h-full w-full bg-black">
          <YouTubePlayer url={url} startAt={startAt} onTime={onTime} onEnded={onEnded} onPlayingChange={onPlayingChange} />
        </div>
      );
    }
    if (info.kind === 'external' && isVimeo(url)) {
      return (
        <div className="relative h-full w-full bg-black">
          <iframe src={vimeoEmbed(url) || url} title={lesson.title} className="absolute inset-0 h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
        </div>
      );
    }
    if (url) {
      return (
        <div className="relative h-full w-full bg-black">
          <VideoPlayer src={url} startAt={startAt} onTime={onTime} onEnded={onEnded} onPlayingChange={onPlayingChange} />
        </div>
      );
    }
  }

  // ---- PDF ------------------------------------------------------------
  if (contentType === 'pdf' && url) {
    return (
      <div className="flex h-full w-full flex-col bg-card">
        {header}
        <iframe src={url} title={lesson.title} className="min-h-0 w-full flex-1 border-0" />
      </div>
    );
  }

  // ---- Image ----------------------------------------------------------
  if (contentType === 'image' && url) {
    return (
      <div className="flex h-full w-full flex-col bg-card">
        {header}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted/40 p-4">
          <img src={url} alt={lesson.title} className="max-h-full max-w-full object-contain" />
        </div>
      </div>
    );
  }

  // ---- Audio ----------------------------------------------------------
  if (contentType === 'audio' && url) {
    return (
      <div className="flex h-full w-full flex-col bg-card">
        {header}
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <audio src={url} controls className="w-full max-w-xl" />
        </div>
      </div>
    );
  }

  // ---- Document / Presentation ---------------------------------------
  if ((contentType === 'document' || contentType === 'presentation') && url) {
    const mode = docRenderMode(info.fileName, url);
    if (mode === 'pdf') {
      return (
        <div className="flex h-full w-full flex-col bg-card">
          {header}
          <iframe src={url} title={lesson.title} className="min-h-0 w-full flex-1 border-0" />
        </div>
      );
    }
    if (mode === 'office') {
      return (
        <div className="flex h-full w-full flex-col bg-card">
          {header}
          <iframe src={officeEmbed(url)} title={lesson.title} className="min-h-0 w-full flex-1 border-0" />
        </div>
      );
    }
    if (mode === 'image') {
      return (
        <div className="flex h-full w-full flex-col bg-card">
          {header}
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted/40 p-4">
            <img src={url} alt={lesson.title} className="max-h-full max-w-full object-contain" />
          </div>
        </div>
      );
    }
    // Unknown file — offer download.
    return (
      <div className="flex h-full w-full flex-col bg-card">
        {header}
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-btn px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Download className="h-4 w-4" /> Download {info.fileName || 'file'}
          </a>
        </div>
      </div>
    );
  }

  // ---- External link --------------------------------------------------
  if (contentType === 'link' || info.kind === 'external') {
    return (
      <div className="flex h-full w-full flex-col bg-card">
        {header}
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="max-w-md text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              This lesson links to an external website. Many sites can’t be embedded here, so open it in a new tab to view
              the content.
            </p>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-btn px-5 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <ExternalLink className="h-4 w-4" /> Open website
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // ---- Inline text ----------------------------------------------------
  if (info.kind === 'text' || contentType === 'text') {
    return (
      <div className="flex h-full w-full flex-col bg-card">
        {header}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {info.textContent ? (
            <div
              className="prose-sm mx-auto max-w-3xl text-sm leading-relaxed text-foreground [&_a]:text-accent [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: info.textContent }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="mb-2 h-8 w-8" />
              <p className="text-sm">No content for this lesson.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Fallback -------------------------------------------------------
  return (
    <div className="flex h-full w-full flex-col bg-card">
      {header}
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        This content type can’t be previewed here.
      </div>
    </div>
  );
}
