import { useEffect, useState } from 'react';
import { Loader2, Download, ExternalLink, FileQuestion } from 'lucide-react';
import { Modal, Button } from '../../../components/ui';
import { LessonService } from '../../../services/course.service';
import { lessonIcon, getYouTubeId, getVimeoId } from '../courseContent.utils';

/** Preview a lesson's content inline. Resolves a signed/external URL via the API, then renders by type. */
export function LessonPreviewModal({ open, onClose, lesson }) {
  const [state, setState] = useState({ loading: true, url: null, kind: null, textContent: null, error: null });

  useEffect(() => {
    if (!open || !lesson?._id) return undefined;
    let alive = true;
    setState({ loading: true, url: null, kind: null, textContent: null, error: null });
    LessonService.url(lesson._id)
      .then((d) => alive && setState({ loading: false, url: d.url, kind: d.kind, textContent: d.textContent, error: null }))
      .catch((e) => alive && setState({ loading: false, url: null, kind: null, textContent: null, error: e.message || 'Could not load resource' }));
    return () => { alive = false; };
  }, [open, lesson]);

  const ct = (lesson?.contentType || '').toLowerCase();
  const mime = (lesson?.mimeType || '').toLowerCase();
  const { url, kind, textContent } = state;
  const yt = getYouTubeId(url || lesson?.externalUrl);
  const vimeo = getVimeoId(url || lesson?.externalUrl);

  const isVideo = ct === 'video' || mime.startsWith('video/');
  const isAudio = ct === 'audio' || mime.startsWith('audio/');
  const isImage = ct === 'image' || mime.startsWith('image/');
  const isPdf = ct === 'pdf' || mime.includes('pdf');
  const isOffice = mime.includes('word') || mime.includes('presentation') || mime.includes('powerpoint') || mime.includes('sheet') || mime.includes('excel') || ct === 'presentation';
  const Icon = lessonIcon(lesson?.contentType, lesson?.mimeType);

  const renderBody = () => {
    if (state.loading) return <div className="flex h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
    if (state.error) return <div className="flex h-72 flex-col items-center justify-center gap-2 text-center"><FileQuestion className="h-10 w-10 text-muted-foreground" /><p className="text-sm text-danger">{state.error}</p></div>;

    if (kind === 'text' || ct === 'text') {
      return <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap px-6 py-5 text-sm leading-relaxed text-foreground">{textContent || lesson?.textContent || 'No content.'}</div>;
    }
    if (yt) {
      return <div className="aspect-video w-full bg-black"><iframe src={`https://www.youtube.com/embed/${yt}?rel=0&modestbranding=1`} title={lesson?.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full border-0" /></div>;
    }
    if (vimeo) {
      return <div className="aspect-video w-full bg-black"><iframe src={`https://player.vimeo.com/video/${vimeo}`} title={lesson?.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="h-full w-full border-0" /></div>;
    }
    if (!url) return <div className="flex h-72 flex-col items-center justify-center gap-2 text-center"><Icon className="h-10 w-10 text-muted-foreground" /><p className="text-sm text-muted-foreground">Nothing to preview.</p></div>;
    if (isVideo) return <div className="aspect-video w-full bg-black"><video src={url} controls className="h-full w-full" /></div>;
    if (isAudio) return <div className="px-6 py-8"><audio src={url} controls className="w-full" /></div>;
    if (isImage) return <div className="bg-muted/40"><img src={url} alt={lesson?.title} className="mx-auto max-h-[70vh] object-contain" /></div>;
    if (isPdf) return <iframe src={url} title={lesson?.title} className="h-[70vh] w-full border-0" />;
    if (isOffice) return <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`} title={lesson?.title} className="h-[70vh] w-full border-0" />;
    if (kind === 'external') {
      return (
        <div className="flex h-72 flex-col items-center justify-center gap-3 text-center">
          <ExternalLink className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">This resource lives on another site.</p>
          <Button as="a" href={url} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Open link</Button>
        </div>
      );
    }
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3 text-center">
        <Icon className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">This file type can&apos;t be previewed here.</p>
        <Button as="a" href={url} target="_blank" rel="noopener noreferrer" download icon={Download}>Download</Button>
      </div>
    );
  };

  const downloadUrl = url && kind === 'file' ? url : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={Icon}
      title={lesson?.title || 'Resource'}
      subtitle={lesson?.description || (lesson?.contentType ? `${lesson.contentType}` : undefined)}
      size="xl"
      footer={downloadUrl ? <Button as="a" href={downloadUrl} target="_blank" rel="noopener noreferrer" download variant="secondary" icon={Download}>Download</Button> : null}
    >
      {renderBody()}
    </Modal>
  );
}

export default LessonPreviewModal;
