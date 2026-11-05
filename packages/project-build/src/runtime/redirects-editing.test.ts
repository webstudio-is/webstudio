import { expect, test } from "vitest";
import type { PageRedirect } from "@webstudio-is/sdk";
import { createDefaultPages } from "../shared/pages-utils";
import { applyBuilderPatchTransactions } from "../state/patch";
import { setRedirects } from "./project-settings";
import { BuilderRuntimeError } from "./errors";

const current = { old: "/remove", new: "/target", status: "301" } as const;

test.each([
  [{ old: "/legacy", new: "/blog/:slug", status: "301" }],
  [{ old: "/docs/:slug*", new: "/docs", status: "302" }],
  [
    { old: "/duplicate", new: "/first" },
    { old: "/duplicate#old", new: "/second" },
  ],
] satisfies PageRedirect[][])(
  "preserves saved legacy redirects while editing unrelated entries: %j",
  (...legacy) => {
    const state = {
      pages: {
        ...createDefaultPages({ rootInstanceId: "root", homePageId: "home" }),
        redirects: [...legacy, current],
      },
    };
    const input = {
      redirects: [
        ...structuredClone(legacy),
        { old: "/new", new: "/valid", status: "302" as const },
      ],
    };
    const mutation = setRedirects(state, input);
    const updated = applyBuilderPatchTransactions(state, [
      { id: "edit", payload: mutation.payload },
    ]).state;
    expect(updated.pages?.redirects).toEqual(input.redirects);
    expect(state.pages.redirects).toEqual([...legacy, current]);
    expect(() =>
      setRedirects(updated, {
        redirects: [
          ...input.redirects,
          { old: "/new#fragment", new: "/another" },
        ],
      })
    ).toThrow(expect.objectContaining({ code: "CONFLICT" }));
    expect(() =>
      setRedirects(updated, {
        redirects: [
          ...input.redirects,
          { old: "/invalid/:slug*", new: "/target" },
        ],
      })
    ).toThrow(expect.objectContaining({ code: "BAD_REQUEST" }));
    expect(() =>
      setRedirects(updated, {
        redirects: [
          ...input.redirects,
          { old: "/invalid", new: "/target/:missing" },
        ],
      })
    ).toThrow(expect.objectContaining({ code: "BAD_REQUEST" }));
    const second = setRedirects(updated, {
      redirects: [...structuredClone(legacy), current],
    });
    expect(
      applyBuilderPatchTransactions(updated, [
        { id: "repeat", payload: second.payload },
      ]).state.pages?.redirects
    ).toEqual([...legacy, current]);
  }
);

test("only exact entries in actual saved state receive legacy compatibility", () => {
  const legacy = { old: "/legacy", new: "/blog/:slug", status: "301" } as const;
  const state = {
    pages: {
      ...createDefaultPages({ rootInstanceId: "root", homePageId: "home" }),
      redirects: [legacy, current],
    },
  };
  const saved = applyBuilderPatchTransactions(state, [
    {
      id: "delete-unrelated",
      payload: setRedirects(state, { redirects: [{ ...legacy }] }).payload,
    },
  ]).state;
  expect(saved.pages?.redirects).toEqual([legacy]);
  expect(() =>
    setRedirects(saved, { redirects: [{ ...legacy, status: "302" }] })
  ).toThrow(expect.objectContaining({ code: "BAD_REQUEST" }));
  const removed = applyBuilderPatchTransactions(saved, [
    {
      id: "remove-legacy",
      payload: setRedirects(saved, { redirects: [] }).payload,
    },
  ]).state;
  expect(() => setRedirects(removed, { redirects: [{ ...legacy }] })).toThrow(
    BuilderRuntimeError
  );
  expect(() =>
    setRedirects(saved, { redirects: [{ ...legacy }, { ...legacy }] })
  ).toThrow(BuilderRuntimeError);
});
