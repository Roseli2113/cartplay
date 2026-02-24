// Video Provider Abstraction Layer
// Swap YouTube for Vimeo, Bunny, or self-hosted by implementing VideoProvider

export interface VideoProvider {
  init(container: HTMLElement, videoId: string, options: PlayerOptions): void;
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  setVolume(volume: number): void;
  mute(): void;
  unmute(): void;
  setPlaybackRate(rate: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
  onStateChange(cb: (state: PlaybackState) => void): void;
  onReady(cb: () => void): void;
}

export interface PlayerOptions {
  autoplay?: boolean;
  startTime?: number;
  volume?: number;
}

export type PlaybackState = "playing" | "paused" | "buffering" | "ended" | "idle";

export interface PlayerEvent {
  type: "play" | "pause" | "seek" | "ended" | "timeupdate";
  currentTime: number;
  duration: number;
  timestamp: number;
}

export interface VideoPlayerProps {
  title: string;
  category?: string;
  streamUrl: string;
  onClose: () => void;
}
