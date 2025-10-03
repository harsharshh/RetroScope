"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";

interface StageForm {
  name: string;
}

interface CreateBoardResponse {
  id: string;
  title: string;
}

export default function CreateBoardPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [stageCount, setStageCount] = useState(3);
  const [stages, setStages] = useState<StageForm[]>([
    { name: "Going well" },
    { name: "Could be better" },
    { name: "Action items" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBoard, setCreatedBoard] = useState<CreateBoardResponse | null>(null);

  useEffect(() => {
    setStages((prev) => {
      if (stageCount === prev.length) return prev;
      if (stageCount > prev.length) {
        const additions = Array.from({ length: stageCount - prev.length }, (_, idx) => ({
          name: `Stage ${prev.length + idx + 1}`,
        }));
        return [...prev, ...additions];
      }
      return prev.slice(0, stageCount);
    });
  }, [stageCount]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreatedBoard(null);

    if (!title.trim()) {
      setError("Board name is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const stagePayload = stages.map((stage, index) => ({
        name: stage.name.trim() || `Stage ${index + 1}`,
        order: index,
      }));

      const boardResponse = await fetch("/api/retro-boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          stages: stagePayload,
        }),
      });

      if (!boardResponse.ok) {
        const payload = await boardResponse.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to create board.");
      }

      const board: CreateBoardResponse = await boardResponse.json();
      setCreatedBoard(board);
      setTitle("");
      setStageCount(stages.length);
      setStages((prev) => prev.map((stage, idx) => ({ name: `Stage ${idx + 1}` })));

      router.push(`/retro-boards/${board.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unknown error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-8 top-16 h-48 w-48 rounded-full bg-retroscope-teal/20 blur-[120px] dark:bg-retroscope-teal/30" />
        <div className="absolute bottom-12 right-10 h-56 w-56 rounded-full bg-retroscope-purple/20 blur-[140px] dark:bg-retroscope-purple/25" />
      </div>

      <SiteHeader />

      <div className="mx-auto flex w-full max-w-3xl flex-1 min-h-0 flex-col gap-6 px-6 pb-12 pt-6 sm:px-10">
        <div className="space-y-3 text-center">
         {/*  <h1 className="text-4xl font-semibold text-foreground">Create a new retro board</h1> */}
          
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 min-h-[520px] max-h-[80vh] flex-col overflow-hidden rounded-3xl border border-surface-border bg-surface/80 shadow-glow backdrop-blur"
        >
          <div className="flex-1 min-h-0 space-y-8 overflow-y-auto px-8 py-8">
            <section className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="board-title">
                  Board name
                </label>
                <input
                  id="board-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Sprint 18 Retrospective"
                  className="w-full rounded-xl border border-surface-border bg-white/80 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-retroscope-orange focus:ring-2 focus:ring-retroscope-orange/30 dark:bg-white/10"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="stage-count">
                  Number of columns
                </label>
                <input
                  id="stage-count"
                  type="number"
                  min={1}
                  max={6}
                  value={stageCount}
                  onChange={(event) =>
                    setStageCount(Math.max(1, Math.min(6, Number(event.target.value) || 0)))
                  }
                  className="w-full rounded-xl border border-surface-border bg-white/80 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-retroscope-orange focus:ring-2 focus:ring-retroscope-orange/30 dark:bg-white/10"
                />
                <p className="text-xs text-muted-foreground">You can add between 1 and 6 columns.</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Column names
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {stages.map((stage, index) => (
                  <div key={`stage-${index}`} className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor={`stage-${index}`}>
                      Column {index + 1}
                    </label>
                    <input
                      id={`stage-${index}`}
                      value={stage.name}
                      onChange={(event) => {
                        const value = event.target.value;
                        setStages((prev) =>
                          prev.map((item, idx) => (idx === index ? { ...item, name: value } : item))
                        );
                      }}
                      className="w-full rounded-xl border border-surface-border bg-white/80 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-retroscope-orange focus:ring-2 focus:ring-retroscope-orange/30 dark:bg-white/10"
                    />
                </div>
              ))}
            </div>
          </section>

          {error ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          ) : null}

          {createdBoard ? (
            <div className="rounded-xl border border-retroscope-teal/30 bg-retroscope-teal/10 px-4 py-3 text-sm text-retroscope-teal">
              Board “{createdBoard.title}” created! Note the ID {createdBoard.id}. You can explore it via
              the REST endpoint at <code className="font-mono">/api/retro-boards/{createdBoard.id}</code>.
            </div>
          ) : null}

          </div>

          <div className="flex items-center justify-end gap-4 border-t border-surface-border bg-background/70 px-8 py-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-full border border-surface-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-retroscope-orange/60 hover:text-retroscope-orange"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-retroscope-gradient px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-retroscope-orange disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating…" : "Create board"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
