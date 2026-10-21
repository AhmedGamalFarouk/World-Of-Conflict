// The one place the app vibrates, so the in-app "Vibration" setting is a real
// off switch (Android's own per-app vibration switch is not reliable).
import { UserSettings } from "../UserSettings";

const settings = new UserSettings();

/** Attack sent, attack plate shown, radial slice crossed. No-op when off. */
export function vibrate(ms: number): void {
  if (!settings.vibration()) return;
  navigator.vibrate?.(ms);
}
