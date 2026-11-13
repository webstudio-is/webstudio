import { inflateSync } from "node:zlib";
import { expect, test, vi } from "vitest";
import { createCloudflareManagedFormEmailSender } from "./server-email";
import type { ResourceRequest } from "../schema/resources";

// A valid 1×1 RGBA PNG, including NUL and non-UTF-8 bytes.
const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z9DwHwAGAAJ/IQJzOwAAAABJRU5ErkJggg==";

test.each([false, true])(
  "preserves PNG bytes through multipart upload and Email JSON (inspection: %s)",
  async (inspection) => {
    const png = Buffer.from(pngBase64, "base64");
    const upload = new FormData();
    upload.set(
      "attachment",
      new File([png], "screenshot.png", { type: "image/png" })
    );
    // A filename/content type must not cause the sender to reinterpret file bytes.
    upload.append(
      "attachment",
      new File([pngBase64], "encoded.png", { type: "image/png" })
    );
    const incoming = new Request("https://example.com/form", {
      method: "POST",
      body: upload,
    });
    const rpc = vi.fn(async (projectId: string, payload: unknown) => {
      expect(projectId).toBe("project-id");
      const body = payload as {
        attachments: {
          filename: string;
          contentType: string;
          contentBase64: string;
        }[];
      };
      expect(body.attachments.map(({ filename }) => filename)).toEqual([
        "screenshot.png",
        "encoded.png",
      ]);
      const received = Buffer.from(body.attachments[0].contentBase64, "base64");
      expect(received).toEqual(png);
      // The IDAT chunk decompresses to a filter byte and the original RGBA pixel.
      expect(inflateSync(received.subarray(41, 54))).toEqual(
        Buffer.from([0, 255, 0, 128, 255])
      );
      expect(Buffer.from(body.attachments[1].contentBase64, "base64")).toEqual(
        Buffer.from(pngBase64)
      );
      return {
        ok: true as const,
        status: 200 as const,
        statusText: "OK",
        data: { id: "sent" },
      };
    });
    const send = createCloudflareManagedFormEmailSender(
      { sendEmail: rpc },
      await incoming.formData(),
      "project-id"
    )!;
    const request: ResourceRequest = {
      name: "Team email",
      control: "email",
      method: "post",
      url: "",
      searchParams: [],
      headers: [],
      email: {
        recipientMode: "project",
        recipients: [{ address: "owner@example.com" }],
        subject: "Attachment",
        body: "Message",
        includeAttachments: true,
      },
    };
    const inspected = vi.fn((request: Request) => request.json());
    const result = await send(
      request,
      inspection ? { onEmailRequest: inspected } : {}
    );
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledOnce();
    expect(inspected).not.toHaveBeenCalled();
  }
);
