import { describe, expect, test } from "vitest";
import {
  animationActionSchema,
  eventActionSchema,
  eventTriggerSchema,
  commandStringSchema,
  isCompleteCommandString,
} from "./animation-schema";

describe("animation schemas", () => {
  test("accepts event action with triggers and command", () => {
    const parsed = eventActionSchema.parse({
      type: "event",
      target: "self",
      triggers: [{ kind: "click" }],
      command: "play",
      animations: [
        {
          timing: { duration: { type: "unit", value: 100, unit: "ms" } },
          keyframes: [
            { styles: { opacity: { type: "unparsed", value: "0" } } },
          ],
        },
      ],
    });

    expect(parsed.command).toBe("play");
    expect(parsed.triggers[0]?.kind).toBe("click");
  });

  test("discriminated union still accepts scroll/view actions", () => {
    expect(
      animationActionSchema.parse({
        type: "scroll",
        animations: [],
      })
    ).toMatchObject({ type: "scroll" });

    expect(
      animationActionSchema.parse({
        type: "view",
        animations: [],
      })
    ).toMatchObject({ type: "view" });
  });

  describe("HTML Invoker Commands", () => {
    test("command trigger with valid -- prefix", () => {
      const parsed = eventTriggerSchema.parse({
        kind: "command",
        command: "--play-intro",
      });
      expect(parsed).toEqual({ kind: "command", command: "--play-intro" });
    });

    test("command trigger allows incomplete values during editing", () => {
      // Schema allows incomplete values to support editing flow
      const parsed = eventTriggerSchema.parse({
        kind: "command",
        command: "--", // Incomplete but allowed during editing
      });
      expect(parsed).toEqual({ kind: "command", command: "--" });
    });

    test("isCompleteCommandString validates command strings for rendering", () => {
      // Valid complete command strings
      expect(isCompleteCommandString("--my-command")).toBe(true);
      expect(isCompleteCommandString("--open-modal")).toBe(true);
      expect(isCompleteCommandString("--a")).toBe(true); // 3 chars minimum

      // Invalid/incomplete command strings
      expect(isCompleteCommandString("invalid")).toBe(false); // Missing -- prefix
      expect(isCompleteCommandString("-single")).toBe(false); // Wrong prefix
      expect(isCompleteCommandString("--")).toBe(false); // Too short (2 chars)
      expect(isCompleteCommandString("")).toBe(false); // Empty
    });

    test("commandStringSchema allows any string (validation via isCompleteCommandString)", () => {
      // Schema accepts any string for editing flexibility
      expect(commandStringSchema.parse("--my-command")).toBe("--my-command");
      expect(commandStringSchema.parse("--")).toBe("--");
      expect(commandStringSchema.parse("")).toBe("");
    });

    test("event action with command trigger", () => {
      const parsed = eventActionSchema.parse({
        type: "event",
        triggers: [{ kind: "command", command: "--toggle-menu" }],
        command: "play",
        animations: [
          {
            timing: { duration: { type: "unit", value: 300, unit: "ms" } },
            keyframes: [
              {
                offset: 0,
                styles: { opacity: { type: "unparsed", value: "0" } },
              },
              {
                offset: 1,
                styles: { opacity: { type: "unparsed", value: "1" } },
              },
            ],
          },
        ],
      });

      expect(parsed.triggers[0]).toEqual({
        kind: "command",
        command: "--toggle-menu",
      });
    });

    test("DOM triggers still work (click, keydown, etc.)", () => {
      expect(eventTriggerSchema.parse({ kind: "click" })).toEqual({
        kind: "click",
      });
      expect(
        eventTriggerSchema.parse({ kind: "keydown", key: "Enter" })
      ).toEqual({
        kind: "keydown",
        key: "Enter",
      });
      expect(eventTriggerSchema.parse({ kind: "pointerenter" })).toEqual({
        kind: "pointerenter",
      });
    });
  });
});
