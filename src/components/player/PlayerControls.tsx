import { useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface PlayerControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  progress: number;
  currentTime: number;
  duration: number;
  isFullscreen: boolean;
  playbackRate: number;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
  onSeek: (pct: number) => void;
  onToggleFullscreen: () => void;
  onPlaybackRateChange: (rate: number) => void;
}

const formatTime = (s: number) => {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const PlayerControls = ({
  isPlaying, isMuted, volume, progress, currentTime, duration,
  isFullscreen, playbackRate,
  onTogglePlay, onToggleMute, onVolumeChange, onSeek,
  onToggleFullscreen, onPlaybackRateChange,
}: PlayerControlsProps) => {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 pb-4 px-3 sm:px-6">
      {/* Progress */}
      <div className="mb-3">
        <Slider
          value={[progress]}
          max={100}
          step={0.1}
          onValueChange={(v) => onSeek(v[0])}
          className="w-full [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-primary-foreground [&_[role=slider]]:bg-primary"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] sm:text-xs text-white/60">{formatTime(currentTime)}</span>
          <span className="text-[10px] sm:text-xs text-white/60">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button onClick={onTogglePlay} className="w-10 h-10 flex items-center justify-center text-white hover:text-primary transition-colors touch-manipulation">
          {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
        </button>

        <div className="flex items-center gap-2 group">
          <button onClick={onToggleMute} className="w-8 h-8 flex items-center justify-center text-white hover:text-primary transition-colors touch-manipulation">
            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <div className="w-0 group-hover:w-20 sm:w-20 transition-all overflow-hidden">
            <Slider
              value={[isMuted ? 0 : volume]}
              max={100}
              step={1}
              onValueChange={(v) => onVolumeChange(v[0])}
              className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
            />
          </div>
        </div>

        <div className="flex-1" />

        {/* Speed */}
        <div className="relative">
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="h-10 px-2 flex items-center justify-center text-white hover:text-primary transition-colors touch-manipulation text-xs font-semibold"
          >
            {playbackRate}x
          </button>
          {showSpeedMenu && (
            <div className="absolute bottom-12 right-0 bg-black/90 rounded-lg border border-white/10 py-1 min-w-[80px]">
              {[0.5, 1, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => { onPlaybackRateChange(rate); setShowSpeedMenu(false); }}
                  className={`w-full px-3 py-1.5 text-xs text-left hover:bg-white/10 transition-colors ${playbackRate === rate ? "text-primary font-bold" : "text-white"}`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={onToggleFullscreen} className="w-10 h-10 flex items-center justify-center text-white hover:text-primary transition-colors touch-manipulation">
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default PlayerControls;
