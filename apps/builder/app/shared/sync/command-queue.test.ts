import { describe, test, expect, beforeEach } from "vitest";
import { enqueue, dequeueAll } from "./command-queue";

const makeTx = (id: string) => ({
  id,
  object: "server",
  payload: [{ namespace: "ns", patches: [], revisePatches: [] }],
});

describe("command-queue", () => {
  beforeEach(() => {
    // Drain any leftover commands from previous tests
    dequeueAll();
  });

  // ── dequeueAll ────────────────────────────────────────────────

  describe("dequeueAll", () => {
    test("returns empty array when queue is empty", () => {
      expect(dequeueAll()).toEqual([]);
    });

    test("returns all enqueued commands and clears the queue", () => {
      enqueue({
        type: "setDetails",
        projectId: "p1",
        version: 1,
        buildId: "b1",
        authToken: "tok",
      });

      const first = dequeueAll();
      expect(first).toHaveLength(1);

      const second = dequeueAll();
      expect(second).toHaveLength(0);
    });
  });

  // ── enqueue: setDetails ───────────────────────────────────────

  describe("enqueue — setDetails", () => {
    test("pushes setDetails without merging", () => {
      enqueue({
        type: "setDetails",
        projectId: "p1",
        version: 1,
        buildId: "b1",
        authToken: "tok",
      });
      enqueue({
        type: "setDetails",
        projectId: "p1",
        version: 2,
        buildId: "b1",
        authToken: "tok",
      });

      const commands = dequeueAll();
      expect(commands).toHaveLength(2);
      expect(commands[0]).toEqual(
        expect.objectContaining({ type: "setDetails", version: 1 })
      );
      expect(commands[1]).toEqual(
        expect.objectContaining({ type: "setDetails", version: 2 })
      );
    });

    test("setDetails for different projects are kept separate", () => {
      enqueue({
        type: "setDetails",
        projectId: "p1",
        version: 1,
        buildId: "b1",
        authToken: undefined,
      });
      enqueue({
        type: "setDetails",
        projectId: "p2",
        version: 1,
        buildId: "b2",
        authToken: undefined,
      });

      const commands = dequeueAll();
      expect(commands).toHaveLength(2);
    });
  });

  // ── enqueue: transactions merging ─────────────────────────────

  describe("enqueue — transactions merging", () => {
    test("merges consecutive transactions for the same project", () => {
      const tx1 = makeTx("t1");
      const tx2 = makeTx("t2");

      enqueue({ type: "transactions", projectId: "p1", transactions: [tx1] });
      enqueue({ type: "transactions", projectId: "p1", transactions: [tx2] });

      const commands = dequeueAll();
      expect(commands).toHaveLength(1);
      expect(commands[0].type).toBe("transactions");
      if (commands[0].type === "transactions") {
        expect(commands[0].transactions).toEqual([tx1, tx2]);
      }
    });

    test("does not merge transactions for different projects", () => {
      enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("t1")],
      });
      enqueue({
        type: "transactions",
        projectId: "p2",
        transactions: [makeTx("t2")],
      });

      const commands = dequeueAll();
      expect(commands).toHaveLength(2);
    });

    test("setDetails between transactions prevents merging", () => {
      enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("t1")],
      });
      enqueue({
        type: "setDetails",
        projectId: "p1",
        version: 1,
        buildId: "b1",
        authToken: undefined,
      });
      enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("t2")],
      });

      const commands = dequeueAll();
      // The setDetails breaks the merge chain, so we get 3 commands
      expect(commands).toEqual([
        expect.objectContaining({ type: "transactions", projectId: "p1" }),
        expect.objectContaining({ type: "setDetails", projectId: "p1" }),
        expect.objectContaining({ type: "transactions", projectId: "p1" }),
      ]);
    });

    test("merges multiple transactions in a single batch", () => {
      const tx1 = makeTx("t1");
      const tx2 = makeTx("t2");
      const tx3 = makeTx("t3");

      enqueue({ type: "transactions", projectId: "p1", transactions: [tx1] });
      enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [tx2, tx3],
      });

      const commands = dequeueAll();
      expect(commands).toHaveLength(1);
      if (commands[0].type === "transactions") {
        expect(commands[0].transactions).toEqual([tx1, tx2, tx3]);
      }
    });

    test("does not merge across another project's pending transactions", () => {
      enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("t1")],
      });
      enqueue({
        type: "transactions",
        projectId: "p2",
        transactions: [makeTx("t2")],
      });
      enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("t3")],
      });

      const commands = dequeueAll();
      expect(commands).toHaveLength(3);
      expect(commands).toEqual([
        expect.objectContaining({ type: "transactions", projectId: "p1" }),
        expect.objectContaining({ type: "transactions", projectId: "p2" }),
        expect.objectContaining({ type: "transactions", projectId: "p1" }),
      ]);
    });

    test("empty queue followed by a transactions command is not merged", () => {
      enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("t1")],
      });

      const commands = dequeueAll();
      expect(commands).toHaveLength(1);
      if (commands[0].type === "transactions") {
        expect(commands[0].transactions).toHaveLength(1);
      }
    });
  });

  // ── Mixed command ordering ────────────────────────────────────

  describe("mixed commands", () => {
    test("setDetails then transactions preserves both", () => {
      enqueue({
        type: "setDetails",
        projectId: "p1",
        version: 1,
        buildId: "b1",
        authToken: undefined,
      });
      enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("t1")],
      });

      const commands = dequeueAll();
      expect(commands).toHaveLength(2);
      expect(commands[0]).toEqual(
        expect.objectContaining({ type: "setDetails" })
      );
      expect(commands[1]).toEqual(
        expect.objectContaining({ type: "transactions" })
      );
    });

    test("multiple dequeueAll calls return disjoint results", () => {
      enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("t1")],
      });
      const first = dequeueAll();

      enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("t2")],
      });
      const second = dequeueAll();

      expect(first).toHaveLength(1);
      expect(second).toHaveLength(1);
      if (
        first[0].type === "transactions" &&
        second[0].type === "transactions"
      ) {
        expect(first[0].transactions[0].id).toBe("t1");
        expect(second[0].transactions[0].id).toBe("t2");
      }
    });
  });
});
