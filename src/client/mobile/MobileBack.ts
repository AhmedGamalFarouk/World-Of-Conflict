import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { showInGameConfirm } from "../InGameModal";
import { translateText } from "../Utils";
import { aboutBack } from "./About";
import { backToMenu, isFatalShown } from "./FatalScreen";

/** Fired on window when Android back is pressed during a game. */
export const MOBILE_BACK_EVENT = "mobile-back";

/** Every modal (BaseModal, the in-game settings menu) closes on Escape. */
export function dispatchEscape(): void {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", code: "Escape" }),
  );
}

/**
 * Android back. In a game, GameRightSidebar owns it (close the menu, else
 * pause and ask to leave). On the home screen: close the open page, else
 * ask before leaving the app. Without a listener Capacitor would exit the
 * app outright, since the modal router replaces history instead of pushing.
 */
export async function onBackButton(exitApp: () => void): Promise<void> {
  // The mobile overlays sit above everything else, so they go first.
  if (isFatalShown()) {
    backToMenu();
  } else if (aboutBack()) {
    return;
  } else if (document.body.classList.contains("in-game")) {
    window.dispatchEvent(new Event(MOBILE_BACK_EVENT));
  } else if (window.location.hash.startsWith("#modal=")) {
    dispatchEscape();
  } else if (
    await showInGameConfirm(translateText("help_modal.exit_confirmation"))
  ) {
    exitApp();
  }
}

export function installBackButton(): void {
  if (!Capacitor.isNativePlatform()) return;
  void App.addListener("backButton", () => {
    void onBackButton(() => void App.exitApp());
  });
}
