"use client";

import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import gsap from "gsap";
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

interface RetroCardPayload {
  id: string;
  content: string;
  stageId: string;
  authorId?: string | null;
  author?: { id: string; name?: string | null; email: string } | null;
  createdAt?: string;
  reactions?: Array<{ id: string; userId: string; type: string }>;
}

const UPVOTE_TYPE = "UPVOTE";

function getUpvoteCount(card: RetroCardPayload): number {
  return (card.reactions ?? []).reduce(
    (sum, reaction) => (reaction.type === UPVOTE_TYPE ? sum + 1 : sum),
    0
  );
}

interface DraftCardState {
  id: string;
  content: string;
  saving: boolean;
  error: string | null;
}

type StageColorPreset = {
  containerBorder: string;
  containerBackground: string;
  containerBorderDark: string;
  containerBackgroundDark: string;
  accentBackground: string;
  accentBackgroundDark: string;
  cardBorder: string;
  cardBackground: string;
  cardBorderDark: string;
  cardBackgroundDark: string;
  draftBorder: string;
  draftBackground: string;
  draftBorderDark: string;
  draftBackgroundDark: string;
  textColor: string;
  textColorDark: string;
  inputBorder: string;
  inputBorderDark: string;
  inputBackground: string;
  inputBackgroundDark: string;
  placeholderColor: string;
  placeholderColorDark: string;
  stripColor: string;
  stripColorDark: string;
};

function generateStageColorPreset(index: number): StageColorPreset {
  const goldenRatioConjugate = 0.61803398875;
  const hue = (index * goldenRatioConjugate * 360) % 360;
  const hueRounded = Math.round(hue);
  const accent = `hsl(${hueRounded} 87% 55%)`;
  const accentDark = `hsl(${hueRounded} 90% 62%)`;
  const border = `hsl(${hueRounded} 85% 65% / 0.55)`;
  const borderDark = `hsl(${hueRounded} 75% 62% / 0.8)`;
  const bg = `hsl(${hueRounded} 88% 94% / 0.55)`;
  const bgDark = `hsl(${hueRounded} 65% 24% / 0.3)`;
  const cardBorder = `hsl(${hueRounded} 85% 75% / 0.7)`;
  const cardBorderDark = `hsl(${hueRounded} 75% 58% / 0.7)`;
  const cardBackground = `hsl(${hueRounded} 90% 98% / 0.8)`;
  const cardBackgroundDark = `hsl(${hueRounded} 65% 18% / 0.85)`;
  const draftBorder = `hsl(${hueRounded} 87% 55% / 0.6)`;
  const draftBorderDark = `hsl(${hueRounded} 88% 70% / 0.75)`;
  const draftBackground = `hsl(${hueRounded} 88% 70% / 0.15)`;
  const draftBackgroundDark = `hsl(${hueRounded} 65% 26% / 0.75)`;
  const textColor = `hsl(${hueRounded} 35% 25%)`;
  const textColorDark = `hsl(${hueRounded} 30% 92%)`;
  const inputBorder = `hsl(${hueRounded} 60% 78% / 0.9)`;
  const inputBorderDark = `hsl(${hueRounded} 72% 70% / 0.85)`;
  const inputBackground = `hsl(${hueRounded} 80% 96% / 0.9)`;
  const inputBackgroundDark = `hsl(${hueRounded} 45% 20% / 0.95)`;
  const placeholder = `hsl(${hueRounded} 25% 60% / 0.65)`;
  const placeholderDark = `hsl(${hueRounded} 25% 88% / 0.45)`;
  const stripColor = `hsl(${hueRounded} 92% 85% / 0.5)`;
  const stripColorDark = `hsl(${hueRounded} 88% 70% / 0.6)`;

  return {
    containerBorder: border,
    containerBackground: bg,
    containerBorderDark: borderDark,
    containerBackgroundDark: bgDark,
    accentBackground: accent,
    accentBackgroundDark: accentDark,
    cardBorder,
    cardBackground,
    cardBorderDark,
    cardBackgroundDark,
    draftBorder,
    draftBackground,
    draftBorderDark,
    draftBackgroundDark,
    textColor,
    textColorDark,
    inputBorder,
    inputBorderDark,
    inputBackground,
    inputBackgroundDark,
    placeholderColor: placeholder,
    placeholderColorDark: placeholderDark,
    stripColor,
    stripColorDark,
  };
}

