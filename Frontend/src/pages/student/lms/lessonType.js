/**
 * Lesson content helpers — map the backend `contentType` enum
 * (video|pdf|document|presentation|audio|image|link|text) to icons, labels and small format utils.
 */
import {
  Video,
  FileText,
  Presentation,
  Image as ImageIcon,
  FileAudio,
  Link as LinkIcon,
  Type,
  FileQuestion,
} from 'lucide-react';

const KNOWN = ['video', 'pdf', 'document', 'presentation', 'audio', 'image', 'link', 'text'];

/** Normalise an arbitrary contentType into one of the known kinds (defaults to 'document'). */
export function normaliseType(contentType) {
  const t = String(contentType || '').toLowerCase();
  return KNOWN.includes(t) ? t : 'document';
}

/** Lucide icon component for a lesson's content type. */
export function lessonIcon(contentType) {
  switch (normaliseType(contentType)) {
    case 'video':
      return Video;
    case 'pdf':
    case 'document':
      return FileText;
    case 'presentation':
      return Presentation;
    case 'image':
      return ImageIcon;
    case 'audio':
      return FileAudio;
    case 'link':
      return LinkIcon;
    case 'text':
      return Type;
    default:
      return FileQuestion;
  }
}

/** Short human label for a content type. */
export function lessonKindLabel(contentType) {
  const t = normaliseType(contentType);
  return t === 'pdf' ? 'PDF' : t.charAt(0).toUpperCase() + t.slice(1);
}

export function isYouTube(url) {
  return /(?:youtube\.com|youtu\.be)/i.test(url || '');
}

export function youTubeId(url) {
  if (!url) return null;
  const s = String(url).trim();
  return (
    s.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/)?.[1] ||
    s.match(/[?&]v=([a-zA-Z0-9_-]{6,})/)?.[1] ||
    s.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/)?.[1] ||
    null
  );
}

export function isVimeo(url) {
  return /vimeo\.com/i.test(url || '');
}

export function vimeoEmbed(url) {
  const id = String(url || '').match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
  return id ? `https://player.vimeo.com/video/${id}` : null;
}

/** Office Online embed for docx/pptx/xlsx (needs a publicly reachable URL — our signed S3 link works). */
export function officeEmbed(url) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
}

/** Pick how a document/presentation should render based on its file name. */
export function docRenderMode(fileName, url) {
  const s = `${fileName || ''} ${url || ''}`.toLowerCase();
  if (/\.pdf(\?|$)/.test(s)) return 'pdf';
  if (/\.(pptx?|docx?|xlsx?)(\?|$)/.test(s)) return 'office';
  if (/\.(jpe?g|png|gif|webp|svg)(\?|$)/.test(s)) return 'image';
  return 'download';
}

/** Seconds → "m:ss" or "h:mm:ss". */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (!s) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Seconds → "3h 12m" / "12m" (for totals). */
export function formatHours(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
