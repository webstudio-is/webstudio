import { describe, expect, test } from "vitest";
import {
  getDefaultFormEmailBodyExpression,
  resetEmailResourceSetting,
  resolveEmailResourceSettings,
} from "./email-resource";
import { parseEmailMailboxes, parseEmailSender } from "./email-addresses";

describe("email addresses", () => {
  test("keeps named, quoted-comma, plain, and duplicate mailboxes", () => {
    expect(
      parseEmailMailboxes(
        '"Isonen, Olegs" <oleg008@gmail.com>, team@example.com, team@example.com'
      )
    ).toEqual([
      { name: "Isonen, Olegs", address: "oleg008@gmail.com" },
      { address: "team@example.com" },
      { address: "team@example.com" },
    ]);
    expect(parseEmailSender("oleg008@gmail.com")).toEqual({
      address: "oleg008@gmail.com",
    });
    expect(parseEmailSender("Olegs Isonen <oleg008@gmail.com>")).toEqual({
      name: "Olegs Isonen",
      address: "oleg008@gmail.com",
    });
    expect(parseEmailSender("a@example.com, b@example.com")).toBeUndefined();
  });

  test("rejects malformed and header-injection input", () => {
    for (const value of [
      "Bad <foo>",
      "a@example.com\r\nBcc: b@example.com",
      "a@example.com\n",
      "Group: a@example.com;",
    ]) {
      expect(parseEmailMailboxes(value)).toBeUndefined();
    }
  });
});

describe("Email Resource defaults", () => {
  const projectMeta = {
    contactEmail: '"Team, West" <team@example.com>',
    emailSender: "Owner Name <owner@example.com>",
    emailSubject: "Project subject",
    emailBody: "Project introduction",
  };

  test("inherits project recipients and Sender, then resets each override", () => {
    expect(
      resolveEmailResourceSettings({
        projectMeta,
        ownerEmail: "fallback@example.com",
      })
    ).toMatchObject({
      recipients: [{ name: "Team, West", address: "team@example.com" }],
      sender: { name: "Owner Name", address: "owner@example.com" },
      subject: '"Project subject"',
      body: '"Project introduction"',
    });
    const settings = {
      recipientMode: "custom" as const,
      recipients: "custom@example.com",
      sender: "Custom <custom@example.com>",
      subject: '"Custom subject"',
    };
    expect(
      resolveEmailResourceSettings({
        settings,
        projectMeta,
        ownerEmail: "fallback@example.com",
      })
    ).toMatchObject({
      recipients: [{ address: "custom@example.com" }],
      sender: { name: "Custom", address: "custom@example.com" },
      subject: '"Custom subject"',
    });
    const reset = resetEmailResourceSetting(
      resetEmailResourceSetting(settings, "sender"),
      "subject"
    );
    expect(
      resolveEmailResourceSettings({
        settings: reset,
        projectMeta,
        ownerEmail: "fallback@example.com",
      })
    ).toMatchObject({
      sender: { name: "Owner Name", address: "owner@example.com" },
      subject: '"Project subject"',
    });
  });

  test("falls back to owner for recipients and Sender and keeps a readable Form body", () => {
    expect(
      resolveEmailResourceSettings({ ownerEmail: "owner@example.com" })
    ).toMatchObject({
      recipients: [{ address: "owner@example.com" }],
      sender: { address: "owner@example.com" },
    });
    const expression = getDefaultFormEmailBodyExpression(
      "formData",
      "browserInfo",
      "Introduction"
    );
    expect(expression).toContain("Form data:");
    expect(expression).toContain("${formData}");
    expect(expression).toContain("${browserInfo}");
    expect(expression).toContain("Introduction");
  });
});