export default function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const router = useRouter();
  const [boardId, setBoardId] = useState<string | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

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
  const [cards, setCards] = useState<RetroCardPayload[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [draftCards, setDraftCards] = useState<Record<string, DraftCardState[]>>({});
  const [editingCards, setEditingCards] = useState<Record<
    string,
    { content: string; saving: boolean; error: string | null }
  >>({});
  const [activeStageFilter, setActiveStageFilter] = useState<string | "ALL">("ALL");

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
    if (!boardId) return;
    let cancelled = false;

    async function fetchCards() {
      setCardsLoading(true);
      setCardsError(null);
      try {
        const response = await fetch(`/api/retro-boards/${boardId}/cards`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Unable to load cards");
        }
        if (cancelled) return;
        const payload: RetroCardPayload[] = await response.json();
        setCards(payload);
      } catch (cause) {
        if (cancelled) return;
        setCardsError(cause instanceof Error ? cause.message : "Unable to load cards");
      } finally {
        if (!cancelled) setCardsLoading(false);
      }
    }

    fetchCards();
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  useEffect(() => {
    if (!board || !user || !boardId) return;
    const participantIds = board.participants.map((participant) => participant.user.id);
    if (user && participantIds.includes(user.id)) return;

    async function ensureParticipant() {
      try {
        if (user) {
          await fetch(`/api/retro-boards/${boardId}/participants`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, role: "MEMBER" }),
          });
        }
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
          .filter((item) => user && item.participants.some((participant) => participant.user.id === user.id))
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

  useEffect(() => {
    setActiveStageFilter("ALL");
  }, [board?.id]);

  const visibleStages = useMemo(() => {
    if (activeStageFilter === "ALL") return sortedStages;
    return sortedStages.filter((stage) => stage.id === activeStageFilter);
  }, [activeStageFilter, sortedStages]);

  const stageCount = visibleStages.length || sortedStages.length;
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
  const stageBaseCardClass = `${
    stageCount <= 1 ? "min-h-[60vh]" : "min-h-[260px]"
  } flex h-full flex-col rounded-2xl p-6 shadow-sm backdrop-blur`;

  const cardsContainerClass = useMemo(() => {
    if (stageCount === 1) {
      return "grid auto-rows-min gap-5 sm:grid-cols-2 xl:grid-cols-3";
    }
    if (stageCount === 2) {
      return "grid auto-rows-min gap-5 sm:grid-cols-2";
    }
    
    return "flex flex-col gap-5";
  }, [stageCount]);

  const stageColors = useMemo(() => {
    return sortedStages.reduce<Record<string, StageColorPreset>>((accumulator, stage, index) => {
      accumulator[stage.id] = generateStageColorPreset(index);
      return accumulator;
    }, {});
  }, [sortedStages]);

  const stageFilterOptions = useMemo(() => {
    return sortedStages.map((stage) => ({ id: stage.id, name: stage.name }));
  }, [sortedStages]);

  useEffect(() => {
    if (!loading) return;
    const target = loadingRef.current;
    if (!target) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        target.querySelectorAll("span"),
        { opacity: 0.2, y: 6 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.inOut",
          stagger: 0.15,
          repeat: -1,
          yoyo: true,
        }
      );
    }, loadingRef);

    return () => ctx.revert();
  }, [loading]);

  useEffect(() => {
    const placeholderStyleId = "retro-stage-input-placeholder";
    if (!document.getElementById(placeholderStyleId)) {
      const styleElement = document.createElement("style");
      styleElement.id = placeholderStyleId;
      styleElement.textContent =
        "textarea[data-stage-theme='input']::placeholder { color: var(--placeholder-color, inherit); transition: color 0.2s ease; }";
      document.head.appendChild(styleElement);
    }

    function applyStageThemeStyles() {
      const isDark = document.documentElement.classList.contains("dark");

      const containers = document.querySelectorAll<HTMLElement>("[data-stage-theme='container']");
      containers.forEach((element) => {
        const border = isDark ? element.dataset.darkBorder : element.dataset.lightBorder;
        const background = isDark ? element.dataset.darkBg : element.dataset.lightBg;
        const text = isDark ? element.dataset.darkText : element.dataset.lightText;
        if (border) element.style.setProperty("border-color", border);
        if (background) element.style.setProperty("background-color", background);
        if (text) element.style.setProperty("color", text);
      });

      const accents = document.querySelectorAll<HTMLElement>("[data-stage-theme='accent']");
      accents.forEach((element) => {
        const background = isDark ? element.dataset.darkBg : element.dataset.lightBg;
        if (background) element.style.setProperty("background-color", background);
      });

      const cards = document.querySelectorAll<HTMLElement>("[data-stage-theme='card']");
      cards.forEach((element) => {
        const border = isDark ? element.dataset.darkBorder : element.dataset.lightBorder;
        const background = isDark ? element.dataset.darkBg : element.dataset.lightBg;
        const text = isDark ? element.dataset.darkText : element.dataset.lightText;
        const strip = isDark ? element.dataset.darkStrip : element.dataset.lightStrip;
        if (border) element.style.setProperty("border-color", border);
        if (background) element.style.setProperty("background-color", background);
        if (text) element.style.setProperty("color", text);
        if (strip) element.style.setProperty("--note-strip", strip);
      });

      const drafts = document.querySelectorAll<HTMLElement>("[data-stage-theme='draft']");
      drafts.forEach((element) => {
        const border = isDark ? element.dataset.darkBorder : element.dataset.lightBorder;
        const background = isDark ? element.dataset.darkBg : element.dataset.lightBg;
        const text = isDark ? element.dataset.darkText : element.dataset.lightText;
        const strip = isDark ? element.dataset.darkStrip : element.dataset.lightStrip;
        if (border) element.style.setProperty("border-color", border);
        if (background) element.style.setProperty("background-color", background);
        if (text) element.style.setProperty("color", text);
        if (strip) element.style.setProperty("--note-strip", strip);
      });

      const inputs = document.querySelectorAll<HTMLTextAreaElement>("textarea[data-stage-theme='input']");
      inputs.forEach((input) => {
        const border = isDark ? input.dataset.darkBorder : input.dataset.lightBorder;
        const background = isDark ? input.dataset.darkBg : input.dataset.lightBg;
        const text = isDark ? input.dataset.darkText : input.dataset.lightText;
        const placeholder = isDark ? input.dataset.placeholderDark : input.dataset.placeholder;
        if (border) input.style.setProperty("border-color", border);
        if (background) input.style.setProperty("background-color", background);
        if (text) {
          input.style.setProperty("color", text);
          input.style.setProperty("caret-color", text);
        }
        if (placeholder) {
          input.style.setProperty("--placeholder-color", placeholder);
        }
      });
    }

    applyStageThemeStyles();

    const observer = new MutationObserver(applyStageThemeStyles);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [stageColors, stageCount, cards, draftCards, editingCards]);

  const cardsByStage = useMemo(() => {
    const grouped = cards.reduce<Record<string, RetroCardPayload[]>>((acc, card) => {
      (acc[card.stageId] ??= []).push(card);
      return acc;
    }, {});

    for (const stageId in grouped) {
      grouped[stageId].sort((a, b) => {
        const votesB = getUpvoteCount(b);
        const votesA = getUpvoteCount(a);
        if (votesB !== votesA) return votesB - votesA; // more votes first
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        return timeB - timeA; // newest first
      });
    }
    return grouped;
  }, [cards]);

  function handleStageFilterChange(next: string | "ALL") {
    setActiveStageFilter(next);
  }

  function escapePdfText(text: string) {
    return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  function buildPdfBlob() {
    if (!board) return null;
    const lines: string[] = [];
    const timestamp = new Date().toLocaleString();
    lines.push(`Retro report: ${board.title}`);
    lines.push(`Generated: ${timestamp}`);
    lines.push("");

    const stageColumnWidth = 18;
    const cardColumnWidth = 50;
    const votesColumnWidth = 12;

    const separator = `+${"-".repeat(stageColumnWidth + 2)}+${"-".repeat(cardColumnWidth + 2)}+${"-".repeat(
      votesColumnWidth + 2
    )}+`;

    function padCell(value: string, width: number, alignRight = false) {
      if (value.length > width) {
        if (width <= 3) {
          value = value.slice(0, width);
        } else {
          value = `${value.slice(0, width - 3)}...`;
        }
      }
      return alignRight ? value.padStart(width, " ") : value.padEnd(width, " ");
    }

    function formatRow(stageCell: string, cardCell: string, votesCell: string) {
      return `| ${padCell(stageCell, stageColumnWidth)} | ${padCell(cardCell, cardColumnWidth)} | ${padCell(
        votesCell,
        votesColumnWidth
      )} |`;
    }

    function wrapCell(value: string, width: number) {
      const output: string[] = [];
      const paragraphs = value.split(/\r?\n/);

      const flushCurrent = (current: string) => {
        if (current) {
          output.push(current);
        }
      };

      paragraphs.forEach((paragraph, paragraphIndex) => {
        const trimmed = paragraph.trim();
        if (!trimmed) {
          if (paragraphIndex === paragraphs.length - 1) {
            output.push("");
          } else if (output.length === 0 || output[output.length - 1] !== "") {
            output.push("");
          }
          return;
        }

        const words = trimmed.split(/\s+/);
        let current = "";

        const splitLongWord = (word: string) => {
          const segments: string[] = [];
          for (let index = 0; index < word.length; index += width) {
            segments.push(word.slice(index, index + width));
          }
          if (!segments.length) return "";
          if (segments.length === 1) return segments[0];
          segments.slice(0, -1).forEach((segment) => output.push(segment));
          return segments[segments.length - 1];
        };

        words.forEach((word) => {
          if (word.length > width) {
            flushCurrent(current);
            const tail = splitLongWord(word);
            if (tail.length === width) {
              output.push(tail);
              current = "";
            } else {
              current = tail;
            }
            return;
          }
          const candidate = current ? `${current} ${word}` : word;
          if (candidate.length > width) {
            flushCurrent(current);
            current = word;
          } else {
            current = candidate;
          }
        });

        flushCurrent(current);
      });

      return output.length ? output : [""];
    }

    lines.push(separator);
    lines.push(formatRow("Stage", "Card", "Votes"));
    lines.push(separator);

    sortedStages.forEach((stage) => {
      const stageCards = cardsByStage[stage.id] ?? [];
      if (!stageCards.length) {
        const stageLines = wrapCell(stage.name, stageColumnWidth);
        stageLines.forEach((segment, index) => {
          const votesLabel = index === 0 ? "0 votes" : "";
          lines.push(formatRow(segment, index === 0 ? "(no cards yet)" : "", votesLabel));
        });
        lines.push(separator);
        return;
      }

      stageCards.forEach((card, cardIndex) => {
        const cardLines = wrapCell(card.content, cardColumnWidth);
        const stageLines = cardIndex === 0 ? wrapCell(stage.name, stageColumnWidth) : [""];
        const voteValue = getUpvoteCount(card);
        const voteLabel = `${voteValue} vote${voteValue === 1 ? "" : "s"}`;
        const rowCount = Math.max(cardLines.length, stageLines.length);

        for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
          const stageSegment = rowIndex < stageLines.length ? stageLines[rowIndex] : "";
          const cardSegment = rowIndex < cardLines.length ? cardLines[rowIndex] : "";
          const votesSegment = rowIndex === 0 ? voteLabel : "";
          lines.push(formatRow(stageSegment, cardSegment, votesSegment));
        }
      });

      lines.push(separator);
    });

    const startY = 760;
    let stream = `BT\n/F1 12 Tf\n1 0 0 1 72 ${startY} Tm\n`;
    lines.forEach((line) => {
      if (!line) {
        stream += "0 -18 Td\n";
      } else {
        stream += `(${escapePdfText(line)}) Tj\n0 -18 Td\n`;
      }
    });
    stream += "ET\n";

    const encoder = new TextEncoder();
    const contentBytes = encoder.encode(stream);
    const objects: string[] = [];
    const offsets: number[] = [0];
    let total = 0;

    function append(part: string) {
      objects.push(part);
      total += encoder.encode(part).length;
    }

    append("%PDF-1.4\n");

    offsets.push(total);
    append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

    offsets.push(total);
    append("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

    offsets.push(total);
    append(
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
    );

    offsets.push(total);
    append(`4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n${stream}\nendstream\nendobj\n`);

    offsets.push(total);
    append("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n");

    const xrefOffset = total;
    let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < offsets.length; i += 1) {
      xref += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
    }
    append(xref);

    append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

    return new Blob(objects, { type: "application/pdf" });
  }

  function handleExport(format: "pdf" | "excel") {
    if (!board) return;
    if (!cards.length) {
      alert("There are no cards to export yet.");
      return;
    }
    if (format === "excel") {
      const header = ["Stage", "Card", "Votes"];
      const rows: string[][] = [header];

      sortedStages.forEach((stage) => {
        const stageCards = cardsByStage[stage.id] ?? [];
        if (!stageCards.length) {
          rows.push([stage.name, "(no cards yet)", "0"]);
          return;
        }

        stageCards.forEach((card, index) => {
          const stageCell = index === 0 ? stage.name : "";
          const votesCell = getUpvoteCount(card).toString();
          rows.push([stageCell, card.content, votesCell]);
        });
      });

      const encodeCell = (value: string) => {
        const normalized = value.replace(/\r?\n/g, "\n");
        if (/[",\n]/.test(normalized)) {
          return `"${normalized.replace(/"/g, '""')}"`;
        }
        return normalized;
      };

      const csv = rows.map((line) => line.map(encodeCell).join(",")).join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${board.title.replace(/\s+/g, "-").toLowerCase() || "retro-board"}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      return;
    }

    const pdfBlob = buildPdfBlob();
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${board.title.replace(/\s+/g, "-").toLowerCase() || "retro-board"}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  async function toggleCardUpvote(card: RetroCardPayload) {
    if (!user) {
      setShowProfileModal(true);
      return;
    }
    if (!boardId) return;

    const reactions = card.reactions ?? [];
    const existing = reactions.find(
      (reaction) => reaction.type === UPVOTE_TYPE && reaction.userId === user.id
    );
    const previousCards = cards;

    try {
      if (existing) {
        const params = new URLSearchParams({ type: UPVOTE_TYPE, userId: user.id });
        setCards((previous) =>
          previous.map((item) =>
            item.id === card.id
              ? {
                  ...item,
                  reactions: (item.reactions ?? []).filter((reaction) => reaction.id !== existing.id),
                }
              : item
          )
        );

        const response = await fetch(
          `/api/retro-boards/${boardId}/cards/${card.id}/reactions?${params.toString()}`,
          { method: "DELETE" }
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Unable to remove upvote");
        }
      } else {
        const tempReaction = {
          id: `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          userId: user.id,
          type: UPVOTE_TYPE,
        } as const;
        setCards((previous) =>
          previous.map((item) =>
            item.id === card.id
              ? {
                  ...item,
                  reactions: [...(item.reactions ?? []), tempReaction],
                }
                : item
          )
        );

        const response = await fetch(`/api/retro-boards/${boardId}/cards/${card.id}/reactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: UPVOTE_TYPE, userId: user.id }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Unable to add upvote");
        }

        const nextReaction: { id: string; userId: string; type: string } = await response.json();
        setCards((previous) =>
          previous.map((item) =>
            item.id === card.id
              ? {
                  ...item,
                  reactions: (item.reactions ?? []).map((reaction) =>
                    reaction.id === tempReaction.id ? nextReaction : reaction
                  ),
                }
              : item
          )
        );
      }
    } catch (cause) {
      console.warn("Unable to toggle upvote", cause);
      setCards(previousCards);
      if (cause instanceof Error) {
        alert(cause.message);
      } else {
        alert("Unable to update upvote");
      }
    }
  }

  function getDraftsForStage(stageId: string) {
    return draftCards[stageId] ?? [];
  }

  function createDraftId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function handleAddDraft(stageId: string) {
    setDraftCards((previous) => {
      const next = { ...previous };
      const drafts = next[stageId] ? [...next[stageId]] : [];
      drafts.push({ id: createDraftId(), content: "", saving: false, error: null });
      next[stageId] = drafts;
      return next;
    });
  }

  function handleDraftChange(stageId: string, draftId: string, value: string) {
    setDraftCards((previous) => {
      const drafts = previous[stageId];
      if (!drafts) return previous;
      const nextDrafts = drafts.map((draft) =>
        draft.id === draftId ? { ...draft, content: value, error: null } : draft
      );
      return { ...previous, [stageId]: nextDrafts };
    });
  }

  function removeDraft(stageId: string, draftId: string) {
    setDraftCards((previous) => {
      const drafts = previous[stageId];
      if (!drafts) return previous;
      const remaining = drafts.filter((draft) => draft.id !== draftId);
      const next = { ...previous };
      if (remaining.length) {
        next[stageId] = remaining;
      } else {
        delete next[stageId];
      }
      return next;
    });
  }

  function startEditingCard(card: RetroCardPayload) {
    setEditingCards((previous) => ({
      ...previous,
      [card.id]: { content: card.content, saving: false, error: null },
    }));
  }

  function cancelEditingCard(cardId: string) {
    setEditingCards((previous) => {
      const next = { ...previous };
      delete next[cardId];
      return next;
    });
  }

  function updateEditingContent(cardId: string, value: string) {
    setEditingCards((previous) => {
      const current = previous[cardId];
      if (!current) return previous;
      return {
        ...previous,
        [cardId]: { ...current, content: value, error: null },
      };
    });
  }

  async function handleEditSubmit(card: RetroCardPayload) {
    const editing = editingCards[card.id];
    if (!editing) return;
    const content = editing.content.trim();
    if (!content) {
      setEditingCards((previous) => ({
        ...previous,
        [card.id]: { ...editing, error: "Content cannot be empty" },
      }));
      return;
    }
    if (!boardId) {
      setEditingCards((previous) => ({
        ...previous,
        [card.id]: { ...editing, error: "Board is still loading" },
      }));
      return;
    }
    if (!user) {
      setShowProfileModal(true);
      setEditingCards((previous) => ({
        ...previous,
        [card.id]: { ...editing, error: "Please complete your profile to save cards" },
      }));
      return;
    }

    setEditingCards((previous) => ({
      ...previous,
      [card.id]: { ...editing, saving: true, error: null },
    }));

    try {
      const response = await fetch(`/api/retro-boards/${boardId}/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to update card");
      }

      const updated: RetroCardPayload = await response.json();
      setCards((previous) => previous.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      cancelEditingCard(card.id);
    } catch (cause) {
      setEditingCards((previous) => ({
        ...previous,
        [card.id]: {
          ...editing,
          saving: false,
          error: cause instanceof Error ? cause.message : "Unable to update card",
        },
      }));
    }
  }

  async function handleDeleteCard(card: RetroCardPayload) {
    if (!boardId) return;
    const confirmed = window.confirm("Delete this card?");
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/retro-boards/${boardId}/cards/${card.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to delete card");
      }
      setCards((previous) => previous.filter((item) => item.id !== card.id));
      setEditingCards((previous) => {
        const next = { ...previous };
        delete next[card.id];
        return next;
      });
    } catch (cause) {
      console.warn("Unable to delete card", cause);
      alert(cause instanceof Error ? cause.message : "Unable to delete card");
    }
  }

  async function handleDraftSubmit(
    event: FormEvent<HTMLFormElement>,
    stageId: string,
    draftId: string
  ) {
    event.preventDefault();
    const drafts = draftCards[stageId] ?? [];
    const draft = drafts.find((item) => item.id === draftId);
    if (!draft) return;
    const content = draft.content.trim();
    if (!content) {
      setDraftCards((previous) => {
        const stageDrafts = previous[stageId] ?? [];
        const nextDrafts = stageDrafts.map((item) =>
          item.id === draftId ? { ...item, error: "Content cannot be empty" } : item
        );
        return { ...previous, [stageId]: nextDrafts };
      });
      return;
    }

    if (!boardId) {
      setDraftCards((previous) => {
        const stageDrafts = previous[stageId] ?? [];
        const nextDrafts = stageDrafts.map((item) =>
          item.id === draftId ? { ...item, error: "Board is still loading" } : item
        );
        return { ...previous, [stageId]: nextDrafts };
      });
      return;
    }

    if (!user) {
      setShowProfileModal(true);
      setDraftCards((previous) => {
        const stageDrafts = previous[stageId] ?? [];
        const nextDrafts = stageDrafts.map((item) =>
          item.id === draftId ? { ...item, error: "Please complete your profile to save cards" } : item
        );
        return { ...previous, [stageId]: nextDrafts };
      });
      return;
    }

    setDraftCards((previous) => {
      const stageDrafts = previous[stageId] ?? [];
      const nextDrafts = stageDrafts.map((item) =>
        item.id === draftId ? { ...item, saving: true, error: null } : item
      );
      return { ...previous, [stageId]: nextDrafts };
    });

    try {
      const response = await fetch(`/api/retro-boards/${boardId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, stageId, authorId: user.id }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to save card");
      }

      const nextCard: RetroCardPayload = await response.json();
      nextCard.reactions = nextCard.reactions ?? [];
      setCards((previous) => [nextCard, ...previous]);
      removeDraft(stageId, draftId);
    } catch (cause) {
      setDraftCards((previous) => {
        const stageDrafts = previous[stageId] ?? [];
        const nextDrafts = stageDrafts.map((item) =>
          item.id === draftId
            ? {
                ...item,
                saving: false,
                error: cause instanceof Error ? cause.message : "Unable to save card",
              }
            : item
        );
        return { ...previous, [stageId]: nextDrafts };
      });
    }
  }

  function handleDraftKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
    stageId: string,
    draftId: string
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.closest("form");
      if (form) {
        form.requestSubmit();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      removeDraft(stageId, draftId);
    }
  }

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

  useEffect(() => {
    if (!loading || !loadingRef.current) return;
    const ctx = gsap.context(() => {
      const letters = loadingRef.current!.querySelectorAll<HTMLElement>(".loading-letter");
      gsap.set(letters, { y: 10, opacity: 0.2 });
      gsap.to(letters, {
        y: 0,
        opacity: 1,
        duration: 0.55,
        ease: "power2.out",
        stagger: {
          amount: 0.7,
          from: "start",
        },
        repeat: -1,
        yoyo: true,
      });

      gsap.to(loadingRef.current, {
        opacity: 1,
        duration: 0.9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });
    return () => ctx.revert();
  }, [loading]);
  const isReady = board && user && boardId;

  return (
    <div className="relative isolate flex min-h-screen flex-col ">
      <SiteHeader
        user={user ?? undefined}
        joinedBoards={joinedBoards}
        onSelectBoard={(nextBoardId) => router.push(`/retro-boards/${nextBoardId}`)}
        boardContext={board ? { id: board.id, title: board.title } : undefined}
        stageFilters={stageFilterOptions}
        activeStageFilter={activeStageFilter}
        onStageFilterChange={handleStageFilterChange}
        onExport={handleExport}
      />

      <main className="mx-auto flex w-full  flex-1 flex-col gap-6 px-6 pb-16 pt-6 sm:px-10">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <p
              ref={loadingRef}
              className="select-none text-3xl font-semibold tracking-tight text-muted-foreground sm:text-4xl"
            >
              {"Loading board…".split("").map((character, index) => (
                <span
                  key={`${character}-${index}`}
                  className="loading-letter inline-block px-0.5"
                >
                  {character === " " ? "\u00A0" : character}
                </span>
              ))}
            </p>
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
              {visibleStages.map((stage) => (
                <div
                  key={stage.id}
                  className={`${stageBaseCardClass} border transition-colors duration-300`}
                  data-stage-theme="container"
                  data-light-border={stageColors[stage.id]?.containerBorder}
                  data-dark-border={stageColors[stage.id]?.containerBorderDark}
                  data-light-bg={stageColors[stage.id]?.containerBackground}
                  data-dark-bg={stageColors[stage.id]?.containerBackgroundDark}
                  data-light-text={stageColors[stage.id]?.textColor}
                  data-dark-text={stageColors[stage.id]?.textColorDark}
                  style={{
                    borderColor: stageColors[stage.id]?.containerBorder,
                    backgroundColor: stageColors[stage.id]?.containerBackground,
                    color: stageColors[stage.id]?.textColor,
                  }}
                >
                  <header className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">{stage.name}</h2>
                    <button
                      type="button"
                      onClick={() => handleAddDraft(stage.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold text-white shadow-glow transition hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-retroscope-orange"
                      data-stage-theme="accent"
                      data-light-bg={stageColors[stage.id]?.accentBackground}
                      data-dark-bg={stageColors[stage.id]?.accentBackgroundDark}
                      style={{
                        backgroundColor: stageColors[stage.id]?.accentBackground,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      }}
                      aria-label={`Add card to ${stage.name}`}
                    >
                      +
                    </button>
                  </header>
                  <div className={`flex-1 overflow-y-auto px-1 pb-4 pt-2 ${cardsContainerClass}`}>
                    {cardsLoading && !cardsByStage[stage.id]?.length ? (
                      <span className="text-sm text-muted-foreground">Loading cards…</span>
                    ) : null}
                    {cardsError && !cardsByStage[stage.id]?.length ? (
                      <span className="text-sm text-red-500">{cardsError}</span>
                    ) : null}
                    {cardsByStage[stage.id]?.map((card, cardIndex) => {
                      const preset = stageColors[stage.id];
                      const editing = editingCards[card.id];
                      const tilt = editing ? 0 : (cardIndex % 2 === 0 ? -2 : 2.4);
                      const upvoteReactions = card.reactions?.filter(
                        (reaction) => reaction.type === UPVOTE_TYPE
                      ) ?? [];
                      const hasUserUpvoted = Boolean(
                        user && upvoteReactions.some((reaction) => reaction.userId === user.id)
                      );
                      const upvoteCount = upvoteReactions.length;
                      return (
                        <div key={card.id} className="relative">
                          <article
                            className="group relative overflow-hidden rounded-[26px] border px-5 pb-5 pt-9 text-sm text-foreground backdrop-blur transition-transform duration-300 hover:-translate-y-1"
                            data-stage-theme="card"
                            data-light-border={preset?.cardBorder}
                            data-dark-border={preset?.cardBorderDark}
                            data-light-bg={preset?.cardBackground}
                            data-dark-bg={preset?.cardBackgroundDark}
                            data-light-text={preset?.textColor}
                            data-dark-text={preset?.textColorDark}
                            data-light-strip={preset?.stripColor}
                            data-dark-strip={preset?.stripColorDark}
                          style={{
                            borderColor: preset?.cardBorder,
                            backgroundColor: preset?.cardBackground,
                            color: preset?.textColor,
                            transform: `rotate(${tilt}deg)`,
                            "--note-strip": preset?.stripColor,
                          } as React.CSSProperties}
                        >
                            <div className="pointer-events-none absolute left-0 top-0 h-8 w-full rounded-b-[22px] opacity-90 transition-colors duration-300 before:absolute before:inset-0 before:bg-[var(--note-strip)] before:content-['']" />
                            {editing ? (
                              <form
                              onSubmit={(event) => {
                                event.preventDefault();
                                void handleEditSubmit(card);
                              }}
                              className="relative flex flex-col gap-3"
                            >
                              <textarea
                                value={editing.content}
                                onChange={(event) => updateEditingContent(card.id, event.target.value)}
                                className="h-40 w-full resize-none rounded-2xl border px-4 py-3 text-sm font-medium outline-none transition focus:border-retroscope-orange focus:ring-2 focus:ring-retroscope-orange/30"
                                data-stage-theme="input"
                                data-light-border={preset?.inputBorder}
                                data-dark-border={preset?.inputBorderDark}
                                data-light-bg={preset?.inputBackground}
                                data-dark-bg={preset?.inputBackgroundDark}
                                data-light-text={preset?.textColor}
                                data-dark-text={preset?.textColorDark}
                                data-placeholder={preset?.placeholderColor}
                                data-placeholder-dark={preset?.placeholderColorDark}
                                style={{
                                  borderColor: preset?.inputBorder,
                                  backgroundColor: preset?.inputBackground,
                                  color: preset?.textColor,
                                  "--placeholder-color": preset?.placeholderColor,
                                } as React.CSSProperties}
                                placeholder="Update your insight…"
                                autoFocus
                              />
                              {editing.error ? (
                                <p className="text-xs text-red-500">{editing.error}</p>
                              ) : null}
                              <div className="flex items-center gap-2">
                                <button
                                  type="submit"
                                  disabled={editing.saving}
                                  className="rounded-full bg-retroscope-gradient px-4 py-1.5 text-xs font-semibold text-white shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  {editing.saving ? "Saving…" : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelEditingCard(card.id)}
                                  disabled={editing.saving}
                                  className="rounded-full border border-surface-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-retroscope-orange/60 hover:text-retroscope-orange disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                              ) : (
                                <>
                                  <p>{card.content}</p>
                                  <div className="pointer-events-none absolute inset-0 rounded-[26px] border border-transparent transition group-hover:border-white/10" />
                                  <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => startEditingCard(card)}
                                  className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-black/30 text-white shadow-sm backdrop-blur transition hover:scale-105"
                                  aria-label="Edit card"
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
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCard(card)}
                                  className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-black/30 text-white shadow-sm backdrop-blur transition hover:scale-105"
                                  aria-label="Delete card"
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
                                    <path d="M3 6h18" />
                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                    <line x1="10" x2="10" y1="11" y2="17" />
                                    <line x1="14" x2="14" y1="11" y2="17" />
                                  </svg>
                                </button>
                                  </div>
                                  <div className="mt-5 flex items-center justify-end">
                                    <button
                                      type="button"
                                      onClick={() => toggleCardUpvote(card)}
                                      className={`flex items-center gap-1 rounded-full border border-surface-border/70 px-3 py-1 text-xs font-semibold transition hover:border-retroscope-orange/80 ${
                                        hasUserUpvoted ? "bg-retroscope-orange/15 text-retroscope-orange" : "text-muted-foreground"
                                      }`}
                                      aria-pressed={hasUserUpvoted}
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-3.5 w-3.5"
                                      >
                                        <path d="M12 5l-7 7h4v7h6v-7h4l-7-7z" />
                                      </svg>
                                      <span>{upvoteCount}</span>
                                    </button>
                                  </div>
                                </>
                              )}
                          </article>
                        </div>
                      );
                    })}
                    {getDraftsForStage(stage.id).map((draft) => (
                      <div key={draft.id} className="relative">
                        <form
                          onSubmit={(event) => handleDraftSubmit(event, stage.id, draft.id)}
                          className="rounded-2xl border p-4 shadow-sm transition-colors duration-300"
                          data-stage-theme="draft"
                          data-light-border={stageColors[stage.id]?.draftBorder}
                          data-dark-border={stageColors[stage.id]?.draftBorderDark}
                          data-light-bg={stageColors[stage.id]?.draftBackground}
                          data-dark-bg={stageColors[stage.id]?.draftBackgroundDark}
                          data-light-text={stageColors[stage.id]?.textColor}
                          data-dark-text={stageColors[stage.id]?.textColorDark}
                          data-light-strip={stageColors[stage.id]?.stripColor}
                          data-dark-strip={stageColors[stage.id]?.stripColorDark}
                          style={{
                            borderColor: stageColors[stage.id]?.draftBorder,
                            backgroundColor: stageColors[stage.id]?.draftBackground,
                            color: stageColors[stage.id]?.textColor,
                            "--note-strip": stageColors[stage.id]?.stripColor,
                          } as React.CSSProperties}
                        >
                          <textarea
                            value={draft.content}
                            onChange={(event) => handleDraftChange(stage.id, draft.id, event.target.value)}
                            onKeyDown={(event) => handleDraftKeyDown(event, stage.id, draft.id)}
                            className="h-28 w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-retroscope-orange focus:ring-2 focus:ring-retroscope-orange/30"
                            data-stage-theme="input"
                            data-light-border={stageColors[stage.id]?.inputBorder}
                            data-dark-border={stageColors[stage.id]?.inputBorderDark}
                            data-light-bg={stageColors[stage.id]?.inputBackground}
                            data-dark-bg={stageColors[stage.id]?.inputBackgroundDark}
                            data-light-text={stageColors[stage.id]?.textColor}
                            data-dark-text={stageColors[stage.id]?.textColorDark}
                            data-placeholder={stageColors[stage.id]?.placeholderColor}
                            data-placeholder-dark={stageColors[stage.id]?.placeholderColorDark}
                            style={{
                              borderColor: stageColors[stage.id]?.inputBorder,
                              backgroundColor: stageColors[stage.id]?.inputBackground,
                              color: stageColors[stage.id]?.textColor,
                              "--placeholder-color": stageColors[stage.id]?.placeholderColor,
                            } as React.CSSProperties}
                            placeholder="Share your thoughts…"
                            autoFocus
                          />
                        {draft.error ? (
                          <p className="mt-2 text-xs text-red-500">{draft.error}</p>
                        ) : null}
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="submit"
                            disabled={draft.saving}
                            className="rounded-full bg-retroscope-gradient px-4 py-1.5 text-xs font-semibold text-white shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {draft.saving ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDraft(stage.id, draft.id)}
                            disabled={draft.saving}
                            className="rounded-full border border-surface-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-retroscope-orange/60 hover:text-retroscope-orange disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                        </form>
                      </div>
                    ))}
                    {!cardsByStage[stage.id]?.length &&
                    !getDraftsForStage(stage.id).length &&
                    !cardsLoading &&
                    !cardsError ? (
                      <p className="text-sm text-muted-foreground">
                        Cards and feedback will appear here once your team starts the retro.
                      </p>
                    ) : null}
                  </div>
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
