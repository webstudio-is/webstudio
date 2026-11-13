import { expect, test } from "vitest";
import { getBrowserLaunchOptions } from "./test";

test("maps Builder and project wstd.dev hosts to loopback for local runs", () => {
  expect(getBrowserLaunchOptions("https://127.0.0.1:3000")).toEqual({
    args: [
      "--host-resolver-rules=MAP wstd.dev 127.0.0.1,MAP *.wstd.dev 127.0.0.1",
    ],
  });
});

test("does not override host resolution for remote Builder URLs", () => {
  expect(getBrowserLaunchOptions("https://builder.example.com")).toEqual({});
});
