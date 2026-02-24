import { Play, X } from "lucide-react";

interface PlayerOverlayProps {
  title: string;
  category?: string;
  isPlaying: boolean;
  showControls: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
}

const PlayerOverlay = ({ title, category, isPlaying, showControls, onClose, onTogglePlay }: PlayerOverlayProps) => (
  <>
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

    {/* Click area — blocks YouTube interaction */}
    <div
      className="absolute inset-0 z-10"
      onClick={onTogglePlay}
      onTouchEnd={(e) => { e.preventDefault(); onTogglePlay(); }}
    />

    {/* Center play indicator */}
    <div
      className={`absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${showControls && !isPlaying ? "opacity-100" : "opacity-0"}`}
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/50 flex items-center justify-center">
        <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white" />
      </div>
    </div>
  </>
);

export default PlayerOverlay;
