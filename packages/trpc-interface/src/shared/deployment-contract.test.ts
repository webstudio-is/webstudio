import { expect, test } from "vitest";
import {
  publishInput,
  publishLogInput,
  publishLogOutput,
} from "@webstudio-is/trpc-interface/deployment-contract";

test("the public deployment contract validates publish and status-only log requests", () => {
  expect(
    publishInput.parse({
      buildId: "build-1",
      builderOrigin: "https://webstudio.is",
      destination: "static",
      branchName: "main",
      logProjectName: "Project",
    }).destination
  ).toBe("static");
  expect(
    publishLogInput.parse({
      buildId: "build-1",
      logHandle: "signed-handle",
      includeLog: false,
    }).includeLog
  ).toBe(false);
  expect(
    publishLogOutput.parse({
      availability: "available",
      outcome: "failed",
      logAvailability: "unavailable",
      code: "cancelled",
    }).availability
  ).toBe("available");
  const page = publishLogOutput.parse({
    availability: "available",
    outcome: "failed",
    logAvailability: "available",
    log: {
      encoding: "base64url",
      chunk: "ZmFpbGVk",
      complete: true,
      steps: [
        { name: "Build", status: "failure", offset: 0, contentOffset: 7 },
      ],
    },
  });
  expect(page.availability === "available" && page.log?.steps).toEqual([
    { name: "Build", status: "failure", offset: 0, contentOffset: 7 },
  ]);
  expect(
    publishLogInput.safeParse({
      buildId: "build-1",
      logHandle: "signed-handle",
      includeLog: "false",
    }).success
  ).toBe(false);
});
