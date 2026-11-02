import { MessageType } from "@openfront/engine-api/game/GameTypes";
import { describe, expect, it } from "vitest";
import { biggestAttacks } from "../../../src/client/hud/layers/AttacksDisplay";
import { mobileFeed } from "../../../src/client/hud/layers/EventsDisplay";

describe("mobileFeed", () => {
  it("keeps the newest three, oldest first, without your own confirmations", () => {
    const e = (createdAt: number, type = MessageType.CHAT, minor = false) => ({
      createdAt,
      type,
      minor,
    });
    const feed = mobileFeed([
      e(5),
      e(1),
      e(9, MessageType.CHAT, true),
      e(8, MessageType.DONATION_SENT),
      e(3, MessageType.NUKE_INBOUND),
      e(4),
    ]);
    expect(feed.map((x) => x.createdAt)).toEqual([3, 4, 5]);
  });
});

describe("biggestAttacks", () => {
  it("lists the biggest first and caps the count", () => {
    const attacks = [{ troops: 10 }, { troops: 300 }, { troops: 50 }];
    expect(biggestAttacks(attacks, 2)).toEqual([
      { troops: 300 },
      { troops: 50 },
    ]);
    expect(attacks[0].troops).toBe(10);
  });
});
