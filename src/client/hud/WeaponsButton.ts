import {
  BuildableAttacks,
  BuildableUnit,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { renderNumber } from "@openfront/engine-lib/Format";
import { assetUrl } from "@openfront/shared/AssetUrls";
import { EventBus } from "@openfront/shared/EventBus";
import { Controller } from "../Controller";
import { StartAimEvent } from "../controllers/BuildPreviewController";
import { belowTutorialBanner } from "../mobile/CriticalEventPlate";
import { UIState } from "../UIState";
import { translateText } from "../Utils";
import { GameView } from "../view";
import { flattenedBuildTable } from "./layers/BuildMenu";

const nukeIcon = assetUrl("images/NukeIconWhite.svg");

/**
 * App only: the player's arsenal, always one tap away. Shows once a Missile
 * Silo or a Port exists, with the loaded-missile count; picking a weapon
 * starts aiming at the screen center (BuildPreviewController).
 */
export class WeaponsButton implements Controller {
  private root: HTMLDivElement;
  private badge: HTMLSpanElement;
  private list: HTMLDivElement;
  private buildables: BuildableUnit[] = [];

  constructor(
    private game: GameView,
    private eventBus: EventBus,
    private uiState: UIState,
  ) {}

  getTickIntervalMs() {
    return 500;
  }

  init() {
    this.root = document.createElement("div");
    this.root.className = "wc-weapons";
    this.root.innerHTML = `
      <div class="wc-weapons-list"></div>
      <button class="wc-weapons-btn" aria-label="${translateText("radial_menu.weapons")}">
        <img src="${nukeIcon}" alt="" width="28" height="28" />
        <span class="wc-weapons-label">${translateText("radial_menu.weapons")}</span>
        <span class="wc-weapons-badge"></span>
      </button>`;
    this.list = this.root.querySelector(".wc-weapons-list")!;
    this.badge = this.root.querySelector(".wc-weapons-badge")!;
    this.root
      .querySelector(".wc-weapons-btn")!
      .addEventListener("click", () => {
        this.list.classList.toggle("open");
        this.renderList();
      });
    this.root.style.display = "none";
    document.body.appendChild(this.root);
  }

  tick() {
    const me = this.game.myPlayer();
    const silos = me?.totalUnitLevels(UnitType.MissileSilo) ?? 0;
    const ports = me?.totalUnitLevels(UnitType.Port) ?? 0;
    const show =
      me !== null &&
      me.isAlive() &&
      !this.game.inSpawnPhase() &&
      this.uiState.ghostStructure === null &&
      silos + ports > 0;
    this.root.style.display = show ? "" : "none";
    this.root.style.top = (show ? belowTutorialBanner() : null) ?? "";
    if (!show || me === null) {
      this.list.classList.remove("open");
      return;
    }
    const loaded = me.readyMissileCount();
    this.badge.textContent = loaded > 0 ? String(loaded) : "";
    me.buildables(undefined, BuildableAttacks.types).then((b) => {
      this.buildables = b;
      if (this.list.classList.contains("open")) this.renderList();
    });
  }

  private renderList() {
    const me = this.game.myPlayer();
    if (me === null) return;
    this.list.replaceChildren(
      ...flattenedBuildTable
        .filter(
          (item) =>
            BuildableAttacks.has(item.unitType) &&
            !this.game.config().isUnitDisabled(item.unitType),
        )
        .map((item) => {
          const cost =
            this.buildables.find((b) => b.type === item.unitType)?.cost ?? 0n;
          const reason = this.reason(item.unitType, cost);
          const row = document.createElement("button");
          row.className = "wc-weapons-item";
          row.disabled = reason !== null;
          row.innerHTML = `<img src="${item.icon}" alt="" width="28" height="28" />
            <span class="wc-weapons-name"></span>
            <span class="wc-weapons-note"></span>`;
          row.querySelector(".wc-weapons-name")!.textContent = translateText(
            item.key ?? "",
          );
          row.querySelector(".wc-weapons-note")!.textContent =
            reason ??
            `${renderNumber(cost)} ${translateText("player_panel.gold")}`;
          row.addEventListener("click", () => {
            this.list.classList.remove("open");
            this.eventBus.emit(
              new StartAimEvent(
                item.unitType as (typeof BuildableAttacks.types)[number],
              ),
            );
          });
          return row;
        }),
    );
  }

  // Only what doesn't depend on the target: the aim view checks the rest.
  private reason(type: UnitType, cost: bigint): string | null {
    const me = this.game.myPlayer()!;
    if (type === UnitType.Warship) {
      if (me.totalUnitLevels(UnitType.Port) === 0) {
        return translateText("build_menu.need_port");
      }
    } else {
      if (me.totalUnitLevels(UnitType.MissileSilo) === 0) {
        return translateText("build_menu.need_silo");
      }
      if (me.readyMissileCount() === 0) {
        return translateText("build_menu.missile_reloading");
      }
      if (this.game.isSpawnImmunityActive()) {
        return translateText("build_menu.spawn_protection");
      }
    }
    if (me.gold() < cost) {
      return translateText("build_menu.need_gold", {
        amount: renderNumber(cost - me.gold()),
      });
    }
    return null;
  }
}
