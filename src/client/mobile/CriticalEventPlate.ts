// A plate for the three events a phone player must not miss while looking at
// the map: a nuke inbound, a betrayed alliance, a new attack on them. Local
// player only. The same plate, gold-edged, marks a few good moments once per
// game (milestones). DESIGN.md "Event plate". Game-client chunk.
import { MessageType, PlayerType } from "@openfront/engine-api/game/GameTypes";
import { GameUpdateType } from "@openfront/engine-api/game/GameUpdates";
import { Controller } from "../Controller";
import { landProgress } from "../hud/layers/GameLeftSidebar";
import { translateText } from "../Utils";
import type { GameView } from "../view";
import { rivalCount } from "./Recap";

export type PlateKind = "nuke" | "betrayal" | "attack" | "milestone";

export type Milestone =
  | "first_nation"
  | "land_25"
  | "land_50"
  | "leader"
  | "last_rival";

/** Milestones reached, in the order they show; each shows once a game. */
export function milestonesReached(s: {
  /** We conquered a nation (not a tribe) this game. */
  conquered: boolean;
  /** Our share of the land, percent. */
  share: number;
  /** Rival nations out, of all there were (see `rivalCount`). */
  out: number;
  total: number;
  /** We hold more land than anyone else. */
  leading: boolean;
}): Milestone[] {
  const m: Milestone[] = [];
  if (s.conquered) m.push("first_nation");
  if (s.share >= 25) m.push("land_25");
  if (s.share >= 50) m.push("land_50");
  if (s.leading) m.push("leader");
  if (s.out >= 1 && s.out === s.total - 1) m.push("last_rival");
  return m;
}

const PRIORITY: Record<PlateKind, number> = {
  milestone: 0,
  attack: 1,
  betrayal: 2,
  nuke: 3,
};
/** At most one attack plate per 10 s of game time (10 ticks a second). */
export const ATTACK_COOLDOWN_TICKS = 100;
export const SHOW_MS = 4000;
const NAME_MAX = 18;

/** Decides which events become a plate. Pure, so the rules are tested. */
export class PlateGate {
  private seenAttacks = new Set<string>();
  private lastAttackTick = -Infinity;
  private shown: PlateKind | null = null;

  /** True when `kind` should be shown now; the caller then shows it. */
  offer(kind: PlateKind, tick: number, attackId?: string): boolean {
    // Good news waits for an empty slot; it never cuts another plate short.
    if (kind === "milestone" && this.shown !== null) return false;
    if (kind === "attack") {
      // An id never triggers twice, whether or not it got a plate.
      if (attackId !== undefined) {
        if (this.seenAttacks.has(attackId)) return false;
        this.seenAttacks.add(attackId);
      }
      if (tick - this.lastAttackTick < ATTACK_COOLDOWN_TICKS) return false;
    }
    // A new event replaces the plate only at equal or higher priority.
    if (this.shown !== null && PRIORITY[kind] < PRIORITY[this.shown]) {
      return false;
    }
    if (kind === "attack") this.lastAttackTick = tick;
    this.shown = kind;
    return true;
  }

  /** An attack that must never trigger a plate (it started before now). */
  markSeen(attackId: string): void {
    this.seenAttacks.add(attackId);
  }

  /** The plate left the screen (dismissed or timed out). */
  clear(): void {
    this.shown = null;
  }
}

export function truncateName(name: string): string {
  const chars = Array.from(name);
  return chars.length > NAME_MAX
    ? chars.slice(0, NAME_MAX).join("") + "…"
    : name;
}

// 22px line icons: a radiation mark, a broken link, crossed blades (Alarm
// Red), a star (Gold Leaf).
const ICONS: Record<PlateKind, string> = {
  nuke: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8 7.6 2.6A10 10 0 0 1 16.4 2.6Z"/><path d="M14.1 13.1 22 14.5A10 10 0 0 1 17.6 22.1Z"/><path d="M9.9 13.1 6.4 22.1A10 10 0 0 1 2 14.5Z"/>',
  betrayal:
    '<path d="M10 14 6.5 17.5a3.2 3.2 0 0 1-4.5-4.5L5.5 9.5"/><path d="M14 10 17.5 6.5A3.2 3.2 0 0 1 22 11l-3.5 3.5"/><path d="M8 3.5 9 6M3.5 8 6 9M16 21l-1-2.5M21 16l-2.5-1"/>',
  attack:
    '<path d="M4 20 19 5M15 4h5v5"/><path d="M20 20 5 5M9 4H4v5"/><path d="M3 21l3-3M21 21l-3-3"/>',
  milestone:
    '<path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3L2.8 9.5l6.4-.9Z"/>',
};

/** Milestones are checked once a second (10 ticks a second). */
const MILESTONE_TICKS = 10;

export const PLATE_ID = "wc-event-plate";

