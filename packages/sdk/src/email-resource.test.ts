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
    emailBody: "Project body",
  };

  test("inherits project recipients and Sender, then resets each override", () => {
    expect(
      resolveEmailResourceSettings({
        projectMeta,
        ownerEmail: "fallback@example.com",
        ownerName: "Site Owner Profile",
      })
    ).toMatchObject({
      recipients: [{ name: "Team, West", address: "team@example.com" }],
      sender: { name: "Owner Name", address: "owner@example.com" },
      fromName: "Owner Name",
      subject: '"Project subject"',
      body: '"Project body"',
    });
    const settings = {
      recipientMode: "custom" as const,
      recipients: "custom@example.com",
      sender: "Custom <custom@example.com>",
      subject: '"Custom subject"',
      body: '"Resource body"',
    };
    expect(
      resolveEmailResourceSettings({
        settings,
        projectMeta,
        ownerEmail: "fallback@example.com",
        ownerName: "Site Owner Profile",
      })
    ).toMatchObject({
      recipients: [{ address: "custom@example.com" }],
      sender: { name: "Custom", address: "custom@example.com" },
      fromName: "Custom",
      subject: '"Custom subject"',
      body: '"Resource body"',
    });
    const reset = resetEmailResourceSetting(
      resetEmailResourceSetting(
        resetEmailResourceSetting(settings, "sender"),
        "subject"
      ),
      "body"
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
      body: '"Project body"',
    });
  });

  test("falls back to owner for recipients and Sender and keeps a readable Form body", () => {
    expect(
      resolveEmailResourceSettings({
        ownerEmail: "owner@example.com",
        ownerName: "Owner Profile",
      })
    ).toMatchObject({
      recipients: [{ address: "owner@example.com" }],
      sender: { address: "owner@example.com" },
      fromName: "Owner Profile",
    });
    const expression = getDefaultFormEmailBodyExpression(
      "formData",
      "browserInfo"
    );
    expect(expression).toContain("Form data:");
    expect(expression).toContain("${formData}");
    expect(expression).toContain("${browserInfo}");
  });

  test("uses Site Owner when no profile name is available", () => {
    expect(resolveEmailResourceSettings({}).fromName).toBe("Site Owner");
  });

  test("visitor mode uses one runtime recipient, empty body, and visitor subject", () => {
    expect(
      resolveEmailResourceSettings({
        settings: { recipientMode: "visitor", visitorEmailField: "email" },
        projectMeta: {
          contactEmail: "team@example.com",
          emailBody: "Owner message",
          emailConfirmationSubject: "We got it",
        },
      })
    ).toMatchObject({
      recipientMode: "visitor",
      visitorEmailField: "email",
      recipients: [],
      subject: '"We got it"',
      body: '""',
      includeAttachments: false,
    });
  });

  test("uses a translated project body as the complete literal message", () => {
    const expression = getDefaultFormEmailBodyExpression(
      "formData",
      "browserInfo",
      "Solicitud recibida. ${secrets}\\ `citado`"
    );
    const render = new Function(
      "formData",
      "browserInfo",
      `return ${expression}`
    ) as (formData: string, browserInfo: string) => string;
    expect(render("nombre: Ana", "idioma: es")).toBe(
      "Solicitud recibida. ${secrets}\\ `citado`"
    );
  });
});
