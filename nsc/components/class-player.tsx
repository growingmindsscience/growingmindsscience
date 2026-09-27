"use client";

import { useEffect, useRef, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";

interface PlaybackInfo { playbackId: string; token: string; expiresAt: number }

export function ClassPlayer({ lessonId, title, startTime, completed = false }: {
  lessonId: string;
  title: string;
  startTime: number;
  completed?: boolean;
}) {
  const [playback, setPlayback] = useState<PlaybackInfo | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(completed);
  const lastSaved = useRef(0);
  const endpoint = `/nsc/api/classes/toddlerhood/lessons/${lessonId}`;

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const response = await fetch(`${endpoint}/playback`, { credentials: "same-origin", cache: "no-store" });
        if (!response.ok) throw new Error("Playback is unavailable. Please refresh or contact us.");
        const result = await response.json() as PlaybackInfo;
        if (!live) return;
        setPlayback(result);
        const untilRefresh = Math.max(60_000, result.expiresAt * 1000 - Date.now() - 300_000);
        timer = setTimeout(load, untilRefresh);
      } catch (cause) {
        if (live) setError((cause as Error).message);
      }
    }
    void load();
    return () => { live = false; clearTimeout(timer); };
  }, [endpoint]);

  async function save(positionSeconds: number, complete = false) {
    if (!Number.isFinite(positionSeconds)) return;
    try {
      const response = await fetch(`${endpoint}/progress`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionSeconds, complete }),
      });
      if (response.ok && complete) setDone(true);
    } catch { /* Saved again on the next progress event. */ }
  }

  if (error) return <p role="alert" className="rounded-xl bg-rung-glow p-4 text-ink">{error}</p>;
  if (!playback) return <p role="status" className="text-teal-soft">Loading your video…</p>;
  return (
    <div>
      <MuxPlayer
        className="aspect-video w-full overflow-hidden rounded-2xl"
        playbackId={playback.playbackId}
        tokens={{ playback: playback.token }}
        poster=""
        startTime={startTime}
        videoTitle={title}
        accentColor="#1E5F62"
        onTimeUpdate={(event) => {
          const seconds = (event.target as HTMLMediaElement).currentTime;
          if (seconds - lastSaved.current >= 15) {
            lastSaved.current = seconds;
            void save(seconds);
          }
        }}
        onPause={(event) => { void save((event.target as HTMLMediaElement).currentTime); }}
        onEnded={(event) => { void save((event.target as HTMLMediaElement).currentTime, true); }}
      />
      <p className="mt-2 text-xs text-teal-soft">Your place is saved as you watch.</p>
      <button type="button" onClick={() => void save(startTime, true)}
        className="mt-3 rounded-full border border-teal px-4 py-2 text-sm font-semibold text-teal hover:bg-sea-glass/30">
        {done ? "Lesson marked complete ✓" : "Mark lesson complete"}
      </button>
    </div>
  );
}
