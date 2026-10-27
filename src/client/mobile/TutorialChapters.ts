// Mobile tutorial in chapters: Expand, Build, War. One chapter per game, the
// first unfinished one; after Expand each waits until it is relevant (gold for
// a City, gold for a Missile Silo). Finished chapters live in localStorage;
// when storage is blocked every game starts at Expand.
import { TUTORIAL_STEPS, TutorialContext, TutorialStep } from "../hud/Tutorial";

const KEY = "wc.tutorial";

export interface TutorialChapter {
  /** `tutorial.chapter.*` name key. */
  id: "expand" | "build" | "war";
  steps: readonly TutorialStep[];
  /** Whether the chapter may open now; `siloCost` is null until polled. */
  opens: (ctx: TutorialContext, siloCost: bigint | null) => boolean;
}

const from = (first: string, before?: string) =>
  TUTORIAL_STEPS.slice(
    TUTORIAL_STEPS.findIndex((s) => s.id === first),
    before === undefined
      ? undefined
      : TUTORIAL_STEPS.findIndex((s) => s.id === before),
  );

export const CHAPTERS: readonly TutorialChapter[] = [
  { id: "expand", steps: from("spawn", "buy_city"), opens: () => true },
  {
    id: "build",
    steps: from("buy_city", "buy_defense_post"),
    opens: (c) =>
      c.cityDisabled ||
      c.cities > 0 ||
      (c.cityCost !== null && c.gold >= c.cityCost),
  },
  {
    id: "war",
    steps: from("buy_defense_post"),
    opens: (c, siloCost) =>
      c.siloDisabled ||
      c.silos > 0 ||
      (siloCost !== null && c.gold >= siloCost),
  },
];

function chaptersDone(): number {
  try {
    const n = Number(localStorage.getItem(KEY));
    return Number.isInteger(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** The chapter this game teaches, or null once all are done. */
export function nextChapter(): TutorialChapter | null {
  return CHAPTERS[chaptersDone()] ?? null;
}

export function finishChapter(chapter: TutorialChapter): void {
  const n = CHAPTERS.indexOf(chapter) + 1;
  try {
    if (n > chaptersDone()) localStorage.setItem(KEY, String(n));
  } catch {
    // Storage blocked: the chapter repeats next game.
  }
}

/**
 * The first sentence of `text` and whether more follows. The banner shows the
 * sentence whole; a tap shows the rest.
 */
// ponytail: ends at . ! ? ؟ before a space; an abbreviation ("e.g.") would cut
// early. No step text has one; Intl.Segmenter if that changes.
export function firstSentence(text: string): [string, boolean] {
  const first = /^[\s\S]*?[.!?؟](?=\s|$)/.exec(text)?.[0] ?? text;
  return [first, text.trim().length > first.length];
}
