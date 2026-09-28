"use client";

import { useEffect, useRef, useState } from "react";
import { audioClipId, audioClipPath, voiceableText } from "@/lib/audio";
import { createClipPlayer, type ClipPlayer } from "@/lib/clip-player";

/**
 * Small "hear it" button next to a script line. Renders only when a
 * pre-generated clip exists for the exact line being shown (passed as
 * `available`, the manifest id set) — lines with a child's name have no clip
 * and simply get no button.
 *
 * The player is bound to the clip it was created for: when the line changes
 * (the next step reuses this component), playback stops and the next tap
 * loads the new clip. Callers also key the button by its line.
 */
export function AudioButton({
  line,
  available,
  className,
}: {
  line: string;
  available: Set<string>;
  className?: string;
}) {
  const playerRef = useRef<ClipPlayer | null>(null);
  const [playing, setPlaying] = useState(false);

  const text = voiceableText(line);
  const id = text ? audioClipId(text) : null;

  // A new line (or unmount) must never keep playing, or replay, the old clip.
  useEffect(() => {
    return () => {
      playerRef.current?.stop();
    };
  }, [id]);

  if (!id || !available.has(id)) return null;
  const clipId = id;

  function toggle() {
    if (!playerRef.current) {
      playerRef.current = createClipPlayer({
        makeAudio: (src) => new Audio(src),
        onPlayingChange: setPlaying,
      });
    }
    playerRef.current.toggle(audioClipPath(clipId));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? "Stop" : "Hear this line"}
      aria-pressed={playing}
      className={[
        // 44px tap target around a smaller visible circle.
        "group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
        className ?? "",
      ].join(" ")}
    >
      <span
        aria-hidden
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-sea-glass text-sm transition-colors group-hover:bg-sea-glass/40"
      >
        {playing ? "❚❚" : "▶"}
      </span>
    </button>
  );
}
