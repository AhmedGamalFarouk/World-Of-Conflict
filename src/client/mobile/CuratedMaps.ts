// Type-only import: vite.config.ts loads this file through Node's
// strip-types loader, which can't run the GameMapType enum.
import type { GameMapName } from "@openfront/engine-api/game/Maps.gen";

// The maps the mobile build ships. All 135 maps (~615 MB) can't fit in an
// app download, so the mobile build copies only these folders and the UI
// offers only these. Australia is here because the cosmetics preview
// (render/preview/loadPreviewMap.ts) hardcodes it.
// ponytail: fixed list; on-demand downloads (docs/mobile/NEXT-STEPS.md, Later) when players want more.
export const CURATED_MAP_IDS: readonly GameMapName[] = [
  "World",
  "Europe",
  "EuropeClassic",
  "Pangaea",
  "Italia",
  "BlackSea",
  "Baltics",
  "Oceania",
  "Mena",
  "Mars",
  "Caucasus",
  "BosphorusStraits",
  "Germany",
  "Benelux",
  "Australia",
];

// The solo map strip's lead maps, big to small (upstream features only World
// and Europe of the curated set).
export const MOBILE_FEATURED_IDS: readonly GameMapName[] = [
  "World",
  "Europe",
  "Pangaea",
  "Mena",
  "Italia",
  "BosphorusStraits",
];

/** resources/maps/<folder> names of the curated maps, for the build copy. */
export function curatedMapFolders(): string[] {
  return CURATED_MAP_IDS.map((id) => id.toLowerCase());
}
