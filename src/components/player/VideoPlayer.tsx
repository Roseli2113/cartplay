import { useState, useEffect, useRef, useCallback } from "react";
import { YouTubeProvider, extractVideoId } from "./YouTubeProvider";
import { usePlayerEvents } from "./usePlayerEvents";
import PlayerControls from "./PlayerControls";
import PlayerOverlay from "./PlayerOverlay";
import type { VideoPlayerProps, PlaybackState } from "./types";

const VideoPlayer = ({ title, category, streamUrl, onClose }: VideoPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<YouTubeProvider | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const videoId = extractVideoId(streamUrl);
  const { emit } = usePlayerEvents(videoId ?? undefined);

  // Auto-hide controls
  const startHideTimer = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setShowControls(true);
    hideTimeoutRef.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  // Init provider
  useEffect(() => {
    if (!videoId || !videoContainerRef.current) return;

    const provider = new YouTubeProvider();
    providerRef.current = provider;

    provider.onReady(() => {
      setDuration(provider.getDuration());
      startHideTimer();
    });

    provider.onStateChange((state: PlaybackState) => {
      const playing = state === "playing";
      setIsPlaying(playing);
      if (playing) {
        setDuration(provider.getDuration());
        emit("play", provider.getCurrentTime(), provider.getDuration());
      } else if (state === "paused") {
        emit("pause", provider.getCurrentTime(), provider.getDuration());
      } else if (state === "ended") {
        emit("ended", provider.getCurrentTime(), provider.getDuration());
      }
    });

    provider.init(videoContainerRef.current, videoId, { autoplay: true, volume: 80 });

    return () => {
      provider.destroy();
      providerRef.current = null;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [videoId]);

  // Progress tracker
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const p = providerRef.current;
      if (!p) return;
      const ct = p.getCurrentTime();
      const dur = p.getDuration();
      setCurrentTime(ct);
      setDuration(dur);
      if (dur > 0) setProgress((ct / dur) * 100);
    }, 500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Block right-click
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  const togglePlay = () => {
    const p = providerRef.current;
    if (!p) return;
    if (isPlaying) p.pause(); else p.play();
  };

  const toggleMute = () => {
    const p = providerRef.current;
    if (!p) return;
    if (isMuted) {
      p.unmute();
      p.setVolume(volume);
      setIsMuted(false);
    } else {
      p.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (v: number) => {
    const p = providerRef.current;
    if (!p) return;
    setVolume(v);
    p.setVolume(v);
    if (v === 0) { p.mute(); setIsMuted(true); }
    else if (isMuted) { p.unmute(); setIsMuted(false); }
  };

  const handleSeek = (pct: number) => {
    const p = providerRef.current;
    if (!p || !duration) return;
    const seekTo = (pct / 100) * duration;
    p.seekTo(seekTo);
    setProgress(pct);
    setCurrentTime(seekTo);
    emit("seek", seekTo, duration);
  };

  const handlePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    providerRef.current?.setPlaybackRate(rate);
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

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col select-none"
      onMouseMove={startHideTimer}
      onTouchStart={startHideTimer}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Video area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Scaled-up iframe hides YouTube overlays (related videos, title, logo) by cropping edges */}
        <div
          ref={videoContainerRef}
          className="absolute w-full h-full [&>div]:w-full [&>div]:h-full [&>iframe]:w-full [&>iframe]:h-full"
          style={{
            pointerEvents: "none",
            top: "-5%",
            left: "-5%",
            width: "110%",
            height: "110%",
          }}
        />

        <PlayerOverlay
          title={title}
          category={category}
          isPlaying={isPlaying}
          showControls={showControls}
          onClose={onClose}
          onTogglePlay={togglePlay}
        />
      </div>

      {/* Bottom controls */}
      <div className={`transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <PlayerControls
          isPlaying={isPlaying}
          isMuted={isMuted}
          volume={volume}
          progress={progress}
          currentTime={currentTime}
          duration={duration}
          isFullscreen={isFullscreen}
          playbackRate={playbackRate}
          onTogglePlay={togglePlay}
          onToggleMute={toggleMute}
          onVolumeChange={handleVolumeChange}
          onSeek={handleSeek}
          onToggleFullscreen={toggleFullscreen}
          onPlaybackRateChange={handlePlaybackRate}
        />
      </div>
    </div>
  );
};

export default VideoPlayer;
