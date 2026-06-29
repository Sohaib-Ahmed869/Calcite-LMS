import { useEffect, useRef } from 'react';

/**
 * Native <video> player for direct uploads (signed S3 URL). Reports time for progress + completion.
 * Props: src, startAt, onTime(seconds, duration), onEnded, onPlayingChange.
 */
export default function VideoPlayer({ src, startAt = 0, onTime, onEnded, onPlayingChange }) {
  const ref = useRef(null);
  const seekedRef = useRef(false);

  useEffect(() => {
    seekedRef.current = false;
  }, [src]);

  return (
    <video
      ref={ref}
      src={src}
      controls
      playsInline
      className="absolute inset-0 h-full w-full bg-black object-contain"
      onLoadedMetadata={(e) => {
        if (startAt > 0 && !seekedRef.current) {
          try {
            e.currentTarget.currentTime = startAt;
          } catch {
            /* ignore */
          }
          seekedRef.current = true;
        }
      }}
      onTimeUpdate={(e) => onTime?.(e.currentTarget.currentTime || 0, e.currentTarget.duration || 0)}
      onPlay={() => onPlayingChange?.(true)}
      onPause={() => onPlayingChange?.(false)}
      onEnded={() => {
        onPlayingChange?.(false);
        onEnded?.();
      }}
    />
  );
}
