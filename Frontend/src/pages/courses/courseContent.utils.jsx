import { FileText, Video, Image as ImageIcon, Music, Link as LinkIcon, Presentation, FileSpreadsheet, FileArchive, File, Type } from 'lucide-react';

/** Lesson "type" choices shown in the create/edit form. */
export const LESSON_TYPES = [
  { key: 'document', label: 'Document', icon: FileText },
  { key: 'video', label: 'Video', icon: Video },
  { key: 'image', label: 'Image', icon: ImageIcon },
  { key: 'audio', label: 'Audio', icon: Music },
  { key: 'link', label: 'Link', icon: LinkIcon },
  { key: 'text', label: 'Text', icon: Type },
];

export const COURSE_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export const COURSE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

/** Pick an icon from a lesson's contentType (falling back to its mime type). */
export function lessonIcon(contentType, mimeType) {
  const t = (contentType || '').toLowerCase();
  const m = (mimeType || '').toLowerCase();
  if (t === 'video' || m.startsWith('video/')) return Video;
  if (t === 'audio' || m.startsWith('audio/')) return Music;
  if (t === 'image' || m.startsWith('image/')) return ImageIcon;
  if (t === 'link') return LinkIcon;
  if (t === 'text') return Type;
  if (t === 'pdf' || m.includes('pdf')) return FileText;
  if (t === 'presentation' || m.includes('presentation') || m.includes('powerpoint')) return Presentation;
  if (m.includes('sheet') || m.includes('excel')) return FileSpreadsheet;
  if (m.includes('zip') || m.includes('rar') || m.includes('7z') || m.includes('tar') || m.includes('gz')) return FileArchive;
  if (t === 'document' || m.includes('word')) return FileText;
  return File;
}

/** Seconds → "m:ss" (or "h:mm:ss"). Returns null when empty. */
export function formatDuration(seconds) {
  if (!seconds) return null;
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Bytes → human size. */
export function formatBytes(bytes) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function getYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  return (
    u.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)?.[1] ||
    u.match(/[?&]v=([a-zA-Z0-9_-]+)/)?.[1] ||
    u.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/)?.[1] ||
    null
  );
}

export function getVimeoId(url) {
  if (!url || typeof url !== 'string') return null;
  return url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] || null;
}

// File-input accept strings per lesson type.
export const ACCEPT = {
  document: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar',
  video: '.mp4,.mov,.avi,.webm,.mkv',
  image: '.jpg,.jpeg,.png,.gif,.webp,.svg',
  audio: '.mp3,.wav,.ogg,.m4a,.aac',
};
