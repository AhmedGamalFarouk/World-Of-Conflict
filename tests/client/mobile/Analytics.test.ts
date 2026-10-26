import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  analyticsAvailable,
  analyticsConsent,
  flushAnalytics,
  resetAnalyticsForTests,
  setAnalyticsConsent,
  track,
  trackError,
} from "../../../src/client/mobile/Analytics";

const fetchMock = vi.fn();
const QUEUE = "wc.analytics.queue";
const queued = () => JSON.parse(localStorage.getItem(QUEUE) ?? "[]");

beforeEach(() => {
  localStorage.clear();
  resetAnalyticsForTests();
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("__WC_APTABASE_KEY__", "A-EU-1234567890");
});
afterEach(() => vi.unstubAllGlobals());

describe("Analytics", () => {
  it("is off in a build without a key, and before consent", async () => {
    vi.stubGlobal("__WC_APTABASE_KEY__", "");
    expect(analyticsAvailable()).toBe(false);
    setAnalyticsConsent(true);
    track("app_open");
    vi.stubGlobal("__WC_APTABASE_KEY__", "A-EU-1234567890");
    setAnalyticsConsent(false);
    track("app_open");
    localStorage.clear();
    expect(analyticsConsent()).toBeNull();
    track("app_open");
    await flushAnalytics();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the Aptabase event shape to the key's region", async () => {
    setAnalyticsConsent(true);
    track("game_end", { reason: "win", minutes: 7 });
    await flushAnalytics();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://eu.aptabase.com/api/v0/event");
    expect(init.headers["App-Key"]).toBe("A-EU-1234567890");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      eventName: "game_end",
      props: { reason: "win", minutes: 7 },
      systemProps: { appVersion: "dev", isDebug: true },
    });
    expect(body.sessionId).toMatch(/^\d{18}$/);
    expect(queued()).toEqual([]);
  });

  it("keeps events made offline and sends them later, oldest first", async () => {
    setAnalyticsConsent(true);
    fetchMock.mockRejectedValue(new TypeError("offline"));
    track("a");
    track("b");
    await flushAnalytics();
    expect(queued().map((e: { eventName: string }) => e.eventName)).toEqual([
      "a",
      "b",
    ]);
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await flushAnalytics();
    const sent = fetchMock.mock.calls
      .slice(-2)
      .map(([, init]) => JSON.parse(init.body).eventName);
    expect(sent).toEqual(["a", "b"]);
    expect(queued()).toEqual([]);
  });

  it("drops an event the server rejects, and clears the queue on opt-out", async () => {
    setAnalyticsConsent(true);
    fetchMock.mockResolvedValue(new Response(null, { status: 400 }));
    track("bad");
    await flushAnalytics();
    expect(queued()).toEqual([]);
    fetchMock.mockRejectedValue(new TypeError("offline"));
    track("later");
    await flushAnalytics();
    setAnalyticsConsent(false);
    expect(localStorage.getItem(QUEUE)).toBeNull();
  });

  it("sends each error code once per launch", async () => {
    setAnalyticsConsent(true);
    trackError("js.error");
    await flushAnalytics();
    trackError("js.error");
    trackError("save.damaged");
    await flushAnalytics();
    const codes = fetchMock.mock.calls.map(
      ([, init]) => JSON.parse(init.body).props.code,
    );
    expect(codes).toEqual(["js.error", "save.damaged"]);
  });
});
