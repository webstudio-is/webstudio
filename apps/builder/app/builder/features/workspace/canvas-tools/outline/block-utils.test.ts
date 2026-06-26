import { describe, expect, test, vi } from "vitest";
import type { WebstudioFragment } from "@webstudio-is/sdk";
import { __testing__ } from "./block-utils";

const { getTemplateTokenConflicts } = __testing__;

const fragment: WebstudioFragment = {
  children: [],
  instances: [],
  assets: [],
  dataSources: [],
  resources: [],
  props: [],
  breakpoints: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [],
};
const targetData = {} as Parameters<
  typeof getTemplateTokenConflicts
>[0]["targetData"];

describe("getTemplateTokenConflicts", () => {
  test("does not scan template token conflicts in content mode", () => {
    const detect = vi.fn(() => []);

    expect(
      getTemplateTokenConflicts({
        fragment,
        targetData,
        contentMode: true,
        detect,
      })
    ).toEqual([]);
    expect(detect).not.toHaveBeenCalled();
  });

  test("delegates template token conflict detection outside content mode", () => {
    const conflicts: ReturnType<typeof getTemplateTokenConflicts> = [];
    const detect = vi.fn(() => conflicts);

    expect(
      getTemplateTokenConflicts({
        fragment,
        targetData,
        contentMode: false,
        detect,
      })
    ).toBe(conflicts);
    expect(detect).toHaveBeenCalledWith({ fragment, targetData });
  });
});
