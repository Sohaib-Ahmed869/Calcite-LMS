import { useEffect, useRef } from 'react';
import { youTubeId } from './lessonType';

// Load the YouTube IFrame API once and share the promise across players.
let apiPromise = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      document.head.appendChild(s);
    }
  });
  return apiPromise;
}

/**
 * YouTube player using the IFrame API so we can report playback time (for progress + completion).
 * Props: url, startAt, onTime(seconds, duration), onEnded, onPlayingChange.
 */
export default function YouTubePlayer({ url, startAt = 0, onTime, onEnded, onPlayingChange }) {
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const pollRef = useRef(null);
  const cbRef = useRef({ onTime, onEnded, onPlayingChange });
  cbRef.current = { onTime, onEnded, onPlayingChange };

  useEffect(() => {
    let destroyed = false;
    const id = youTubeId(url);
    if (!id || !mountRef.current) return undefined;

    const stopPoll = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    const startPoll = () => {
      stopPoll();
      pollRef.current = setInterval(() => {
        const p = playerRef.current;
        if (p?.getCurrentTime) cbRef.current.onTime?.(p.getCurrentTime() || 0, p.getDuration?.() || 0);
      }, 1000);
    };

    loadYouTubeApi().then(() => {
      if (destroyed || !mountRef.current) return;
      playerRef.current = new window.YT.Player(mountRef.current, {
        videoId: id,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, enablejsapi: 1 },
        events: {
          onReady: (e) => {
            if (startAt > 0) e.target.seekTo(startAt, true);
          },
          onStateChange: (e) => {
            const S = window.YT.PlayerState;
            if (e.data === S.PLAYING) {
              cbRef.current.onPlayingChange?.(true);
              startPoll();
            } else {
              cbRef.current.onPlayingChange?.(false);
              stopPoll();
            }
            if (e.data === S.ENDED) {
              const p = playerRef.current;
              cbRef.current.onTime?.(p?.getCurrentTime?.() || 0, p?.getDuration?.() || 0);
              cbRef.current.onEnded?.();
            }
          },
        },
      });
    });

    return () => {
      destroyed = true;
      stopPoll();
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
    // Re-create the player only when the URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div className="absolute inset-0 bg-black">
      <div ref={mountRef} className="h-full w-full" />
    </div>
  );
}
