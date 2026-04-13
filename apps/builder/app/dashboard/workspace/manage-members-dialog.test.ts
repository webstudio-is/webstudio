import { describe, test, expect } from "vitest";
import { __testing__ } from "./manage-members-dialog";

const { computeAvailableSeats } = __testing__;

const owner = {
  userId: "owner-1",
  email: "owner@example.com",
  username: "owner",
};

const makeData = ({
  maxSeats = 5,
  members = [] as {
    userId: string;
    email: string;
    relation: "administrators" | "builders" | "editors" | "viewers";
    createdAt: string;
    username: string;
  }[],
  pendingInvites = [] as {
    notificationId: string;
    recipientId: string;
    email: string;
    relation: "administrators" | "builders" | "editors" | "viewers";
    createdAt: string;
  }[],
} = {}) => ({ owner, members, pendingInvites, maxSeats });

describe("computeAvailableSeats", () => {
  test("returns undefined when membersData is undefined", () => {
    expect(computeAvailableSeats(undefined, [])).toBeUndefined();
  });

  test("returns maxSeats when workspace is empty", () => {
    expect(computeAvailableSeats(makeData({ maxSeats: 5 }), [])).toBe(5);
  });

  test("subtracts accepted members", () => {
    const members = [
      {
        userId: "u1",
        email: "a@example.com",
        relation: "editors" as const,
        createdAt: "",
        username: "",
      },
      {
        userId: "u2",
        email: "b@example.com",
        relation: "viewers" as const,
        createdAt: "",
        username: "",
      },
    ];
    expect(computeAvailableSeats(makeData({ maxSeats: 5, members }), [])).toBe(
      3
    );
  });

  test("subtracts confirmed pending invites", () => {
    const pendingInvites = [
      {
        notificationId: "n1",
        recipientId: "r1",
        email: "c@example.com",
        relation: "editors" as const,
        createdAt: "",
      },
    ];
    expect(
      computeAvailableSeats(makeData({ maxSeats: 5, pendingInvites }), [])
    ).toBe(4);
  });

  test("subtracts optimistic pending entries not yet confirmed", () => {
    const optimistic = [
      {
        notificationId: "opt-1",
        email: "new@example.com",
        relation: "viewers" as const,
      },
    ];
    expect(computeAvailableSeats(makeData({ maxSeats: 5 }), optimistic)).toBe(
      4
    );
  });

  test("does not double-count optimistic entry already confirmed as pending invite", () => {
    const pendingInvites = [
      {
        notificationId: "n1",
        recipientId: "r1",
        email: "dup@example.com",
        relation: "editors" as const,
        createdAt: "",
      },
    ];
    const optimistic = [
      {
        notificationId: "opt-1",
        email: "dup@example.com",
        relation: "editors" as const,
      },
    ];
    // confirmed invite already counts; optimistic for same email is ignored
    expect(
      computeAvailableSeats(
        makeData({ maxSeats: 5, pendingInvites }),
        optimistic
      )
    ).toBe(4);
  });

  test("does not double-count optimistic entry already in accepted members", () => {
    const members = [
      {
        userId: "u1",
        email: "member@example.com",
        relation: "editors" as const,
        createdAt: "",
        username: "",
      },
    ];
    const optimistic = [
      {
        notificationId: "opt-1",
        email: "member@example.com",
        relation: "editors" as const,
      },
    ];
    expect(
      computeAvailableSeats(makeData({ maxSeats: 5, members }), optimistic)
    ).toBe(4);
  });

  test("returns 0 when all seats are used", () => {
    const members = [
      {
        userId: "u1",
        email: "a@example.com",
        relation: "editors" as const,
        createdAt: "",
        username: "",
      },
    ];
    expect(computeAvailableSeats(makeData({ maxSeats: 1, members }), [])).toBe(
      0
    );
  });

  test("returns negative when seats are exceeded", () => {
    const members = [
      {
        userId: "u1",
        email: "a@example.com",
        relation: "editors" as const,
        createdAt: "",
        username: "",
      },
      {
        userId: "u2",
        email: "b@example.com",
        relation: "viewers" as const,
        createdAt: "",
        username: "",
      },
    ];
    const optimistic = [
      {
        notificationId: "opt-1",
        email: "new@example.com",
        relation: "viewers" as const,
      },
    ];
    // 1 maxSeat − 2 members − 1 optimistic = -2
    expect(
      computeAvailableSeats(makeData({ maxSeats: 1, members }), optimistic)
    ).toBe(-2);
  });

  test("confirmedMaxSeats overrides stale server maxSeats when higher", () => {
    // Scenario: user confirmed paying for 2 extra seats but webhook hasn't fired.
    // Server still returns maxSeats=3, but confirmedMaxSeats=5.
    const members = [
      {
        userId: "u1",
        email: "a@example.com",
        relation: "editors" as const,
        createdAt: "",
        username: "",
      },
    ];
    const pendingInvites = [
      {
        notificationId: "n1",
        recipientId: "r1",
        email: "b@example.com",
        relation: "editors" as const,
        createdAt: "",
      },
      {
        notificationId: "n2",
        recipientId: "r2",
        email: "c@example.com",
        relation: "editors" as const,
        createdAt: "",
      },
    ];
    // maxSeats=3 (stale), but 1 member + 2 pending = 3 occupied → would be 0 available.
    // confirmedMaxSeats=5 → effectiveMax=5, available = 5-1-2 = 2.
    expect(
      computeAvailableSeats(
        makeData({ maxSeats: 3, members, pendingInvites }),
        [],
        5
      )
    ).toBe(2);
  });

  test("confirmedMaxSeats is ignored when server maxSeats is already higher", () => {
    // Webhook fired: server returns maxSeats=5, confirmedMaxSeats=4 (stale override).
    expect(computeAvailableSeats(makeData({ maxSeats: 5 }), [], 4)).toBe(5);
  });
});
