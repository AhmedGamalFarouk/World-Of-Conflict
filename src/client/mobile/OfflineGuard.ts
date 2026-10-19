// Loaded by its own <script type="module"> ahead of Main.ts in index.html
// (mobile build only), so the guard is in place before any component module
// registers and fetches in connectedCallback. Not an import in Main.ts:
// organize-imports would reorder it.
import "./mobile-theme.css";
import { installOfflineNetworkGuard } from "./MobileShell";

installOfflineNetworkGuard();
