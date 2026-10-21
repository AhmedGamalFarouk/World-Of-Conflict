// Events between the HUD, the local server and the save slot.

/** The local player's game is over: won, or eliminated (a loss). */
export class GameOverEvent {
  constructor(public readonly reason: "win" | "loss") {}
}

/**
 * A resumed game opened (paused). The pause card heads itself with
 * "RESUMED · TURN N · SAVED N MIN AGO".
 */
export class GameResumedEvent {
  constructor(
    public readonly turn: number,
    public readonly savedAt: number,
  ) {}
}
