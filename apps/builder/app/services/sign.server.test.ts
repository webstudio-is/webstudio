import { test, expect } from "@jest/globals";
import { nanoid } from "nanoid";
import { sign, verify } from "./sign.server";

test.each([
  "",
  nanoid(1),
  nanoid(2),
  nanoid(5),
  nanoid(10),
  nanoid(20),
  nanoid(30),
  nanoid(40),
])("Sign and verify", async (message) => {
  const secret = nanoid(10);
  const signedMessage = await sign(message, secret);

  expect(await verify(signedMessage, secret)).toBe(true);
});

test("Invalid signature", async () => {
  const signedMessage = await sign("some-message", "secret");
  expect(await verify(signedMessage, "otherSecret")).toBe(false);
});

test("Invalid signature", async () => {
  const signedMessage =
    (await sign("", "secret")).split(".")[0] + "." + "не-бейс-64";

  expect(await verify(signedMessage, "secret")).toBe(false);
});

test("Invalid message", async () => {
  expect(await verify("", "secret")).toBe(false);
});
