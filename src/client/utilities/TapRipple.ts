/**
 * Brief expanding ring at a screen point: amber when a tap did something,
 * red when it hit nothing actionable.
 */
export function showTapRipple(x: number, y: number, ok: boolean): void {
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;" +
    "border-radius:50%;pointer-events:none;z-index:9999;" +
    `left:${x}px;top:${y}px;border:3px solid ${ok ? "#f59e0b" : "#ef4444"}`;
  document.body.appendChild(el);
  el.animate(
    [
      { transform: "scale(0.3)", opacity: 1 },
      { transform: "scale(1.4)", opacity: 0 },
    ],
    { duration: 350, easing: "ease-out" },
  ).onfinish = () => el.remove();
}
