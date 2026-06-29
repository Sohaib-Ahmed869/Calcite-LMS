import { useRef, useState } from 'react';
import { UploadCloud, Loader2, X } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Image upload tile — click or drag-and-drop a file. Shows a live preview (on a light or dark
 * checkerboard-ish surface via `previewBg`) and a remove button. Calls `onUpload(file)` /
 * `onRemove()`; `busy` drives the spinner while the parent uploads.
 */
export function Dropzone({ label, hint, value, previewBg = 'light', busy, onUpload, onRemove, wide, accept = 'image/*' }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleFiles = (files) => {
    const file = files?.[0];
    if (file) onUpload?.(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-1.5">
      {label ? <p className="text-sm font-medium text-foreground">{label}</p> : null}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      <div
        role="button"
        tabIndex={0}
        onClick={pick}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && pick()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'relative flex cursor-pointer items-center justify-center overflow-hidden rounded-card border-2 border-dashed transition-colors',
          wide ? 'h-32' : 'h-28',
          dragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50',
          previewBg === 'dark' ? 'bg-[#0a2952]' : 'bg-muted/40',
        )}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => handleFiles(e.target.files)} />

        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        ) : value ? (
          <>
            <img src={value} alt={label || 'preview'} className="max-h-[80%] max-w-[80%] object-contain" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
              className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-pill bg-black/55 text-white transition-colors hover:bg-black/75"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className={cn('flex flex-col items-center gap-1.5 px-3 text-center', previewBg === 'dark' ? 'text-white/70' : 'text-muted-foreground')}>
            <UploadCloud className="h-6 w-6" />
            <span className="text-xs font-medium">Click or drag an image</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dropzone;
