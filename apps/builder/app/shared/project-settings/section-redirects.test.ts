import { describe, expect, test } from "vitest";
import { __testing__ } from "./section-redirects";

const { deleteRedirect } = __testing__;

describe("deleteRedirect", () => {
  test("deletes the selected redirect object instead of relying on filtered index", () => {
    const first = { old: "/first", new: "/one", status: "301" } as const;
    const second = { old: "/second", new: "/two", status: "301" } as const;
    const third = { old: "/third", new: "/three", status: "301" } as const;

    expect(deleteRedirect([first, second, third], third)).toEqual([
      first,
      second,
    ]);
  });
});
