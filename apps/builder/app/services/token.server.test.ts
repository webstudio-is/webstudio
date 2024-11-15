import {
  encrypt,
  decrypt,
  createAccessToken,
  readAccessToken,
} from "./token.server";
import { test, expect } from "vitest";
import { nanoid } from "nanoid";

test.each([
  "",
  nanoid(1),
  nanoid(2),
  nanoid(5),
  nanoid(10),
  nanoid(20),
  nanoid(30),
  nanoid(40),
])("Encrypt and decrypt", async (cithertext) => {
  const secret =
    "JDKHSJFHKJHFSKJDHFJSDHFKJHDKJFHSKJDHFKJHFKJSFHKKADHJKSHDJKSHAJKHDASKDJH";

  expect(await decrypt(await encrypt(cithertext, secret), secret)).toBe(
    cithertext
  );
});

test("Access token", async () => {
  const secret = "1212121212";

  const token = await createAccessToken(
    { userId: "1", projectId: "2" },
    secret,
    {
      maxAge: 1000 * 60,
    }
  );

  const tokenPayload = await readAccessToken(token, secret);

  expect(tokenPayload).toEqual({ userId: "1", projectId: "2" });
});
