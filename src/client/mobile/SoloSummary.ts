import {
  Difficulty,
  GameMapType,
  maps,
} from "@openfront/engine-api/game/GameTypes";
import { assetUrl } from "@openfront/shared/AssetUrls";
import { html } from "lit";
import { terrainMapFileLoader } from "../TerrainMapFileLoader";
import { translateText } from "../Utils";

export interface SoloSummaryInput {
  map: GameMapType;
  random: boolean;
  bots: number;
  // null when the map has no nations, so difficulty does not apply.
  difficulty: Difficulty | null;
}

/** The solo setup rail's match card: what START will launch. */
export function soloSummary(s: SoloSummaryInput) {
  const info = maps.find((m) => m.type === s.map);
  const name = s.random
    ? translateText("map.random")
    : translateText(info?.translationKey ?? "map.map");
  const thumb = s.random
    ? assetUrl("images/RandomMap.webp")
    : terrainMapFileLoader.getMapData(s.map).webpPath;
  const off = translateText("common.disabled");
  return html`<div class="wc-plate wc-solo-summary">
    <img src=${thumb} alt="" draggable="false" />
    <div class="wc-solo-map">${name}</div>
    <dl>
      <dt>${translateText("mobile.solo_tribes")}</dt>
      <dd>${s.bots > 0 ? s.bots : off}</dd>
      <dt>${translateText("mobile.solo_difficulty")}</dt>
      <dd>
        ${s.difficulty === null
          ? off
          : translateText(`difficulty.${s.difficulty.toLowerCase()}`)}
      </dd>
    </dl>
  </div>`;
}
