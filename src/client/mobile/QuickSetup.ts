import { Difficulty } from "@openfront/engine-api/game/GameTypes";
import { html } from "lit";
import { translateText } from "../Utils";

// 400 is the game's default and the slider's max; the Options slider keeps
// every value in between.
export const TRIBE_PRESETS = [0, 100, 200, 400] as const;

const DIFFICULTIES = [
  Difficulty.Easy,
  Difficulty.Medium,
  Difficulty.Hard,
  Difficulty.Impossible,
];

export interface QuickSetupInput {
  difficulty: Difficulty;
  // The map has no nations, so difficulty does not apply.
  difficultyDisabled: boolean;
  bots: number;
  onDifficulty: (d: Difficulty) => void;
  onBots: (value: number) => void;
}

function row<T>(
  label: string,
  options: readonly T[],
  selected: T,
  name: (o: T) => string,
  pick: (o: T) => void,
  disabled = false,
) {
  return html`<div class="wc-quick-row" role="radiogroup" aria-label=${label}>
    <span class="wc-label">${label}</span>
    <div class="wc-seg">
      ${options.map(
        (o) =>
          html`<button
            type="button"
            class="wc-btn wc-btn-steel"
            role="radio"
            aria-checked=${o === selected}
            ?disabled=${disabled}
            @click=${() => pick(o)}
          >
            ${name(o)}
          </button>`,
      )}
    </div>
  </div>`;
}

/** Phone solo setup: difficulty and tribes in reach under the map strip. */
export function quickSetupRows(s: QuickSetupInput) {
  return html`<div class="wc-quick-setup">
    ${row(
      translateText("mobile.solo_difficulty"),
      DIFFICULTIES,
      s.difficulty,
      (d) => translateText(`difficulty.${d.toLowerCase()}`),
      s.onDifficulty,
      s.difficultyDisabled,
    )}
    ${row(
      translateText("mobile.solo_tribes"),
      TRIBE_PRESETS,
      s.bots,
      (n) => (n === 0 ? translateText("mobile.tribes_off") : String(n)),
      s.onBots,
    )}
  </div>`;
}
