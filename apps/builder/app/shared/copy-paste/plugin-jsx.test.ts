import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { createEmptyWebstudioFragment } from "@webstudio-is/project-build/runtime";
import { inspectWebstudioJsxFragmentSyntax } from "@webstudio-is/project-build/transfer";
import { $project } from "../sync/data-stores";
import { updateCsrfToken } from "../csrf.client";
import { createTrpcInterceptor } from "../trpc/trpc-test-utils";

const mocks = vi.hoisted(() => ({
  insertWebstudioFragmentAt: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("../instance-utils/insert", async (importOriginal) => ({
  ...(await importOriginal()),
  insertWebstudioFragmentAt: mocks.insertWebstudioFragmentAt,
}));

vi.mock("../builder-api", async (importOriginal) => ({
  ...(await importOriginal()),
  builderApi: {
    toast: {
      error: mocks.toastError,
      warn: vi.fn(),
    },
  },
}));

let requestInput: unknown;
let createFragmentResponse: unknown = createEmptyWebstudioFragment();
let jsx: typeof import("./plugin-jsx").jsx;
let isLikelyWebstudioJsx: typeof import("./plugin-jsx").isLikelyWebstudioJsx;
let pasteHandled: typeof import("./copy-paste").pasteHandled;
let pasteIgnored: typeof import("./copy-paste").pasteIgnored;
const interceptor = createTrpcInterceptor({
  "build.createJsxFragment": (input) => {
    requestInput = input;
    return createFragmentResponse;
  },
});

beforeAll(async () => {
  interceptor.start();
  ({ pasteHandled, pasteIgnored } = await import("./copy-paste"));
  ({ jsx, isLikelyWebstudioJsx } = await import("./plugin-jsx"));
});
afterAll(() => interceptor.stop());

describe("jsx paste plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestInput = undefined;
    createFragmentResponse = createEmptyWebstudioFragment();
    updateCsrfToken("test-token");
    $project.set({ id: "project-id" } as never);
  });

  test("detects only Webstudio JSX", () => {
    expect(isLikelyWebstudioJsx("<Box />")).toBe(true);
    expect(isLikelyWebstudioJsx('<ws.element ws:tag="section" />')).toBe(true);
    expect(isLikelyWebstudioJsx("<Switch />")).toBe(true);
    expect(isLikelyWebstudioJsx("<VideoAnimation />")).toBe(true);
    expect(isLikelyWebstudioJsx("</Box>")).toBe(false);
    expect(isLikelyWebstudioJsx("<section>HTML</section>")).toBe(false);
    expect(isLikelyWebstudioJsx("## Markdown")).toBe(false);
  });

  test("can import JSX syntax inspection without the Node evaluator", () => {
    expect(() => inspectWebstudioJsxFragmentSyntax("<Box />")).not.toThrow();
    expect(() =>
      inspectWebstudioJsxFragmentSyntax("<Box data-secret={process.env} />")
    ).toThrow('Do not access "process" in JSX fragments');
  });

  test("converts and inserts Webstudio JSX", async () => {
    const fragment = createEmptyWebstudioFragment();
    createFragmentResponse = fragment;
    mocks.insertWebstudioFragmentAt.mockReturnValue(true);

    const result = await jsx.onPaste?.("<Box />");
    expect(requestInput).toEqual({
      projectId: "project-id",
      source: "<Box />",
    });
    expect(result).toEqual(pasteHandled);
    expect(mocks.insertWebstudioFragmentAt).toHaveBeenCalledWith(
      fragment,
      undefined,
      "theirs",
      expect.objectContaining({
        onBreakpointLimitMerge: expect.any(Function),
      })
    );
  });

  test("does not claim non-Webstudio JSX text", async () => {
    await expect(jsx.onPaste?.("<section>HTML</section>")).resolves.toEqual(
      pasteIgnored
    );

    expect(requestInput).toBeUndefined();
    expect(mocks.insertWebstudioFragmentAt).not.toHaveBeenCalled();
  });

  test("does not claim JSX without a current project", async () => {
    $project.set(undefined);

    await expect(jsx.onPaste?.("<Box />")).resolves.toEqual(pasteIgnored);

    expect(requestInput).toBeUndefined();
    expect(mocks.insertWebstudioFragmentAt).not.toHaveBeenCalled();
  });

  test("reports conversion errors and stops paste fallback", async () => {
    createFragmentResponse = new Response(
      JSON.stringify([
        {
          error: {
            message: "Invalid JSX",
            code: -32600,
            data: { code: "BAD_REQUEST", httpStatus: 400 },
          },
        },
      ]),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );

    await expect(jsx.onPaste?.('<Box ws:id="0" />')).resolves.toEqual({
      success: false,
      error: "Invalid JSX",
    });

    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(mocks.insertWebstudioFragmentAt).not.toHaveBeenCalled();
    expect(requestInput).toEqual({
      projectId: "project-id",
      source: '<Box ws:id="0" />',
    });
  });
});
