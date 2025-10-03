"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import SiteHeader from "@/components/SiteHeader";
import { useRouter } from "next/navigation";
import { LocalUser, LOCAL_USER_STORAGE_KEY } from "@/lib/user-storage";

type RetroBoardResponse = {
  id: string;
  title: string;
  participants: Array<{ user: { id: string } }>;
};

export default function Home() {
  const heroRef = useRef(null);
  const cardRef = useRef(null);
  const router = useRouter();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [joinedBoards, setJoinedBoards] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-badge", {
        y: -20,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      });
      gsap.from(".hero-title", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        delay: 0.2,
      });
      gsap.from(".hero-subtitle", {
        y: 20,
        opacity: 0,
        duration: 0.7,
        ease: "power2.out",
        delay: 0.4,
      });
      gsap.from(".hero-cta", {
        opacity: 0,
        y: 10,
        duration: 0.6,
        stagger: 0.15,
        ease: "power2.out",
        delay: 0.6,
      });
      gsap.from(cardRef.current, {
        opacity: 0,
        x: 40,
        duration: 0.8,
        ease: "power3.out",
        delay: 1.0,
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_USER_STORAGE_KEY);
      if (stored) {
        const parsed: LocalUser = JSON.parse(stored);
        setUser(parsed);
      }
    } catch (cause) {
      console.warn("Unable to read stored user", cause);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setJoinedBoards([]);
      return;
    }
    let cancelled = false;

    async function fetchJoinedBoards() {
      try {
        const response = await fetch("/api/retro-boards");
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Unable to fetch boards");
        }
        if (cancelled) return;
        const payload: RetroBoardResponse[] = await response.json();
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

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[10%] top-[15%] h-64 w-64 rounded-full bg-retroscope-purple/20 blur-[120px] dark:bg-retroscope-purple/25" />
        <div className="absolute bottom-[10%] right-[12%] h-72 w-72 rounded-full bg-retroscope-teal/20 blur-[140px] dark:bg-retroscope-teal/25" />
      </div>

      <SiteHeader
        user={user ?? undefined}
        joinedBoards={joinedBoards}
        onSelectBoard={(nextBoardId) => router.push(`/retro-boards/${nextBoardId}`)}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 pb-16 pt-6 sm:px-10">
        <div ref={heroRef} className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            <span className="hero-badge inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground shadow-sm backdrop-blur">
              Sprint retros made simple
            </span>
            <h1 className="hero-title text-balance text-4xl font-semibold leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
              Illuminate your {" "}
              <span className="bg-retroscope-gradient bg-clip-text text-transparent">retro meetings</span>{" "}
              and celebrate the wins that fuel your next sprint.
            </h1>
            <p className="hero-subtitle max-w-xl text-lg text-muted-foreground sm:text-xl">
              RetroScope helps agile teams transform raw feedback into insight-rich actions.
              Capture the highs, surface the blockers, and align on what comes next—with a
              workflow your whole squad will love.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <a
                href="/create-board"
                className="hero-cta inline-flex items-center justify-center rounded-full bg-retroscope-gradient px-6 py-3 text-base font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-retroscope-orange"
              >
                Get started for free
              </a>
              {/* <button
                type="button"
                className="hero-cta inline-flex items-center justify-center rounded-full border border-surface-border bg-surface px-6 py-3 text-base font-semibold text-foreground transition hover:border-retroscope-orange/50 hover:text-retroscope-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-retroscope-orange"
              >
                See how it works
              </button> */}
            </div>
            {/* <dl className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-2xl border border-surface-border bg-surface px-4 py-3 shadow-sm backdrop-blur">
                <dt className="text-xs uppercase tracking-[0.2em]">Teams onboarded</dt>
                <dd className="mt-1 text-2xl font-semibold text-foreground">1,200+</dd>
              </div>
              <div className="rounded-2xl border border-surface-border bg-surface px-4 py-3 shadow-sm backdrop-blur">
                <dt className="text-xs uppercase tracking-[0.2em]">Feedback captured</dt>
                <dd className="mt-1 text-2xl font-semibold text-foreground">48k notes</dd>
              </div>
              <div className="rounded-2xl border border-surface-border bg-surface px-4 py-3 shadow-sm backdrop-blur">
                <dt className="text-xs uppercase tracking-[0.2em]">Sprint confidence</dt>
                <dd className="mt-1 text-2xl font-semibold text-foreground">↑ 37%</dd>
              </div>
            </dl> */}
          </div>

          <section ref={cardRef} className="relative">
            <div className="absolute -left-6 top-8 h-16 w-16 rounded-full border border-retroscope-teal/30 bg-retroscope-teal/15 blur-2xl dark:border-retroscope-teal/20" />
            <div className="absolute -right-8 bottom-4 h-20 w-20 rounded-full border border-retroscope-purple/30 bg-retroscope-purple/15 blur-3xl dark:border-retroscope-purple/20" />
            <div className="relative overflow-hidden rounded-3xl border border-surface-border bg-surface p-8 shadow-glow backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                Upcoming Retro
              </p>
              <h2 className="mt-4 text-2xl font-semibold text-foreground">Sprint 18: Deliver Delight</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Align your squad around data-backed insights. RetroScope keeps the conversation
                focused on outcomes and next steps.
              </p>

              <div className="mt-6 space-y-4">
                {["Celebrate wins", "Tackle blockers", "Shape next sprint"].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-surface-border bg-white/60 px-4 py-3 text-sm font-medium text-foreground shadow-sm backdrop-blur dark:bg-white/5"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-retroscope-gradient text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-between rounded-2xl border border-surface-border bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:bg-white/10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Next session
                  </p>
                  <p className="text-sm font-semibold text-foreground">Wednesday • 12:30 PM</p>
                </div>
                {/* <span className="inline-flex items-center rounded-full bg-retroscope-gradient px-3 py-1 text-xs font-semibold text-white">
                  Reminders on
                </span> */}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
