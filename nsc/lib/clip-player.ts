/**
 * Playback controller behind the "hear this line" button, kept free of React
 * and the DOM so it can be unit-tested with a fake audio element.
 *
 * The bug it exists to prevent: the audio element used to be created once
 * and cached, so after the first step every tap replayed the FIRST clip
 * ("…one block?" while the screen asked for three), and a parent reading
 * along would ask for the wrong number. Here the element is bound to the
 * clip it was made for, and asking for a different clip always discards it.
 */

/** Event-handler slot, shaped like the DOM's so HTMLAudioElement fits. */
type Handler = ((ev: Event) => unknown) | null;

export interface AudioLike {
  currentTime: number;
  onended: Handler;
  onpause: Handler;
  onerror: Handler;
  play(): Promise<void> | void;
  pause(): void;
}

export interface ClipPlayer {
  /** Play `src` from the start, or stop it if it is the clip now playing. */
  toggle(src: string): void;
  /** Stop and release the element (on a new line, or unmount). */
  stop(): void;
  readonly playing: boolean;
  readonly src: string | null;
}

export function createClipPlayer(opts: {
  makeAudio: (src: string) => AudioLike;
  onPlayingChange: (playing: boolean) => void;
}): ClipPlayer {
  let el: AudioLike | null = null;
  let loaded: string | null = null;
  let playing = false;

  const set = (p: boolean) => {
    if (playing === p) return;
    playing = p;
    opts.onPlayingChange(p);
  };

  const release = () => {
    if (el) {
      el.onended = el.onpause = el.onerror = null;
      try {
        el.pause();
      } catch {
        // already stopped
      }
    }
    el = null;
    loaded = null;
    set(false);
  };

  return {
    toggle(src: string) {
      if (el && loaded === src && playing) {
        el.pause();
        el.currentTime = 0;
        set(false);
        return;
      }
      if (!el || loaded !== src) {
        release();
        const fresh = opts.makeAudio(src);
        fresh.onended = () => set(false);
        fresh.onpause = () => set(false);
        // A missing file or decode error must not leave the button on "Stop".
        fresh.onerror = () => set(false);
        el = fresh;
        loaded = src;
      }
      el.currentTime = 0;
      set(true);
      try {
        const started = el.play();
        // Autoplay policy or a network error rejects play().
        if (started && typeof (started as Promise<void>).catch === "function") {
          (started as Promise<void>).catch(() => set(false));
        }
      } catch {
        set(false);
      }
    },
    stop: release,
    get playing() {
      return playing;
    },
    get src() {
      return loaded;
    },
  };
}
