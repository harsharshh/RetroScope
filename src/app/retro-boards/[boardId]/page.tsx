"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { LocalUser, LOCAL_USER_STORAGE_KEY } from "@/lib/user-storage";

interface RetroBoardPayload {
  id: string;
  title: string;
  summary?: string | null;
  status: string;
  scheduledFor?: string | null;
  stages: Array<{ id: string; name: string; order: number }>;
  participants: Array<{ id: string; role?: string | null; user: { id: string; name?: string | null; email: string } }>;
}

export default function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const router = useRouter();
  const [boardId, setBoardId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function readParams() {
      try {
        const resolved = await params;
        if (!cancelled) setBoardId(resolved.boardId);
      } catch (cause) {
        console.warn("Unable to resolve route params", cause);
      }
    }
    readParams();
    return () => {
      cancelled = true;
    };
  }, [params]);

  const [board, setBoard] = useState<RetroBoardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<LocalUser | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [joinedBoards, setJoinedBoards] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_USER_STORAGE_KEY);
      if (stored) {
        const value: LocalUser = JSON.parse(stored);
        setUser(value);
        setProfileName(value.name ?? "");
        setProfileEmail(value.email);
      } else {
        setShowProfileModal(true);
      }
    } catch (cause) {
      console.warn("Unable to read stored user", cause);
      setShowProfileModal(true);
    }
  }, []);

  useEffect(() => {
    if (!boardId) return;
    let cancelled = false;
    async function fetchBoard() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/retro-boards/${boardId}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Unable to load board");
        }
        if (cancelled) return;
        const payload: RetroBoardPayload = await response.json();
        setBoard(payload);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchBoard();
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  useEffect(() => {
    if (!board || !user || !boardId) return;
    const participantIds = board.participants.map((participant) => participant.user.id);
    if (participantIds.includes(user.id)) return;

    async function ensureParticipant() {
      try {
        await fetch(`/api/retro-boards/${boardId}/participants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, role: "MEMBER" }),
        });
        const response = await fetch(`/api/retro-boards/${boardId}`);
        if (response.ok) {
          const payload: RetroBoardPayload = await response.json();
          setBoard(payload);
        }
      } catch (cause) {
        console.warn("Unable to attach participant", cause);
      }
    }

    ensureParticipant();
  }, [board, user, boardId]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchJoinedBoards() {
      try {
        const response = await fetch("/api/retro-boards");
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Unable to fetch boards");
        }
        if (cancelled) return;
        const payload: RetroBoardPayload[] = await response.json();
        const nextBoards = payload
          .filter((item) => item.participants.some((participant) => participant.user.id === user.id))
          .map((item) => ({ id: item.id, title: item.title }));
        setJoinedBoards(nextBoards);
      } catch (cause) {
        if (!cancelled) {
          console.warn("Unable to fetch joined boards", cause);
        }
      }
    }

    fetchJoinedBoards();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const sortedStages = useMemo(() => {
    return board?.stages.slice().sort((a, b) => a.order - b.order) ?? [];
  }, [board]);

  const stageCount = sortedStages.length;
  const stageGridClass = useMemo(() => {
    if (stageCount <= 1) {
      return "grid-cols-1";
    }
    if (stageCount === 2) {
      return "grid-cols-1 md:grid-cols-2";
    }
    if (stageCount === 3) {
      return "grid-cols-1 md:grid-cols-3";
    }
    return "grid-cols-1 md:grid-cols-3";
  }, [stageCount]);

  const stageGridRowClass = stageCount > 3 ? "md:grid-rows-2 md:auto-rows-fr" : "";
  const stageCardClass = `${
    stageCount <= 1 ? "min-h-[60vh]" : "min-h-[260px]"
  } flex h-full flex-col rounded-2xl border border-surface-border bg-surface/80 p-6 shadow-sm backdrop-blur`;

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    if (!profileEmail.trim()) {
      setProfileError("Email is required");
      return;
    }
    setProfileSubmitting(true);

    try {
      const userResponse = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profileEmail.trim(),
          name: profileName.trim() || undefined,
        }),
      });

      if (!userResponse.ok) {
        const payload = await userResponse.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to save user profile");
      }

      const nextUser: LocalUser = await userResponse.json();
      localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      setShowProfileModal(false);

      await fetch(`/api/retro-boards/${boardId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: nextUser.id, role: "OWNER" }),
      });

      const refreshed = await fetch(`/api/retro-boards/${boardId}`);
      if (refreshed.ok) {
        const payload: RetroBoardPayload = await refreshed.json();
        setBoard(payload);
      }
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : "Unknown error");
    } finally {
      setProfileSubmitting(false);
    }
  }

  const isReady = board && user && boardId;

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <SiteHeader
        user={user ?? undefined}
        joinedBoards={joinedBoards}
        onSelectBoard={(nextBoardId) => router.push(`/retro-boards/${nextBoardId}`)}
        boardContext={board ? { id: board.id, title: board.title } : undefined}
      />

      <main className="mx-auto flex w-full  flex-1 flex-col gap-6 px-6 pb-16 pt-6 sm:px-10">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Loading board…
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-lg font-semibold text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-full border border-surface-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-retroscope-orange/60 hover:text-retroscope-orange"
            >
              Go back home
            </button>
          </div>
        ) : board ? (
          <div className="flex flex-1 flex-col gap-8">
            

            <section className={`grid flex-1 gap-6 ${stageGridClass} ${stageGridRowClass}`}>
              {sortedStages.map((stage) => (
                <div
                  key={stage.id}
                  className={stageCardClass}
                >
                  <header className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">{stage.name}</h2>
                  </header>
                  <p className="text-sm text-muted-foreground">
                    Cards and feedback will appear here once your team starts the retro.
                  </p>
                </div>
              ))}
            </section>
          </div>
        ) : null}
      </main>

      {showProfileModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <form
            onSubmit={handleProfileSubmit}
            className="w-full max-w-lg space-y-6 rounded-3xl border border-surface-border bg-background px-8 py-10 shadow-xl"
          >
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-foreground">Welcome to RetroScope</h2>
              <p className="text-sm text-muted-foreground">
                Tell us who you are so we can add you to this board and future sessions.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="participant-name">
                Your name
              </label>
              <input
                id="participant-name"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                className="w-full rounded-xl border border-surface-border bg-white/80 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-retroscope-orange focus:ring-2 focus:ring-retroscope-orange/30 dark:bg-white/10"
                placeholder="Jane Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="participant-email">
                Your email
              </label>
              <input
                id="participant-email"
                type="email"
                value={profileEmail}
                onChange={(event) => setProfileEmail(event.target.value)}
                className="w-full rounded-xl border border-surface-border bg-white/80 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-retroscope-orange focus:ring-2 focus:ring-retroscope-orange/30 dark:bg-white/10"
                placeholder="you@team.com"
                required
              />
            </div>

            {profileError ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {profileError}
              </div>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-full bg-retroscope-gradient px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-retroscope-orange disabled:cursor-not-allowed disabled:opacity-70"
              disabled={profileSubmitting}
            >
              {profileSubmitting ? "Saving…" : "Join board"}
            </button>
          </form>
        </div>
      )}

      {!isReady && !loading && !showProfileModal && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 text-white">
          Preparing your board…
        </div>
      )}
    </div>
  );
}
