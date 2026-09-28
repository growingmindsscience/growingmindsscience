"use client";

import { useState } from "react";
import * as UpChunk from "@mux/upchunk";

export function ClassUpload({ lessonId }: { lessonId: string }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function start(file: File) {
    if (!file.type.startsWith("video/") && !file.name.toLowerCase().endsWith(".mp4")) {
      setMessage("Choose an MP4 video file.");
      return;
    }
    setBusy(true);
    setMessage("Preparing private upload…");
    try {
      const response = await fetch("/nsc/api/admin/classes/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      if (!response.ok) throw new Error("Could not create an upload link.");
      const { url } = await response.json() as { url: string };
      const uploadHost = new URL(url).hostname;
      const upload = UpChunk.createUpload({ endpoint: url, file, chunkSize: 5120 });
      upload.on("progress", (event) => setProgress(Math.round(event.detail)));
      upload.on("error", (event) => {
        const detail = event.detail as { message?: string; response?: { statusCode?: number; url?: string } } | undefined;
        const status = detail?.response?.statusCode;
        const reason = detail?.message?.slice(0, 180) || "The video transfer could not finish.";
        const host = detail?.response?.url ? new URL(detail.response.url).hostname : uploadHost;
        setMessage(`Upload failed${status ? ` (${status})` : ""} at ${host}: ${reason}`);
        setBusy(false);
      });
      upload.on("success", () => {
        setProgress(100);
        setMessage("Upload complete. Mux is processing the video. Select Check video status in a moment.");
        setBusy(false);
      });
    } catch (cause) {
      setMessage((cause as Error).message);
      setBusy(false);
    }
  }

  async function sync() {
    setBusy(true);
    setMessage("Checking video and caption status…");
    try {
      const response = await fetch("/nsc/api/admin/classes/sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      const data = await response.json() as { error?: string; status?: string; captions?: { status?: string }[]; transcriptImported?: boolean };
      if (!response.ok) throw new Error(data.error || "Status check failed.");
      setMessage(data.status === "ready"
        ? `Video ready. Captions: ${data.captions?.map((c) => c.status).join(", ") || "generating"}. ${data.transcriptImported ? "A generated transcript is available; refresh to review it. " : ""}Review captions in Mux, then publish below.`
        : `Video status: ${data.status}. Check again in a moment.`);
    } catch (cause) { setMessage((cause as Error).message); }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-ink" htmlFor="class-mp4">Upload or replace MP4</label>
      <input id="class-mp4" type="file" accept="video/mp4,.mp4" disabled={busy}
        onChange={(event) => { const file = event.target.files?.[0]; if (file) void start(file); }} />
      {progress !== null && <progress value={progress} max={100} aria-label="Upload progress" className="w-full" />}
      <button type="button" disabled={busy} onClick={() => void sync()}
        className="self-start rounded-full border border-teal px-4 py-2 text-sm font-semibold text-teal disabled:opacity-50">
        Check video status
      </button>
      {message && <p role="status" className="text-sm text-teal-soft">{message}</p>}
    </div>
  );
}
