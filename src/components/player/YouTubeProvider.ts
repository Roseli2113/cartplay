import type { VideoProvider, PlayerOptions, PlaybackState } from "./types";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
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

export function extractVideoId(url: string): string | null {
  const embedMatch = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  return null;
}

export class YouTubeProvider implements VideoProvider {
  private player: any = null;
  private stateCallback: ((state: PlaybackState) => void) | null = null;
  private readyCallback: (() => void) | null = null;

  async init(container: HTMLElement, videoId: string, options: PlayerOptions = {}) {
    await loadYTApi();

    // Create a child div for YT to replace
    const el = document.createElement("div");
    container.appendChild(el);

    this.player = new window.YT.Player(el, {
      videoId,
      host: "https://www.youtube-nocookie.com",
      playerVars: {
        autoplay: options.autoplay !== false ? 1 : 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        fs: 0,
        disablekb: 1,
        playsinline: 1,
        origin: window.location.origin,
        start: options.startTime || 0,
      },
      events: {
        onReady: (event: any) => {
          event.target.setVolume(options.volume ?? 80);
          this.readyCallback?.();
        },
        onStateChange: (event: any) => {
          const map: Record<number, PlaybackState> = {
            [-1]: "idle",
            [window.YT.PlayerState.PLAYING]: "playing",
            [window.YT.PlayerState.PAUSED]: "paused",
            [window.YT.PlayerState.BUFFERING]: "buffering",
            [window.YT.PlayerState.ENDED]: "ended",
          };
          this.stateCallback?.(map[event.data] ?? "idle");
        },
      },
    });
  }

  play() { this.player?.playVideo(); }
  pause() { this.player?.pauseVideo(); }
  seekTo(s: number) { this.player?.seekTo(s, true); }
  setVolume(v: number) { this.player?.setVolume(v); }
  mute() { this.player?.mute(); }
  unmute() { this.player?.unMute(); }
  setPlaybackRate(r: number) { this.player?.setPlaybackRate?.(r); }
  getCurrentTime(): number { return this.player?.getCurrentTime?.() ?? 0; }
  getDuration(): number { return this.player?.getDuration?.() ?? 0; }

  destroy() {
    try { this.player?.destroy(); } catch { /* noop */ }
    this.player = null;
  }

  onStateChange(cb: (state: PlaybackState) => void) { this.stateCallback = cb; }
  onReady(cb: () => void) { this.readyCallback = cb; }
}
