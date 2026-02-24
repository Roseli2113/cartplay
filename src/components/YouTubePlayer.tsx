import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, X, Maximize, Minimize } from "lucide-react";
import { Slider } from "@/components/ui/slider";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  title: string;
  category?: string;
  streamUrl: string;
  onClose: () => void;
}

function extractVideoId(url: string): string | null {
  // Handle embed URLs: youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  // Handle watch URLs: youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  // Handle short URLs: youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  return null;
}

let ytApiLoaded = false;
let ytApiLoading = false;
const ytApiCallbacks: (() => void)[] = [];

function loadYTApi(): Promise<void> {
  return new Promise((resolve) => {
    if (ytApiLoaded && window.YT?.Player) {
      resolve();
      return;
    }
    ytApiCallbacks.push(resolve);
    if (ytApiLoading) return;
    ytApiLoading = true;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true;
      ytApiCallbacks.forEach((cb) => cb());
      ytApiCallbacks.length = 0;
    };
  });
}

const YouTubePlayer = ({ title, category, streamUrl, onClose }: YouTubePlayerProps) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videoId = extractVideoId(streamUrl);

  const startHideTimer = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setShowControls(true);
    hideTimeoutRef.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  useEffect(() => {
    if (!videoId) return;

    loadYTApi().then(() => {
      playerRef.current = new window.YT.Player("yt-player-container", {
        videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(volume);
            setDuration(event.target.getDuration());
            startHideTimer();
          },
          onStateChange: (event: any) => {
            setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
            if (event.data === window.YT.PlayerState.PLAYING) {
              setDuration(event.target.getDuration());
            }
          },
        },
      });
    });

    return () => {
      if (playerRef.current?.destroy) playerRef.current.destroy();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [videoId]);

  // Progress tracker
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime && playerRef.current?.getDuration) {
        const ct = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration();
        setCurrentTime(ct);
        setDuration(dur);
        if (dur > 0) setProgress((ct / dur) * 100);
      }
    }, 500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (val: number[]) => {
    if (!playerRef.current) return;
    const v = val[0];
    setVolume(v);
    playerRef.current.setVolume(v);
    if (v === 0) {
      playerRef.current.mute();
      setIsMuted(true);
    } else if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    }
  };

  const handleSeek = (val: number[]) => {
    if (!playerRef.current || !duration) return;
    const seekTo = (val[0] / 100) * duration;
    playerRef.current.seekTo(seekTo, true);
    setProgress(val[0]);
    setCurrentTime(seekTo);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      onMouseMove={startHideTimer}
      onTouchStart={startHideTimer}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-b from-black/90 to-transparent absolute top-0 left-0 right-0 z-30 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div className="min-w-0 flex-1 mr-3">
          <h2 className="font-display font-semibold text-white text-sm sm:text-lg truncate">{title}</h2>
          {category && <span className="text-[10px] sm:text-xs text-white/60">{category}</span>}
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0 touch-manipulation"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Video area */}
      <div className="flex-1 relative overflow-hidden">
        <div id="yt-player-container" className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />
        {/* Click overlay - blocks ALL YouTube interaction */}
        <div className="absolute inset-0 z-10" onClick={togglePlay} onTouchEnd={(e) => { e.preventDefault(); togglePlay(); }} />

        {/* Center play/pause indicator */}
        <div
          className={`absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${showControls && !isPlaying ? "opacity-100" : "opacity-0"}`}
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/50 flex items-center justify-center">
            <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white" />
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 pb-4 px-3 sm:px-6 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {/* Progress bar */}
        <div className="mb-3">
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={handleSeek}
            className="w-full [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-primary-foreground [&_[role=slider]]:bg-primary"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] sm:text-xs text-white/60">{formatTime(currentTime)}</span>
            <span className="text-[10px] sm:text-xs text-white/60">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={togglePlay} className="w-10 h-10 flex items-center justify-center text-white hover:text-primary transition-colors touch-manipulation">
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2 group">
            <button onClick={toggleMute} className="w-8 h-8 flex items-center justify-center text-white hover:text-primary transition-colors touch-manipulation">
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <div className="w-0 group-hover:w-20 sm:w-20 transition-all overflow-hidden">
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
                className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
              />
            </div>
          </div>

          <div className="flex-1" />

          <button onClick={toggleFullscreen} className="w-10 h-10 flex items-center justify-center text-white hover:text-primary transition-colors touch-manipulation">
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default YouTubePlayer;
