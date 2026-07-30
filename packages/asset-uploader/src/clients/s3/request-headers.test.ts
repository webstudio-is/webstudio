import { describe, expect, test } from "vitest";
import {
  createS3FetchHeaders,
  createS3SigningHeaders,
} from "./request-headers";

describe("S3 request headers", () => {
  test("signs the exact host including a non-default port", () => {
    const signed = createS3SigningHeaders(
      new URL("http://localhost:9000/bucket/object"),
      { "x-amz-content-sha256": "UNSIGNED-PAYLOAD" }
    );

    expect(signed.host).toBe("localhost:9000");
    expect(createS3FetchHeaders(signed).has("host")).toBe(false);
  });
});
