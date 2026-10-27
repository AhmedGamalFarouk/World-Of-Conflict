import { GameType } from "@openfront/engine-api/game/GameTypes";
import { assetUrl } from "@openfront/shared/AssetUrls";
import { EventBus } from "@openfront/shared/EventBus";
import { html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { createNextLobby } from "../../Api";
import { ClientEnv } from "../../ClientEnv";
import "../../components/DoomsdayClockPanel";
import "../../components/OvertimePanel";
import { Controller } from "../../Controller";
import { isDesktopShell } from "../../DesktopShell";
import { gamePortal } from "../../GamePortal";
import { showInGameAlert, showInGameConfirm } from "../../InGameModal";
import {
  ReplaySpeedChangeEvent,
  TogglePauseIntentEvent,
} from "../../InputHandler";
import { activeAutoSaver } from "../../mobile/AutoSave";
import { landPercent } from "../../mobile/Funnel";
import { dispatchEscape, MOBILE_BACK_EVENT } from "../../mobile/MobileBack";
import { isMobileShell } from "../../mobile/MobileShell";
import { gameEnded } from "../../mobile/PlayStats";
import { GameResumedEvent } from "../../mobile/SaveEvents";
import { confirmGone } from "../../mobile/SaveHome";
import { catchUpPercent } from "../../mobile/SaveStore";
import { PauseGameIntentEvent, SendWinnerEvent } from "../../Transport";
import {
  defaultReplaySpeedMultiplier,
  ReplaySpeedMultiplier,
} from "../../utilities/ReplaySpeedMultiplier";
import { homeHref, showToast, translateText } from "../../Utils";
import { GameView } from "../../view";
import { landProgress } from "./GameLeftSidebar";
import { ImmunityBarVisibleEvent } from "./ImmunityTimer";
import { ShowReplayPanelEvent } from "./ReplayPanel";
import { type SettingsModal, ShowSettingsModalEvent } from "./SettingsModal";
import { SpawnBarVisibleEvent } from "./SpawnTimer";
const exitIcon = assetUrl("images/ExitIconWhite.svg");
const FastForwardIconSolid = assetUrl("images/FastForwardIconSolidWhite.svg");
const pauseIcon = assetUrl("images/PauseIconWhite.svg");
const playIcon = assetUrl("images/PlayIconWhite.svg");
const newLobbyIcon = assetUrl("images/ReplayRegularIconWhite.svg");
const settingsIcon = assetUrl("images/SettingIconWhite.svg");
const fullscreenIcon = assetUrl("images/FullscreenIconWhite.svg");
const exitFullscreenIcon = assetUrl("images/ExitFullscreenIconWhite.svg");

const LAST_MINUTE_SECONDS = 60;
const FLASH_TIMER_SECONDS = 30;
const FLASH_SIDEBAR_SECONDS = 10;
const ONE_MINUTE_WARNING_DURATION_MS = 4_000;

@customElement("game-right-sidebar")
export class GameRightSidebar extends LitElement implements Controller {
  public game: GameView;
  public eventBus: EventBus;

  @state()
  private _isSinglePlayer: boolean = false;

  @state()
  private _isReplayVisible: boolean = false;

  @state()
  private _isVisible: boolean = true;

  @state()
  private isPaused: boolean = false;

  @state()
  private isFullscreen: boolean = false;

  @state()
  private timer: number = 0;

  // Portals provide their own fullscreen control around the game frame, and the
  // desktop shell owns its window mode from the settings Display tab, so hide
  // ours on both.
  private readonly hideFullscreenButton =
    gamePortal.isOnGamePortal() || isDesktopShell();
  private hasWinner = false;
  private isLobbyCreator = false;
  private isPrivateLobby = false;
  private hasShownOneMinuteWarning = false;
  // Guards the in-game "New lobby" button so a double click doesn't fire twice
  // before we navigate to the successor lobby.
  private newLobbyRequested = false;
  // The simulation's real pause state: every pause (this button, the settings
  // menu, the keyboard) goes through PauseGameIntentEvent.
  private simPaused = false;
  private speed: ReplaySpeedMultiplier = defaultReplaySpeedMultiplier;
  // Set by a resumed game until the player's first RESUME tap.
  @state() private resumed: { turn: number; savedAt: number } | null = null;
  // Refreshes the pause card's "Saved N s ago" while it is open.
  private cardTicker: ReturnType<typeof setInterval> | null = null;
  private spawnBarVisible = false;
  private immunityBarVisible = false;

  createRenderRoot() {
    // Stack the timer bar + doomsday-clock readout, centers aligned (the narrower
    // one sits centered under the wider one).
    this.style.display = "flex";
    this.style.flexDirection = "column";
    this.style.alignItems = "center";
    this.style.gap = "6px";
    return this;
  }

  init() {
    this._isSinglePlayer =
      this.game?.config()?.gameConfig()?.gameType === GameType.Singleplayer ||
      this.game.config().isReplay();
    this.isPrivateLobby =
      this.game?.config()?.gameConfig()?.gameType === GameType.Private;
    this._isVisible = true;
    this.hasShownOneMinuteWarning = false;

    this.eventBus.on(SpawnBarVisibleEvent, (e) => {
      this.spawnBarVisible = e.visible;
      this.updateParentOffset();
    });
    this.eventBus.on(ImmunityBarVisibleEvent, (e) => {
      this.immunityBarVisible = e.visible;
      this.updateParentOffset();
    });

    this.eventBus.on(PauseGameIntentEvent, (e) => {
      this.simPaused = e.paused;
    });

    // A resumed game opens paused, with the card saying where it is.
    this.eventBus.on(GameResumedEvent, (e) => {
      this.resumed = { turn: e.turn, savedAt: e.savedAt };
      this.simPaused = true;
      this.isPaused = true;
      void gamePortal.gameplayStop();
      this.startCardTicker();
    });

    this.eventBus.on(ReplaySpeedChangeEvent, (e) => {
      this.speed = e.replaySpeedMultiplier;
      this.requestUpdate();
    });

    this.eventBus.on(SendWinnerEvent, () => {
      this.hasWinner = true;
      this.requestUpdate();
    });

    this.eventBus.on(TogglePauseIntentEvent, () => {
      const isReplayOrSingleplayer =
        this._isSinglePlayer || this.game?.config()?.isReplay();
      if (
        isReplayOrSingleplayer ||
        (this.isLobbyCreator && !this.game.config().listed)
      ) {
        this.onPauseButtonClick();
      }
    });

    this.requestUpdate();
  }

  private onFullscreenChange = () => {
    this.isFullscreen = !!document.fullscreenElement;
  };

  // Mobile app: Android hides the WebView when the app goes to the background
  // (a call, an app switch). Pause the local game then and leave it paused on
  // return with the pause card up, so the player resumes with a tap.
  private onVisibilityChange = () => {
    if (!isMobileShell() || !this._isSinglePlayer || this.hasWinner) return;
    if (!document.hidden) return;
    if (this.simPaused || !this.game || this.game.inSpawnPhase()) return;
    this.onPauseButtonClick();
  };

  // Mobile app, Android back: close the in-game menu if it is open; the pause
  // overlay toggles (back opens it, back again resumes); where no pause is
  // possible (spawn phase, game over) ask before leaving, so a stray press
  // never quits.
  private onMobileBack = async () => {
    if (document.querySelector<SettingsModal>("settings-modal")?.open) {
      dispatchEscape();
      return;
    }
    if (this.isPaused || this.canMobilePause()) {
      this.onPauseButtonClick();
      return;
    }
    if (
      await showInGameConfirm(translateText("help_modal.exit_confirmation"))
    ) {
      await this.leaveGame();
    }
  };

  private canMobilePause(): boolean {
    return (
      this._isSinglePlayer &&
      !this.simPaused &&
      !this.hasWinner &&
      !this.game.inSpawnPhase()
    );
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("fullscreenchange", this.onFullscreenChange);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    window.addEventListener(MOBILE_BACK_EVENT, this.onMobileBack);
    this.onFullscreenChange();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("fullscreenchange", this.onFullscreenChange);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    window.removeEventListener(MOBILE_BACK_EVENT, this.onMobileBack);
    this.stopCardTicker();
  }

  getTickIntervalMs() {
    return 250;
  }

  tick() {
    // Timer logic
    // Check if the player is the lobby creator
    if (!this.isLobbyCreator && this.game.myPlayer()?.isLobbyCreator()) {
      this.isLobbyCreator = true;
      this.requestUpdate();
    }

    if (this.game.inSpawnPhase()) {
      // Singleplayer has no spawn timer (SpawnTimerExecution isn't added), so
      // the spawn phase doesn't count down — keep the old static display.
      if (this.game.config().gameConfig().gameType === GameType.Singleplayer) {
        const maxTimerValue = this.game.config().gameConfig().maxTimerValue;
        this.timer =
          maxTimerValue !== null && maxTimerValue !== undefined
            ? maxTimerValue * 60
            : 0;
        return;
      }
      const spawnPhaseDurationTicks = this.game.config().numSpawnPhaseTurns();
      const currentTicks = this.game.ticks();
      const remainingTicks = spawnPhaseDurationTicks - currentTicks;
      const remainingSeconds = Math.ceil(remainingTicks / 10);
      this.timer = Math.max(0, remainingSeconds);
      return;
    }

    const elapsedSeconds = Math.floor(this.game.elapsedGameSeconds());

    if (this.hasWinner) {
      return;
    }

    const maxTimerValue = this.game.config().gameConfig().maxTimerValue;
    if (maxTimerValue !== null && maxTimerValue !== undefined) {
      this.timer = Math.max(0, maxTimerValue * 60 - elapsedSeconds);
      this.maybeShowOneMinuteWarning();
    } else {
      this.timer = elapsedSeconds;
    }
  }

  // Handing the notice to the heads-up toast layer means that layer owns the
  // dismissal timer, so there's nothing for us to tear down on disconnect or
  // when the game ends.
  private maybeShowOneMinuteWarning(): void {
    if (
      !this.hasWinner &&
      !this.game.inSpawnPhase() &&
      this.timer > 0 &&
      this.timer <= LAST_MINUTE_SECONDS &&
      !this.hasShownOneMinuteWarning
    ) {
      this.hasShownOneMinuteWarning = true;
      showToast(
        translateText("game_timer.one_minute_remaining"),
        "red",
        ONE_MINUTE_WARNING_DURATION_MS,
      );
    }
  }

  private updateParentOffset(): void {
    const offset =
      (this.spawnBarVisible ? 7 : 0) + (this.immunityBarVisible ? 7 : 0);
    const parent = this.parentElement as HTMLElement;
    if (parent) {
      parent.style.marginTop = `${offset}px`;
    }
  }

  private secondsToHms = (d: number): string => {
    const pad = (n: number) => (n < 10 ? `0${n}` : n);

    const h = Math.floor(d / 3600);
    const m = Math.floor((d % 3600) / 60);
    const s = Math.floor((d % 3600) % 60);

    if (h !== 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    } else {
      return `${pad(m)}:${pad(s)}`;
    }
  };

  private toggleReplayPanel(): void {
    this._isReplayVisible = !this._isReplayVisible;
    this.eventBus.emit(
      new ShowReplayPanelEvent(this._isReplayVisible, this._isSinglePlayer),
    );
  }

  private startCardTicker() {
    if (!isMobileShell() || this.cardTicker !== null) return;
    this.cardTicker = setInterval(() => this.requestUpdate(), 1000);
  }

  private stopCardTicker() {
    if (this.cardTicker !== null) clearInterval(this.cardTicker);
    this.cardTicker = null;
  }

  private onPauseButtonClick() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      gamePortal.gameplayStop();
      // Pausing keeps the game: the card then says "Saved 0 s ago".
      if (isMobileShell() && this._isSinglePlayer) {
        void activeAutoSaver()?.saveNow();
        this.startCardTicker();
      }
    } else {
      gamePortal.gameplayStart();
      this.resumed = null;
      this.stopCardTicker();
    }
    this.eventBus.emit(new PauseGameIntentEvent(this.isPaused));
    this.requestUpdate();
  }

  private async onNewLobbyButtonClick() {
    if (this.newLobbyRequested) return;
    // Confirm so a stray click next to pause/exit doesn't yank everyone into a
    // new lobby mid-game.
    const isConfirmed = await showInGameConfirm(
      translateText("new_lobby_prompt.confirm"),
      { variant: "warning" },
    );
    if (!isConfirmed) return;
    if (this.newLobbyRequested) return; // clicked again while confirming
    this.newLobbyRequested = true;
    this.requestUpdate();
    try {
      // The worker mints the successor lobby and has the current game
      // broadcast its id, so everyone else gets the NewLobbyPrompt. We (the
      // host) navigate straight to the new host view from the response.
      const lobby = await createNextLobby(this.game.gameID());
      const id = lobby.gameID;
      // ?host routes the creator back into the host view on load.
      window.location.href = `${window.location.origin}${ClientEnv.gamePath(id)}?host`;
    } catch (error) {
      console.error("Failed to create successor lobby", error);
      this.newLobbyRequested = false;
      this.requestUpdate();
      void showInGameAlert(translateText("new_lobby_prompt.failed"));
    }
  }

  private async onExitButtonClick() {
    const isAlive = this.game.myPlayer()?.isAlive();
    if (isAlive) {
      const isConfirmed = await showInGameConfirm(
        translateText("help_modal.exit_confirmation"),
      );
      if (!isConfirmed) return;
    }
    await this.leaveGame();
  }

  // EXIT TO HOME, and every other way out of a running game on the phone,
  // keeps the game. If it cannot be saved the game is over: a quit.
  private async keepGameOnExit() {
    const saver = activeAutoSaver();
    if (!isMobileShell() || !this._isSinglePlayer || !saver?.active) return;
    const saved = await Promise.race([
      saver.saveNow(),
      new Promise<boolean>((r) => setTimeout(() => r(false), 3000)),
    ]);
    if (saved) return;
    saver.dispose();
    // An earlier autosave of this game stays, and CONTINUE offers it: the
    // game's end is counted when that save is played out or discarded.
    if (saver.lastSavedAt !== null) return;
    await saver.finish();
    gameEnded("quit", this.game.ticks() / 10, landPercent(this.game));
  }

  // ABANDON: confirmed, clears the save, counts as a quit.
  private async onAbandonClick() {
    const abandon = await confirmGone({
      title: translateText("save.abandon_title"),
      body: translateText("save.abandon_body"),
      keep: translateText("save.keep_playing"),
      destroy: translateText("save.abandon"),
    });
    if (!abandon) return;
    await activeAutoSaver()?.finish();
    gameEnded("quit", this.game.ticks() / 10, landPercent(this.game));
    await this.leaveGame();
  }

  private async leaveGame() {
    await this.keepGameOnExit();
    await gamePortal.requestMidgameAd();
    await gamePortal.gameplayStop();
    // redirect to the home page
    window.location.href = homeHref();
  }

  private onSettingsButtonClick() {
    this.eventBus.emit(
      new ShowSettingsModalEvent(true, this._isSinglePlayer, this.isPaused),
    );
  }

  private onFullscreenButtonClick() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Failed to enter fullscreen:", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn("Failed to exit fullscreen:", err);
      });
    }
  }

  render() {
    if (this.game === undefined) return html``;
    if (isMobileShell()) return this.renderShell();

    const maxTimerValue = this.game.config().gameConfig().maxTimerValue;
    const isEndTimerActive =
      maxTimerValue !== undefined &&
      maxTimerValue !== null &&
      !this.game.inSpawnPhase() &&
      !this.hasWinner &&
      this.timer > 0;
    const isLastMinute = isEndTimerActive && this.timer <= LAST_MINUTE_SECONDS;
    const shouldFlashTimer =
      isEndTimerActive && this.timer <= FLASH_TIMER_SECONDS;
    const shouldFlashSidebar =
      isEndTimerActive && this.timer <= FLASH_SIDEBAR_SECONDS;

    const timerClass = shouldFlashTimer
      ? "game-end-timer-flash"
      : isLastMinute
        ? "game-end-timer-last-minute"
        : "";

    return html`
      <style>
        @keyframes game-end-timer-text-flash {
          0%,
          100% {
            color: rgb(248 113 113);
          }
          50% {
            color: white;
          }
        }
        @keyframes game-end-timer-sidebar-flash {
          0%,
          100% {
            background-color: rgb(0 0 0 / 0.92);
          }
          50% {
            background-color: rgb(185 28 28 / 0.96);
          }
        }
        .game-end-timer-last-minute {
          color: rgb(248 113 113);
        }
        .game-end-timer-flash {
          animation: game-end-timer-text-flash 1s ease-in-out infinite;
        }
        .game-end-timer-sidebar-flash {
          animation: game-end-timer-sidebar-flash 1s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .game-end-timer-flash {
            animation: none;
            color: white;
          }
          .game-end-timer-sidebar-flash {
            animation: none;
            background-color: rgb(185 28 28 / 0.96);
          }
        }
      </style>
      <aside
        class=${`w-fit flex flex-row items-center gap-3 py-2 px-3 bg-gray-800/92 backdrop-blur-sm shadow-xs rounded-bl-lg transition-transform duration-300 ease-out transform text-white ${shouldFlashSidebar ? "game-end-timer-sidebar-flash" : ""} ${
          this._isVisible ? "translate-x-0" : "translate-x-full"
        }`}
        @contextmenu=${(e: Event) => e.preventDefault()}
      >
        <!-- In-game time -->
        <div data-game-timer class=${timerClass}>
          ${this.secondsToHms(this.timer)}
        </div>

        <!-- Buttons -->
        ${this.maybeRenderReplayButtons()}

        <div class="cursor-pointer" @click=${this.onSettingsButtonClick}>
          <img src=${settingsIcon} alt="settings" width="20" height="20" />
        </div>

        ${document.fullscreenEnabled && !this.hideFullscreenButton
          ? html`<div
              class="cursor-pointer"
              @click=${this.onFullscreenButtonClick}
            >
              <img
                src=${this.isFullscreen ? exitFullscreenIcon : fullscreenIcon}
                alt=${this.isFullscreen
                  ? translateText("fullscreen.exit")
                  : translateText("fullscreen.enter")}
                width="20"
                height="20"
              />
            </div>`
          : ""}

        <div class="cursor-pointer" @click=${this.onExitButtonClick}>
          <img src=${exitIcon} alt="exit" width="20" height="20" />
        </div>
      </aside>
      <doomsday-clock-panel
        .game=${this.game}
        .hasWinner=${this.hasWinner}
        .refreshKey=${this.timer}
      ></doomsday-clock-panel>
      <overtime-panel
        .game=${this.game}
        .hasWinner=${this.hasWinner}
        .refreshKey=${this.timer}
      ></overtime-panel>
    `;
  }

  // Mobile app: only the timer and a pause button stay on the map; speed,
  // settings and quit live in the pause overlay.
  private renderShell() {
    const canPause = this._isSinglePlayer || this.game.config().isReplay();
    return html`
      <div class="wc-topright ${this._isVisible ? "" : "wc-hidden"}">
        <div class="wc-plate wc-num wc-timer" data-game-timer>
          ${this.secondsToHms(this.timer)}
        </div>
        ${canPause
          ? html`<button
              class="wc-btn wc-btn-gold wc-pause"
              aria-label=${translateText("mobile.pause")}
              @click=${this.onPauseButtonClick}
            >
              <img src=${pauseIcon} alt="" aria-hidden="true" />
            </button>`
          : html`<button
              class="wc-btn wc-btn-steel wc-pause"
              aria-label=${translateText("win_modal.exit")}
              @click=${this.onExitButtonClick}
            >
              <img src=${exitIcon} alt="" aria-hidden="true" />
            </button>`}
      </div>
      ${this.isPaused ? this.renderPauseOverlay() : ""}
    `;
  }

  private renderPauseOverlay() {
    const speeds: [ReplaySpeedMultiplier, string][] = [
      [ReplaySpeedMultiplier.slow, "×0.5"],
      [ReplaySpeedMultiplier.normal, "×1"],
      [ReplaySpeedMultiplier.fast, "×2"],
      [
        ReplaySpeedMultiplier.fastest,
        translateText("replay_panel.fastest_game_speed"),
      ],
    ];
    return html`
      <div
        class="wc-scrim"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wc-pause-title"
      >
        <div class="wc-plate wc-pause-card">
          ${this.renderResumedHeader()}
          <h2 id="wc-pause-title" class="wc-pause-title">
            ${translateText("mobile.paused")}
          </h2>
          <button
            class="wc-btn wc-btn-gold wc-pause-resume"
            @click=${this.onPauseButtonClick}
          >
            ${translateText("mobile.resume")}
          </button>
          ${this.renderSavedLine()}
          <div class="wc-label">${translateText("mobile.game_speed")}</div>
          <div class="wc-speed" role="group">
            ${speeds.map(
              ([value, label]) =>
                html`<button
                  class="wc-btn ${this.speed === value
                    ? "wc-btn-gold"
                    : "wc-btn-steel"}"
                  aria-pressed=${this.speed === value}
                  @click=${() =>
                    this.eventBus.emit(new ReplaySpeedChangeEvent(value))}
                >
                  ${label}
                </button>`,
            )}
          </div>
          <div class="wc-pause-row">
            <button
              class="wc-btn wc-btn-steel"
              @click=${this.onSettingsButtonClick}
            >
              ${translateText("main.settings")}
            </button>
            <button
              class="wc-btn wc-btn-steel"
              @click=${() => void this.leaveGame()}
            >
              ${translateText("save.exit_home")}
            </button>
            <button
              class="wc-btn wc-btn-steel"
              @click=${() => void this.onAbandonClick()}
            >
              ${translateText("save.abandon")}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // "RESUMED · TURN N · SAVED N MIN AGO", until the first RESUME tap; then
  // the catch-up progress, and once caught up where the player stands.
  private renderResumedHeader() {
    if (!this.resumed) return nothing;
    const minutes = Math.max(
      0,
      Math.round((Date.now() - this.resumed.savedAt) / 60000),
    );
    return html`<p class="wc-label wc-resumed">
        ${translateText("save.resumed_header", {
          turn: this.resumed.turn,
          minutes,
        })}
      </p>
      ${this.game.isCatchingUp()
        ? html`<p class="wc-saved" role="status">
            ${translateText("save.catching_up_pct", {
              percent: catchUpPercent(this.game.ticks(), this.resumed.turn),
            })}
          </p>`
        : this.renderStanding()}`;
  }

  // "You're #2 with 31% of the land."
  private renderStanding() {
    const land = landProgress(this.game);
    const me = this.game.myPlayer();
    if (land === null || me === null) return nothing;
    const mine = me.numTilesOwned();
    const rank =
      1 +
      this.game.players().filter((p) => p.isAlive() && p.numTilesOwned() > mine)
        .length;
    return html`<p class="wc-saved" role="status">
      ${translateText("save.resume_standing", {
        rank,
        percent: Math.round(land.share),
      })}
    </p>`;
  }

  // "Saved N s ago", or Ember "Saving paused" after three failed writes.
  private renderSavedLine() {
    const saver = activeAutoSaver();
    if (!saver?.active) return nothing;
    if (saver.savingPaused) {
      return html`<p class="wc-saved wc-saved-paused" role="status">
        ${translateText("save.saving_paused")}
      </p>`;
    }
    const at = saver.lastSavedAt;
    if (at === null) return nothing;
    return html`<p class="wc-saved">
      ${translateText("save.saved_ago", {
        seconds: Math.max(0, Math.round((Date.now() - at) / 1000)),
      })}
    </p>`;
  }

  maybeRenderReplayButtons() {
    const isReplayOrSingleplayer =
      this._isSinglePlayer || this.game?.config()?.isReplay();
    const showPauseButton =
      isReplayOrSingleplayer ||
      (this.isLobbyCreator && !this.game.config().listed);
    // The host of a private lobby can start a fresh lobby at any time, without
    // waiting to die or for the game to end.
    const showNewLobbyButton = this.isLobbyCreator && this.isPrivateLobby;

    return html`
      ${isReplayOrSingleplayer
        ? html`
            <div class="cursor-pointer" @click=${this.toggleReplayPanel}>
              <img
                src=${FastForwardIconSolid}
                alt="replay"
                width="20"
                height="20"
              />
            </div>
          `
        : ""}
      ${showPauseButton
        ? html`
            <div class="cursor-pointer" @click=${this.onPauseButtonClick}>
              <img
                src=${this.isPaused ? playIcon : pauseIcon}
                alt="play/pause"
                width="20"
                height="20"
              />
            </div>
          `
        : ""}
      ${showNewLobbyButton
        ? html`
            <div
              class="cursor-pointer ${this.newLobbyRequested
                ? "opacity-50 pointer-events-none"
                : ""}"
              @click=${this.onNewLobbyButtonClick}
              title=${translateText("win_modal.new_lobby")}
            >
              <img
                src=${newLobbyIcon}
                alt=${translateText("win_modal.new_lobby")}
                width="20"
                height="20"
              />
            </div>
          `
        : ""}
    `;
  }
}
