// The one place the app vibrates, so the in-app "Vibration" setting is a real
// off switch (Android's own per-app vibration switch is not reliable).
import { Capacitor } from "@capacitor/core";
import { Haptics } from "@capacitor/haptics";
import { UserSettings } from "../UserSettings";

const settings = new UserSettings();

/**
 * A touch tick: attack sent, radial slice crossed. Android files the
 * WebView's vibrations as touch feedback, so the phone's own touch-feedback
 * switch silences these too. No-op when off.
 */
export function vibrate(ms: number): void {
  if (!settings.vibration()) return;
  navigator.vibrate?.(ms);
}

/**
 * An alarm the player must feel: an event plate showing. The native plugin
 * vibrates without the touch usage, so it still plays when the phone's touch
 * feedback is off. No-op when off.
 */
export function vibrateAlert(ms: number): void {
  if (!settings.vibration()) return;
  if (!Capacitor.isNativePlatform()) {
    navigator.vibrate?.(ms);
    return;
  }
  Haptics.vibrate({ duration: ms }).catch(() => navigator.vibrate?.(ms));
}
