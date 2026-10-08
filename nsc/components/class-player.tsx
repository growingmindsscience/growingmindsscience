"use client";

import { useEffect, useRef, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";
import type { ClassCourseSlug } from "@/lib/classes";
import { sitePath } from "@/lib/site";
import { Button, LinkButton } from "@/components/ui";

interface PlaybackInfo { playbackId: string; token: string; expiresAt: number }

/** Why the first playback request failed; decides what the parent can do next. */
type LoadError = "signed-out" | "unavailable";

export interface NextLesson { href: string; title: string; minutes?: number | null }

export function ClassPlayer({ lessonId, title, startTime, completed = false, courseSlug = "toddlerhood", next, preview = false }: {
  lessonId: string;
  title: string;
  startTime: number;
  completed?: boolean;
  courseSlug?: ClassCourseSlug;
  /** The lesson after this one; omitted on the last lesson of the class. */
  next?: NextLesson;
  /**
   * The free lesson, for visitors who have not bought the class: playback
   * comes from the preview route, and nothing is saved, so there is no
   * progress note or completion control.
   */
  preview?: boolean;
}) {
  const [playback, setPlayback] = useState<PlaybackInfo | null>(null);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState(completed);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  // Where the player starts when it (re)loads its source. A token refresh
  // reloads the source, so it must resume from where the parent is now.
  const [resumeAt, setResumeAt] = useState(startTime);
  const lastSaved = useRef(0);
  const position = useRef(startTime);
  const endpoint = `/nsc/api/classes/${courseSlug}/lessons/${lessonId}`;
  const playbackUrl = preview ? `/nsc/api/classes/${courseSlug}/preview/playback` : `${endpoint}/playback`;

  useEffect(() => {
    let live = true;
    let loaded = false;
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const response = await fetch(playbackUrl, { credentials: "same-origin", cache: "no-store" });
        if (!live) return;
        if (!response.ok) {
          // A token refresh that fails must not take a playing video away:
          // keep the player mounted and try again shortly.
          if (loaded && response.status !== 401) { timer = setTimeout(load, 30_000); return; }
          setLoadError(response.status === 401 ? "signed-out" : "unavailable");
          return;
        }
        const result = await response.json() as PlaybackInfo;
        if (!live) return;
        if (loaded) setResumeAt(position.current);
        loaded = true;
        setPlayback(result);
        const untilRefresh = Math.max(60_000, result.expiresAt * 1000 - Date.now() - 300_000);
        timer = setTimeout(load, untilRefresh);
      } catch {
        if (!live) return;
        if (loaded) timer = setTimeout(load, 30_000);
        else setLoadError("unavailable");
      }
    }
    void load();
    return () => { live = false; clearTimeout(timer); };
  }, [playbackUrl, attempt]);

  async function save(positionSeconds: number, complete = false): Promise<boolean> {
    if (preview || !Number.isFinite(positionSeconds)) return false;
    try {
      const response = await fetch(`${endpoint}/progress`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionSeconds, complete }),
      });
      if (response.ok && complete) setDone(true);
      return response.ok;
    } catch {
      // A position save is retried on the next progress event.
      return false;
    }
  }

  async function markComplete() {
    setSaving(true);
    setSaveFailed(false);
    const saved = await save(position.current, true);
    setSaving(false);
    setSaveFailed(!saved);
  }

  let media;
  if (loadError === "signed-out") {
    media = (
      <div role="alert" className="rounded-2xl bg-rung-glow p-5 text-ink">
        <p className="font-semibold text-ink-deep">Your sign-in has expired.</p>
        <p className="mt-1 text-sm">Sign in again and this lesson will pick up where you left off.</p>
        <Button size="sm" className="mt-4" onClick={() => window.location.reload()}>Sign in again</Button>
      </div>
    );
  } else if (loadError) {
    media = (
      <div role="alert" className="rounded-2xl bg-rung-glow p-5 text-ink">
        <p className="font-semibold text-ink-deep">We could not load this video.</p>
        <p className="mt-1 text-sm">
          The written lesson is below. If the video still will not load,{" "}
          <a href={sitePath("/contact/")} className="font-semibold text-teal underline">contact us</a> and we will sort it out.
        </p>
        <Button size="sm" className="mt-4" onClick={() => { setLoadError(null); setAttempt((count) => count + 1); }}>Try again</Button>
      </div>
    );
  } else if (!playback) {
    // Same 16:9 box as the player, so the page does not jump when it arrives.
    media = (
      <div role="status" className="flex aspect-video w-full items-center justify-center rounded-2xl bg-sea-glass/40 text-sm text-ink-soft motion-safe:animate-pulse">
        Loading your video…
      </div>
    );
  } else {
    media = (
      <MuxPlayer
        className="aspect-video w-full overflow-hidden rounded-2xl"
        playbackId={playback.playbackId}
        tokens={{ playback: playback.token }}
        poster=""
        startTime={resumeAt}
        videoTitle={title}
        accentColor="#1E5F62"
        onTimeUpdate={(event) => {
          const seconds = (event.target as HTMLMediaElement).currentTime;
          position.current = seconds;
          // Absolute, so scrubbing backward is saved too.
          if (Math.abs(seconds - lastSaved.current) >= 15) {
            lastSaved.current = seconds;
            void save(seconds);
          }
        }}
        onPause={(event) => {
          const video = event.target as HTMLMediaElement;
          // A video also pauses as it ends; that save belongs to onEnded.
          if (!video.ended) void save(video.currentTime);
        }}
        onEnded={(event) => {
          position.current = (event.target as HTMLMediaElement).currentTime;
          if (!preview) void markComplete();
        }}
      />
    );
  }

  if (preview) return <div>{media}</div>;

  // The completion control sits outside the player on purpose: a parent who
  // reads the lesson, or whose video will not load, can still finish it.
  return (
    <div>
      {media}
      {done ? (
        <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-2xl border border-sea-glass bg-surface p-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-teal"><span aria-hidden="true" className="mr-1.5">✓</span>Lesson complete</p>
            {next ? (
              <p className="mt-1 text-ink-deep">
                Next: <strong className="font-semibold">{next.title}</strong>
                {next.minutes ? <span className="text-ink-soft"> · {next.minutes} min</span> : null}
              </p>
            ) : (
              <p className="mt-1 text-ink-deep">That was the last lesson. You have finished the class.</p>
            )}
          </div>
          {next
            ? <LinkButton href={next.href}>Next lesson</LinkButton>
            : <LinkButton href="/app/classes">Back to My classes</LinkButton>}
        </div>
      ) : (
        <>
          {playback && !loadError && <p className="mt-2 text-xs text-teal-soft">Your place is saved as you watch.</p>}
          <Button variant="ghost" size="sm" className="mt-3 border border-teal" disabled={saving} onClick={() => void markComplete()}>
            {saving ? "Saving…" : "Mark lesson complete"}
          </Button>
          {saveFailed && (
            <p role="alert" className="mt-2 text-sm text-coral-deep">
              We could not save that. Check your connection and try again.
            </p>
          )}
        </>
      )}
    </div>
  );
}