export class CriticalEventPlate implements Controller {
  private gate = new PlateGate();
  private el: HTMLElement | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private game: GameView,
    /** Called when a plate shows; the phone vibrates for an attack. */
    private onShown: (kind: PlateKind) => void = () => {},
    /** Turns of a resumed game that replay before play is live; 0 otherwise. */
    private resumeTurnCount = 0,
  ) {}
  private replaying = false;
  private milestonesDone = new Set<Milestone>();
  /** The first nation we conquered this game, while live. */
  private conquered: string | null = null;

  tick(): void {
    const me = this.game.myPlayer();
    if (!me || !me.isAlive()) return;
    const updates = this.game.updatesSinceLastTick();
    const tick = this.game.ticks();

    // A resumed game replays its saved turns: those events are old news.
    if (this.game.isCatchingUp() || tick < this.resumeTurnCount) {
      this.replaying = true;
      return;
    }
    if (this.replaying) {
      // Back to live: attacks already under way are not new.
      this.replaying = false;
      for (const a of me.incomingAttacks()) this.gate.markSeen(a.id);
      // Nor are milestones already reached.
      for (const m of this.milestones()) this.milestonesDone.add(m);
      return;
    }

    for (const c of updates?.[GameUpdateType.ConquestEvent] ?? []) {
      if (this.conquered !== null || c.conquerorId !== me.id()) continue;
      const p = this.game.player(c.conqueredId);
      if (p.type() !== PlayerType.Bot) this.conquered = p.displayName();
    }

    for (const u of updates?.[GameUpdateType.UnitIncoming] ?? []) {
      if (
        u.playerID === me.smallID() &&
        u.messageType === MessageType.NUKE_INBOUND
      ) {
        const owner = this.game.unit(u.unitID)?.owner();
        this.offer("nuke", owner?.displayName(), tick);
      }
    }
    for (const u of updates?.[GameUpdateType.BrokeAlliance] ?? []) {
      if (this.game.playerBySmallID(u.betrayedID) === me) {
        const traitor = this.game.playerBySmallID(u.traitorID);
        this.offer(
          "betrayal",
          traitor.isPlayer() ? traitor.displayName() : undefined,
          tick,
        );
      }
    }
    // The gate remembers every attack id, so a standing attack is one event.
    for (const a of me.incomingAttacks()) {
      if (a.retreating) continue;
      const attacker = this.game.playerBySmallID(a.attackerID);
      this.offer(
        "attack",
        attacker.isPlayer() ? attacker.displayName() : undefined,
        tick,
        a.id,
      );
    }

    if (tick % MILESTONE_TICKS === 0 && !this.game.inSpawnPhase()) {
      const next = this.milestones().find((m) => !this.milestonesDone.has(m));
      if (next !== undefined && this.gate.offer("milestone", tick)) {
        this.milestonesDone.add(next);
        this.show("milestone", this.milestoneText(next));
        this.onShown("milestone");
      }
    }
  }

  private milestones(): Milestone[] {
    const me = this.game.myPlayer();
    if (!me) return [];
    const mine = me.numTilesOwned();
    return milestonesReached({
      conquered: this.conquered !== null,
      share: landProgress(this.game)?.share ?? 0,
      ...rivalCount(this.game),
      leading: this.game
        .players()
        .every((p) => p === me || !p.isAlive() || p.numTilesOwned() < mine),
    });
  }

  private milestoneText(m: Milestone): string {
    const me = this.game.myPlayer();
    const name =
      m === "first_nation"
        ? this.conquered
        : this.game
            .players()
            .find((p) => p !== me && p.isAlive() && p.type() !== PlayerType.Bot)
            ?.displayName();
    return translateText(`event_plate.milestone_${m}`, {
      name: truncateName(name ?? translateText("event_plate.someone")),
    });
  }

  private offer(
    kind: PlateKind,
    name: string | undefined,
    tick: number,
    attackId?: string,
  ): void {
    if (!this.gate.offer(kind, tick, attackId)) return;
    this.show(
      kind,
      translateText(`event_plate.${kind}`, {
        name: truncateName(name ?? translateText("event_plate.someone")),
      }),
    );
    this.onShown(kind);
  }

  private show(kind: PlateKind, message: string): void {
    this.hide(false);
    const el = document.createElement("div");
    el.id = PLATE_ID;
    el.className = `wc-plate wc-event-plate${kind === "milestone" ? " wc-milestone" : ""}`;
    // Alarms interrupt a screen reader; an attack or milestone queues.
    const polite = kind === "attack" || kind === "milestone";
    el.setAttribute("role", polite ? "status" : "alert");
    el.setAttribute("aria-live", polite ? "polite" : "assertive");

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "wc-event-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("width", "22");
    icon.setAttribute("height", "22");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = ICONS[kind];
    const text = document.createElement("span");
    text.textContent = message;
    el.append(icon, text);
    el.addEventListener("click", () => this.hide(true));

    // Directly below the tutorial banner while that shows.
    const banner = document
      .querySelector("tutorial-panel > div")
      ?.getBoundingClientRect();
    if (banner && banner.height > 0) {
      el.style.setProperty(
        "--wc-event-top",
        `${Math.ceil(banner.bottom) + 8}px`,
      );
    }
    document.body.append(el);
    this.el = el;
    this.timer = setTimeout(() => this.hide(true), SHOW_MS);
  }

  private hide(clearGate: boolean): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.el?.remove();
    this.el = null;
    if (clearGate) this.gate.clear();
  }

  destroy(): void {
    this.hide(true);
  }
}
