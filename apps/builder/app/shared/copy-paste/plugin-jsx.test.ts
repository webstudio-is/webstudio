import { beforeEach, describe, expect, test, vi } from "vitest";
import { createEmptyWebstudioFragment } from "@webstudio-is/project-build/runtime/component-template";
import { inspectWebstudioJsxFragmentSyntax } from "@webstudio-is/project-build/runtime/jsx/syntax";
import { isLikelyWebstudioJsx, jsx } from "./plugin-jsx";
import { $project } from "../sync/data-stores";

const mocks = vi.hoisted(() => ({
  createJsxFragment: vi.fn(),
  insertWebstudioFragmentAt: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("../trpc/trpc-client", () => ({
  nativeClient: {
    build: {
      createJsxFragment: {
        query: mocks.createJsxFragment,
      },
    },
  },
}));

vi.mock("../instance-utils/insert", () => ({
  insertWebstudioFragmentAt: mocks.insertWebstudioFragmentAt,
}));

vi.mock("../builder-api", () => ({
  builderApi: {
    toast: {
      error: mocks.toastError,
      warn: vi.fn(),
    },
  },
}));

describe("jsx paste plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    $project.set({ id: "project-id" } as never);
  });

  test("detects only Webstudio JSX", () => {
    expect(isLikelyWebstudioJsx("<$.Box />")).toBe(true);
    expect(isLikelyWebstudioJsx("\n  < $ .Box />")).toBe(true);
    expect(isLikelyWebstudioJsx("< $ . Box />")).toBe(true);
    expect(isLikelyWebstudioJsx('<ws.element ws:tag="section" />')).toBe(true);
    expect(isLikelyWebstudioJsx("<radix.Switch />")).toBe(true);
    expect(isLikelyWebstudioJsx("<animation.VideoAnimation />")).toBe(true);
    expect(isLikelyWebstudioJsx("<$. />")).toBe(false);
    expect(isLikelyWebstudioJsx("<$.>")).toBe(false);
    expect(isLikelyWebstudioJsx("</$.Box>")).toBe(false);
    expect(isLikelyWebstudioJsx("<section>HTML</section>")).toBe(false);
    expect(isLikelyWebstudioJsx("## Markdown")).toBe(false);
  });

  test("can import JSX syntax inspection without the Node evaluator", () => {
    expect(() => inspectWebstudioJsxFragmentSyntax("<$.Box />")).not.toThrow();
    expect(() =>
      inspectWebstudioJsxFragmentSyntax("<$.Box data-secret={process.env} />")
    ).toThrow('Do not access "process" in JSX fragments');
  });

  test("converts and inserts Webstudio JSX", async () => {
    const fragment = createEmptyWebstudioFragment();
    mocks.createJsxFragment.mockResolvedValue(fragment);
    mocks.insertWebstudioFragmentAt.mockReturnValue(true);

    await expect(jsx.onPaste?.("<$.Box />")).resolves.toBe(true);

    expect(mocks.createJsxFragment).toHaveBeenCalledWith({
      projectId: "project-id",
      source: "<$.Box />",
    });
    expect(mocks.insertWebstudioFragmentAt).toHaveBeenCalledWith(
      fragment,
      undefined,
      undefined,
      expect.objectContaining({
        onBreakpointLimitMerge: expect.any(Function),
      })
    );
  });

  test("does not claim non-Webstudio JSX text", async () => {
    await expect(jsx.onPaste?.("<section>HTML</section>")).resolves.toBe(false);

    expect(mocks.createJsxFragment).not.toHaveBeenCalled();
    expect(mocks.insertWebstudioFragmentAt).not.toHaveBeenCalled();
  });

  test("does not claim JSX without a current project", async () => {
    $project.set(undefined);

    await expect(jsx.onPaste?.("<$.Box />")).resolves.toBe(false);

    expect(mocks.createJsxFragment).not.toHaveBeenCalled();
    expect(mocks.insertWebstudioFragmentAt).not.toHaveBeenCalled();
  });

  test("reports conversion errors and stops paste fallback", async () => {
    mocks.createJsxFragment.mockRejectedValue(new Error("Invalid JSX"));

    await expect(jsx.onPaste?.('<$.Box ws:id="0" />')).resolves.toBe(true);

    expect(mocks.toastError).toHaveBeenCalledWith("Invalid JSX");
    expect(mocks.insertWebstudioFragmentAt).not.toHaveBeenCalled();
  });
});
