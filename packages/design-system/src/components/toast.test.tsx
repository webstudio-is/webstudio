import { describe, expect, test } from "vitest";
import { __testingToast__ } from "./toast";

const { getTextContent } = __testingToast__;

describe("getTextContent", () => {
  test("returns string toast content as-is", () => {
    expect(getTextContent("Project saved successfully")).toBe(
      "Project saved successfully"
    );
  });

  test("extracts text from jsx toast content", () => {
    expect(
      getTextContent(
        <>
          A new version of Webstudio is available. Reload to get the latest -
          see what&apos;s new at{" "}
          <a href="https://wstd.us/changelog">wstd.us/changelog</a>
        </>
      )
    ).toBe(
      "A new version of Webstudio is available. Reload to get the latest - see what's new at wstd.us/changelog"
    );
  });
});
