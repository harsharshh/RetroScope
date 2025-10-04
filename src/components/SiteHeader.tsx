"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

interface SiteHeaderProps {
  user?: { id: string; name?: string | null; email: string };
  joinedBoards?: Array<{ id: string; title: string }>;
  onSelectBoard?: (boardId: string) => void;
  boardContext?: { id: string; title: string };
  stageFilters?: Array<{ id: string; name: string }>;
  activeStageFilter?: string | "ALL";
  onStageFilterChange?: (value: string | "ALL") => void;
  onExport?: (format: "pdf" | "excel") => void;
  activeParticipants?: Array<{
    id: string;
    user: { id: string; name?: string | null; email: string };
  }>;
}

export default function SiteHeader({
  user,
  joinedBoards = [],
  onSelectBoard,
  boardContext,
  stageFilters = [],
  activeStageFilter = "ALL",
  onStageFilterChange,
  onExport,
  activeParticipants = [],
}: SiteHeaderProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showBoards, setShowBoards] = useState(false);
  const [copiedBoardId, setCopiedBoardId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportTriggerRef = useRef<HTMLButtonElement>(null);
  const exportPopoverRef = useRef<HTMLDivElement>(null);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const participantsTriggerRef = useRef<HTMLButtonElement>(null);
  const participantsPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPopoverOpen && !isFilterOpen && !isExportOpen && !isParticipantsOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        isPopoverOpen &&
        !triggerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setIsPopoverOpen(false);
      }
      if (
        isFilterOpen &&
        !filterTriggerRef.current?.contains(target) &&
        !filterPopoverRef.current?.contains(target)
      ) {
        setIsFilterOpen(false);
      }
      if (
        isExportOpen &&
        !exportTriggerRef.current?.contains(target) &&
        !exportPopoverRef.current?.contains(target)
      ) {
        setIsExportOpen(false);
      }
      if (
        isParticipantsOpen &&
        !participantsTriggerRef.current?.contains(target) &&
        !participantsPopoverRef.current?.contains(target)
      ) {
        setIsParticipantsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPopoverOpen, isFilterOpen, isExportOpen, isParticipantsOpen]);

  useEffect(() => {
    if (!user) {
      setIsPopoverOpen(false);
      setShowBoards(false);
    }
  }, [user]);

  useEffect(() => {
    if (!stageFilters.length) setIsFilterOpen(false);
  }, [stageFilters]);

  useEffect(() => {
    if (!showBoards) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setShowBoards(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showBoards]);

  useEffect(() => {
    if (!copiedBoardId) return;
    const timeout = window.setTimeout(() => setCopiedBoardId(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [copiedBoardId]);

  const avatarInitial = user ? (user.name?.trim()?.[0] ?? user.email?.[0] ?? "?") : "";
  const displayName = user?.name?.trim() || user?.email || "";
  const activeCount = activeParticipants.length;

  const activeStageLabel = useMemo(() => {
    if (activeStageFilter === "ALL") return "All stages";
    return stageFilters.find((stage) => stage.id === activeStageFilter)?.name ?? "All stages";
  }, [activeStageFilter, stageFilters]);

  const participantPalette = useMemo(() => {
    const colors = [
      "#FF8A65",
      "#4DB6AC",
      "#9575CD",
      "#F06292",
      "#4FC3F7",
      "#81C784",
      "#FFD54F",
      "#BA68C8",
      "#90A4AE",
      "#A1887F",
    ];
    return (seed: string) => {
      const index = Math.abs(
        seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
      ) % colors.length;
      return colors[index];
    };
  }, []);

  async function handleCopy(boardId: string) {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard not supported");
      }
      const url = `${window.location.origin}/retro-boards/${boardId}`;
      await navigator.clipboard.writeText(url);
      setCopiedBoardId(boardId);
    } catch (cause) {
      console.warn("Unable to copy board link", cause);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50  bg-background/90 backdrop-blur">
        <div className="mx-auto grid w-full grid-cols-[auto,1fr,auto] items-center px-6 pb-4 pt-8 sm:px-10">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              aria-label="Go to home"
              className="flex items-center gap-2 text-lg font-semibold text-foreground transition hover:opacity-90"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface shadow-sm backdrop-blur">
                <span className="bg-retroscope-gradient bg-clip-text text-lg font-bold text-transparent">R</span>
              </div>
              <span className="bg-retroscope-gradient bg-clip-text text-2xl font-semibold text-transparent">
                RetroScope
              </span>
            </Link>
            {boardContext ? (
              <span className="inline-flex max-w-[200px] items-center gap-2 truncate rounded-full border border-retroscope-orange/60 bg-retroscope-orange/10 px-3 py-1 text-xs font-semibold text-retroscope-orange sm:max-w-xs">
                {/* <span className="hidden uppercase tracking-wide text-[10px] sm:inline">Board</span> */}
                <span className="truncate">{boardContext.title}</span>
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-center">
            {boardContext && activeCount ? (
              <div className="relative">
                <button
                  type="button"
                  ref={participantsTriggerRef}
                  onClick={() => setIsParticipantsOpen((previous) => !previous)}
                  className="flex items-center gap-2 rounded-full bg-surface/90 px-4 py-2 text-sm font-semibold text-foreground shadow-sm backdrop-blur transition hover:border-retroscope-orange/60 hover:text-retroscope-orange"
                  aria-haspopup="listbox"
                  aria-expanded={isParticipantsOpen}
                >
                             {/* Active participants badge */}
                             <div className="flex items-center justify-between">
                    <div
                      aria-live="polite"
                      className="relative inline-flex items-center gap-2 rounded-full border border-emerald-300/50 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-400/10 dark:text-emerald-300"
                    >
                      <span className="relative inline-flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
                      </span>
                      <span>
                        {activeParticipants.length} active
                      </span>
                      <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-4 w-4 transition ${isParticipantsOpen ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                    </div>
                  </div>
                </button>
                {isParticipantsOpen ? (
                  <div
                    ref={participantsPopoverRef}
                    className="absolute left-1/2 z-40 mt-3 w-72 -translate-x-1/2 rounded-2xl border border-surface-border bg-background p-3 shadow-xl"
                  >
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-sm font-semibold text-foreground">Active participants</span>
                      <span className="text-xs font-medium text-muted-foreground">{activeCount}</span>
                    </div>
                    <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
                      {activeParticipants.map((participant) => {
                        const participantName = participant.user.name?.trim() || participant.user.email;
                        const avatarLetter = participantName[0]?.toUpperCase() ?? "?";
                        const background = participantPalette(participant.user.id);
                        return (
                          <li
                            key={participant.id}
                            className="flex items-center gap-3 rounded-xl border border-surface-border/60 bg-surface/90 px-3 py-2"
                          >
                            <span
                              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                              style={{ backgroundColor: background }}
                              aria-hidden
                            >
                              {avatarLetter}
                            </span>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-foreground">{participantName}</span>
                              <span className="text-xs text-muted-foreground">{participant.user.email}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-end gap-3">
            {onExport && boardContext ? (
              <div className="relative">
                <button
                  type="button"
                  ref={exportTriggerRef}
                  onClick={() => setIsExportOpen((previous) => !previous)}
                  className="flex items-center gap-2 rounded-full border border-surface-border bg-surface/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition hover:border-retroscope-orange/60 hover:text-retroscope-orange"
                  aria-haspopup="menu"
                  aria-expanded={isExportOpen}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export
                </button>
                {isExportOpen ? (
                  <div
                    ref={exportPopoverRef}
                    className="absolute right-0 z-40 mt-2 w-44 rounded-2xl border border-surface-border bg-background p-2 shadow-lg"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportOpen(false);
                        onExport?.("pdf");
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-foreground transition hover:bg-retroscope-orange/10 hover:text-retroscope-orange"
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportOpen(false);
                        onExport?.("excel");
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-foreground transition hover:bg-retroscope-orange/10 hover:text-retroscope-orange"
                    >
                      Excel
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {stageFilters.length ? (
              <div className="relative">
                <button
                  type="button"
                  ref={filterTriggerRef}
                  onClick={() => setIsFilterOpen((previous) => !previous)}
                  className={`flex items-center gap-2 rounded-full border border-surface-border bg-surface/80 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition hover:border-retroscope-orange/60 ${
                    activeStageFilter !== "ALL" ? "text-retroscope-orange" : "text-foreground"
                  }`}
                  aria-haspopup="listbox"
                  aria-expanded={isFilterOpen}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M3 4h18" />
                    <path d="M6 8h12" />
                    <path d="M10 12h4" />
                    <path d="M12 16v4" />
                  </svg>
                  {activeStageLabel}
                </button>
                {isFilterOpen ? (
                  <div
                    ref={filterPopoverRef}
                    className="absolute right-0 z-40 mt-2 w-48 rounded-2xl border border-surface-border bg-background p-2 shadow-lg"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onStageFilterChange?.("ALL");
                        setIsFilterOpen(false);
                      }}
                      className={`w-full rounded-xl px-3 py-2 text-left text-xs font-semibold transition hover:bg-retroscope-orange/10 hover:text-retroscope-orange ${
                        activeStageFilter === "ALL" ? "bg-retroscope-orange/10 text-retroscope-orange" : "text-foreground"
                      }`}
                    >
                      All stages
                    </button>
                    <div className="mt-1 flex max-h-56 flex-col gap-1 overflow-y-auto">
                      {stageFilters.map((stage) => (
                        <button
                          key={stage.id}
                          type="button"
                          onClick={() => {
                            onStageFilterChange?.(stage.id);
                            setIsFilterOpen(false);
                          }}
                          className={`w-full rounded-xl px-3 py-2 text-left text-xs font-semibold transition hover:bg-retroscope-orange/10 hover:text-retroscope-orange ${
                            activeStageFilter === stage.id
                              ? "bg-retroscope-orange/10 text-retroscope-orange"
                              : "text-foreground"
                          }`}
                        >
                          {stage.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {user ? (
              <div className="relative">
                <button
                  type="button"
                  ref={triggerRef}
                  onClick={() => setIsPopoverOpen((previous) => !previous)}
                  className="flex items-center gap-3 rounded-full border border-surface-border bg-surface/90 px-3 py-1.5 text-left shadow-sm backdrop-blur transition hover:border-retroscope-orange/60"
                  aria-haspopup="listbox"
                  aria-expanded={isPopoverOpen}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-retroscope-gradient text-sm font-semibold text-white">
                    {avatarInitial?.toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{displayName}</span>
                    {user?.email ? (
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    ) : null}
                  </div>
                </button>
                {isPopoverOpen ? (
                  <div
                    ref={popoverRef}
                    className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-surface-border bg-surface p-3 shadow-lg"
                  >
                    <div className="flex flex-col gap-1 border-b border-surface-border/70 pb-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Signed in as
                      </span>
                      <span className="text-sm font-medium text-foreground">{displayName}</span>
                      {user.email ? (
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        className="w-full rounded-full bg-retroscope-gradient px-3 py-2 text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
                        onClick={() => {
                          setShowBoards(true);
                          setIsPopoverOpen(false);
                        }}
                      >
                        See my boards
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
      </header>
      {showBoards ? (
        <BoardsDialog
          boards={joinedBoards}
          copiedBoardId={copiedBoardId}
          onCopy={handleCopy}
          onSelectBoard={onSelectBoard}
          onClose={() => setShowBoards(false)}
        />
      ) : null}
    </>
  );
}

function BoardsDialog({
  boards,
  onClose,
  onSelectBoard,
  copiedBoardId,
  onCopy,
}: {
  boards: Array<{ id: string; title: string }>;
  onClose: () => void;
  onSelectBoard?: (boardId: string) => void;
  copiedBoardId: string | null;
  onCopy: (boardId: string) => void | Promise<void>;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-surface-border bg-background p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">My boards</h2>
          <button
            type="button"
            className="rounded-full border border-surface-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-retroscope-orange/60 hover:text-retroscope-orange"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="mt-4 flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
          {boards.length ? (
            boards.map((board) => (
              <div
                key={board.id}
                className="rounded-2xl border border-surface-border/70 bg-surface/90 p-4"
              >
                <h3 className="text-sm font-semibold text-foreground">{board.title}</h3>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-full border border-surface-border px-3 py-2 text-xs font-semibold text-foreground transition hover:border-retroscope-orange/60 hover:text-retroscope-orange"
                    onClick={() => {
                      onSelectBoard?.(board.id);
                      onClose();
                    }}
                  >
                    Open board
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-full border border-surface-border px-3 py-2 text-xs font-semibold text-foreground transition hover:border-retroscope-orange/60 hover:text-retroscope-orange"
                    onClick={() => onCopy(board.id)}
                  >
                    {copiedBoardId === board.id ? "Copied" : "Copy link"}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <span className="rounded-2xl border border-surface-border/60 bg-surface/80 px-4 py-6 text-sm text-muted-foreground">
              You have not joined any boards yet.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
