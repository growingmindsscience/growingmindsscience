"use client";

import { useEffect, useRef, useState, type ComponentRef } from "react";
import MuxPlayer from "@mux/mux-player-react";
import type { ClassCourseSlug } from "@/lib/classes";
import { sitePath } from "@/lib/site";
import { Button, LinkButton, buttonClasses } from "@/components/ui";

interface PlaybackInfo { playbackId: string; token: string; expiresAt: number }

/** Why the first playback request failed; decides what the parent can do next. */
type LoadError = "signed-out" | "unavailable";

export interface NextLesson { href: string; title: string; minutes?: number | null }

/**
 * The still shown before a lesson plays: an ink panel with the lesson's own
 * title and one real Play button. The video's first frame is a title slide
 * with its own subtitle, and a play button centered on the video covered
 * that subtitle, so the first frame is never shown.
 */
function LessonPoster({ label, title, minutes, resume, loading, onPlay }: {
  label?: string;
  title: string;
  minutes?: number | null;
  resume: boolean;
  loading: boolean;
  onPlay: () => void;
}) {
  return (
    <div className="ink-band ink-grid absolute inset-0 flex flex-col justify-between gap-3 bg-ink-800 p-4 text-on-dark sm:p-8">
      <div className="min-w-0">
        {label && <p className="text-[0.9375rem] font-semibold leading-snug text-amber">{label}</p>}
        <p className="mt-1.5 line-clamp-3 max-w-[26ch] font-display text-[clamp(1.375rem,0.9rem+2.6vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.005em] text-on-dark [text-wrap:balance] sm:mt-3">
          {title}
        </p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <button
          type="button"
          onClick={onPlay}
          disabled={loading}
          aria-busy={loading || undefined}
          className={buttonClasses("amber")}
        >
          {loading ? (
            "Loading your video…"
          ) : (
            <>
              <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" className="mr-2.5 shrink-0" fill="currentColor">
                <path d="M3.5 1.8v12.4a.8.8 0 0 0 1.2.7l10-6.2a.8.8 0 0 0 0-1.4l-10-6.2a.8.8 0 0 0-1.2.7Z" />
              </svg>
              {resume ? "Resume lesson" : "Play lesson"}
              {minutes ? <span className="ml-2 font-normal opacity-80">· {minutes} min</span> : null}
            </>
          )}
        </button>
        <p className="hidden max-w-[30ch] text-right text-sm text-on-dark-muted sm:block">
          The written lesson is below the video.
        </p>
      </div>
    </div>
  );
}

export function ClassPlayer({ lessonId, title, startTime, completed = false, courseSlug = "toddlerhood", next, preview = false, posterLabel, posterMinutes }: {
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
  /** Line above the title on the poster, e.g. "Module 1 · Lesson 3 of 16". */
  posterLabel?: string;
  /** Length shown on the Play button. */
  posterMinutes?: number | null;
}) {
  const player = useRef<ComponentRef<typeof MuxPlayer>>(null);
  const [started, setStarted] = useState(false);
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

  // The click is the user gesture the browser needs to start playback with sound.
  function startPlaying() {
    setStarted(true);
    void Promise.resolve(player.current?.play()).catch(() => { /* the player's own Play control is still there */ });
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
      <div role="alert" className="rounded-card border border-line bg-tint p-5 text-ink">
        <p className="font-semibold text-ink-deep">Your sign-in has expired.</p>
        <p className="mt-1 text-sm">Sign in again and this lesson will pick up where you left off.</p>
        <Button size="sm" className="mt-4" onClick={() => window.location.reload()}>Sign in again</Button>
      </div>
    );
  } else if (loadError) {
    media = (
      <div role="alert" className="rounded-card border border-line bg-tint p-5 text-ink">
        <p className="font-semibold text-ink-deep">We could not load this video.</p>
        <p className="mt-1 text-sm">
          The written lesson is below. If the video still will not load,{" "}
          <a href={sitePath("/contact/")} className="font-semibold text-teal underline underline-offset-4">contact us</a> and we will sort it out.
        </p>
        <Button size="sm" className="mt-4" onClick={() => { setLoadError(null); setAttempt((count) => count + 1); }}>Try again</Button>
      </div>
    );
  } else {
    // One 16:9 box for the poster and the player, so the page does not jump
    // when the video arrives or starts. The player is inert until Play, so a
    // keyboard cannot land on controls hidden behind the poster.
    media = (
      <div className="relative aspect-video w-full overflow-hidden rounded-card bg-ink-800">
        {playback && (
          <div inert={!started} className="size-full">
            <MuxPlayer
              ref={player}
              className="block aspect-video w-full overflow-hidden rounded-card"
              playbackId={playback.playbackId}
              tokens={{ playback: playback.token }}
              poster=""
              startTime={resumeAt}
              videoTitle={title}
              accentColor="#F2A93B"
              onPlay={() => setStarted(true)}
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
          </div>
        )}
        {!started && (
          <LessonPoster
            label={posterLabel}
            title={title}
            minutes={posterMinutes}
            resume={startTime >= 5}
            loading={!playback}
            onPlay={startPlaying}
          />
        )}
      </div>
    );
  }

  if (preview) return <div>{media}</div>;

  // The completion control sits outside the player on purpose: a parent who
  // reads the lesson, or whose video will not load, can still finish it.
  return (
    <div>
      {media}
      {done ? (
        <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-card border border-line bg-surface p-5">
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
          {playback && !loadError && <p className="mt-2 text-sm text-ink-muted">Your place is saved as you watch.</p>}
          <Button variant="ghost" size="sm" className="mt-3" disabled={saving} onClick={() => void markComplete()}>
            {saving ? "Saving…" : "Mark lesson complete"}
          </Button>
          {saveFailed && (
            <p role="alert" className="mt-2 text-sm text-danger">
              We could not save that. Check your connection and try again.
            </p>
          )}
        </>
      )}
    </div>
  );
}
