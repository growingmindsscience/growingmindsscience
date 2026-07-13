"use client";

import { useRef, useState } from "react";
import { audioClipId, audioClipPath, voiceableText } from "@/lib/audio";

/**
 * Small "hear it" button next to a script line. Renders only when a
 * pre-generated clip exists for the exact line being shown (passed as
 * `available`, the manifest id set) — lines with a child's name have no clip
 * and simply get no button.
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const text = voiceableText(line);
  const id = text ? audioClipId(text) : null;
  if (!id || !available.has(id)) return null;

  function toggle() {
    let el = audioRef.current;
    if (!el) {
      el = new Audio(audioClipPath(id!));
      el.onended = () => setPlaying(false);
      el.onpause = () => setPlaying(false);
      audioRef.current = el;
    }
    if (playing) {
      el.pause();
      el.currentTime = 0;
      setPlaying(false);
    } else {
      el.currentTime = 0;
      void el.play();
      setPlaying(true);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? "Stop" : "Hear this line"}
      aria-pressed={playing}
      className={[
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sea-glass text-teal transition-colors hover:bg-sea-glass/40",
        className ?? "",
      ].join(" ")}
    >
      <span aria-hidden className="text-sm">
        {playing ? "❚❚" : "▶"}
      </span>
    </button>
  );
}
