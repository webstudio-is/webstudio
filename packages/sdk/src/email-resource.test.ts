import { describe, expect, test } from "vitest";
import {
  createFormEmailDataProxy,
  getDefaultFormEmailBodyExpression,
  resolveEmailRecipientsExpression,
  resolveEmailSenderExpression,
  resolveEmailResourceSettings,
} from "./email-resource";
import { parseEmailMailboxes, parseEmailSender } from "./email-addresses";

describe("email addresses", () => {
  test("keeps named, quoted-comma, plain, and duplicate mailboxes", () => {
    expect(
      parseEmailMailboxes(
        '"Example, Alex" <acme@example.com>, team@example.com, team@example.com'
      )
    ).toEqual([
      { name: "Example, Alex", address: "acme@example.com" },
      { address: "team@example.com" },
      { address: "team@example.com" },
    ]);
    expect(parseEmailSender("acme@example.com")).toEqual({
      address: "acme@example.com",
    });
    expect(parseEmailSender("Acme <acme@example.com>")).toEqual({
      name: "Acme",
      address: "acme@example.com",
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

describe("bound Email Resource addresses", () => {
  test("resolves one Reply to mailbox and a comma-separated recipient list", () => {
    expect(resolveEmailSenderExpression("Acme <sender@example.com>")).toEqual({
      name: "Acme",
      address: "sender@example.com",
    });
    expect(
      resolveEmailRecipientsExpression(
        "First <one@example.com>, two@example.com"
      )
    ).toEqual([
      { name: "First", address: "one@example.com" },
      { address: "two@example.com" },
    ]);
  });

  test.each([
    ["empty", ""],
    ["non-string", { address: "user@example.com" }],
    ["invalid mailbox", "invalid"],
  ])("rejects %s resolved Reply to values", (_, value) => {
    expect(() => resolveEmailSenderExpression(value)).toThrow();
  });

  test.each([
    ["empty", ""],
    ["non-string", ["user@example.com"]],
    ["invalid mailbox", "invalid"],
  ])("rejects %s resolved recipient values", (_, value) => {
    expect(() => resolveEmailRecipientsExpression(value)).toThrow();
  });
});

describe("Email Resource defaults", () => {
  test("formats submitted values as readable lines without excluded fields", () => {
    const formData = createFormEmailDataProxy(
      {
        name: "Ada",
        subject: "Question",
        interests: ["Design", "Code"],
        attachment: new File(["note"], "note.txt"),
        password: "secret",
        address: { city: "Lisbon" },
      },
      { excludeKeys: ["password"] }
    );
    expect(`Submitted fields:\n${formData}`).toBe(
      "Submitted fields:\nName: Ada\nSubject: Question\nInterests: Design, Code\nAttachment: note.txt\nAddress:\n  City: Lisbon"
    );
    expect(formData.subject).toBe("Question");
    expect(String(formData.address)).toBe('{"city":"Lisbon"}');
  });

  const projectMeta = {
    contactEmail: '"Team, West" <team@example.com>',
    emailSender: "Owner Name <owner@example.com>",
  };

  test("inherits project recipients and Reply to, and applies Resource copy", () => {
    expect(
      resolveEmailResourceSettings({
        projectMeta,
        ownerEmail: "fallback@example.com",
      })
    ).toMatchObject({
      recipients: [{ name: "Team, West", address: "team@example.com" }],
      sender: { name: "Owner Name", address: "owner@example.com" },
      fromName: "Owner Name",
      subject: '"New form submission"',
      body: '"A new form was submitted."',
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
      })
    ).toMatchObject({
      recipients: [{ address: "custom@example.com" }],
      sender: { name: "Custom", address: "custom@example.com" },
      fromName: "Custom",
      subject: '"Custom subject"',
      body: '"Resource body"',
    });
    expect(
      resolveEmailResourceSettings({
        settings: {
          recipientMode: settings.recipientMode,
          recipients: settings.recipients,
        },
        projectMeta,
        ownerEmail: "fallback@example.com",
      })
    ).toMatchObject({
      sender: { name: "Owner Name", address: "owner@example.com" },
      subject: '"New form submission"',
      body: '"A new form was submitted."',
    });
    expect(
      resolveEmailResourceSettings({
        settings: { sender: "" },
        projectMeta,
      }).sender
    ).toEqual({ name: "Owner Name", address: "owner@example.com" });
  });

  test("falls back to owner for recipients but leaves Reply to empty", () => {
    expect(
      resolveEmailResourceSettings({
        ownerEmail: "owner@example.com",
      })
    ).toMatchObject({
      recipients: [{ address: "owner@example.com" }],
      sender: undefined,
      fromName: "Site Owner",
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

  test("visitor mode resolves one recipient and marks inherited confirmation copy", () => {
    expect(
      resolveEmailResourceSettings({
        settings: { recipientMode: "visitor", visitorEmailField: "email" },
        projectMeta: {
          contactEmail: "team@example.com",
        },
      })
    ).toMatchObject({
      recipientMode: "visitor",
      visitorEmailField: "email",
      recipients: [],
      subject: '"We received your submission"',
      body: '""',
      confirmationBody: "default",
      includeAttachments: true,
    });
    expect(
      resolveEmailResourceSettings({ settings: { recipientMode: "visitor" } })
        .confirmationSubject
    ).toBe("default");
    expect(
      resolveEmailResourceSettings({
        settings: { recipientMode: "visitor", body: '""' },
      }).confirmationBody
    ).toBeUndefined();
  });

  test("allows visitor Email Resource attachments to be explicitly disabled", () => {
    expect(
      resolveEmailResourceSettings({
        settings: {
          recipientMode: "visitor",
          visitorEmailField: "email",
          includeAttachments: false,
        },
      }).includeAttachments
    ).toBe(false);
  });
});
