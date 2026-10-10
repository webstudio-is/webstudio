import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { build } from "esbuild";
import { chromium } from "playwright";
import { expect, test } from "vitest";
import {
  managedFormIdFieldName,
  managedFormRequestParamName,
} from "@webstudio-is/sdk/form-fields";

test("a router-free Form submits to a real JSON endpoint", async () => {
  const bundle = await build({
    stdin: {
      contents: `
        import { createElement } from "react";
        import { createRoot } from "react-dom/client";
        import { NativeForm } from "./native-form";

        window.formStates = [];
        window.formResults = [];
        createRoot(document.getElementById("root")).render(
          createElement(NativeForm, {
            "data-ws-managed-form-id": "form-one",
            action: [{ dataSourceId: "destination", enabled: true }],
            onStateChange: (state) => window.formStates.push(state),
            onResultChange: (result) => window.formResults.push(result),
          },
            createElement("input", { name: "message", defaultValue: "Hello" }),
            createElement("button", { type: "submit" }, "Send")
          )
        );
      `,
      resolveDir: import.meta.dirname,
      sourcefile: "native-form-http-entry.tsx",
      loader: "tsx",
    },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    conditions: ["webstudio"],
  });
  const script = bundle.outputFiles[0].text;
  const requests: {
    method: string;
    pathname: string;
    contentType: string;
    formData: FormData;
  }[] = [];
  let completeFirstRequest: (() => void) | undefined;
  const firstResponse = new Promise<void>((resolve) => {
    completeFirstRequest = resolve;
  });
  const server = createServer(async (request, response) => {
    if (request.url?.startsWith("/__ws-form?")) {
      const chunks: Buffer[] = [];
      for await (const chunk of request) {
        chunks.push(Buffer.from(chunk));
      }
      const body = new Request("http://localhost/__ws-form", {
        method: "POST",
        headers: request.headers as HeadersInit,
        body: Buffer.concat(chunks),
      });
      requests.push({
        method: request.method ?? "",
        pathname: request.url,
        contentType: request.headers["content-type"] ?? "",
        formData: await body.formData(),
      });
      if (requests.length === 1) {
        await firstResponse;
      }
      response.writeHead(requests.length === 1 ? 200 : 422, {
        "content-type": "application/json",
      });
      response.end(
        JSON.stringify(
          requests.length === 1
            ? {
                success: true,
                status: 200,
                results: [
                  {
                    resourceId: "destination",
                    resourceName: "destination",
                    status: 201,
                    body: { id: 1 },
                  },
                ],
                errors: [],
              }
            : {
                success: false,
                status: 422,
                results: [
                  {
                    resourceId: "destination",
                    resourceName: "destination",
                    status: 422,
                    body: "Rejected",
                  },
                ],
                errors: [
                  {
                    resourceId: "destination",
                    resourceName: "destination",
                    status: 422,
                    body: "Rejected",
                    message: "Rejected",
                  },
                ],
              }
        )
      );
      return;
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end(`<div id="root"></div><script>${script}</script>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url);
    const form = page.locator("form");
    await page.getByRole("button", { name: "Send" }).click();
    await expect.poll(() => requests.length).toBe(1);
    expect(await form.getAttribute("aria-busy")).toBe("true");
    expect(requests[0].method).toBe("POST");
    expect(requests[0].contentType).toMatch(/^multipart\/form-data; boundary=/);
    expect(requests[0].pathname).toBe(
      `/__ws-form?${managedFormRequestParamName}=1`
    );
    expect(requests[0].formData.get("message")).toBe("Hello");
    expect(requests[0].formData.get(managedFormIdFieldName)).toBe("form-one");
    completeFirstRequest?.();
    await page.locator('form[data-state="success"]').waitFor();
    expect(page.url()).toBe(`${url}/`);
    expect(await page.evaluate("window.formResults")).toEqual([
      {
        success: true,
        status: 200,
        results: [
          {
            resourceId: "destination",
            resourceName: "destination",
            status: 201,
            body: { id: 1 },
          },
        ],
        errors: [],
      },
    ]);
    await page.getByRole("button", { name: "Send" }).click();
    await page.locator('form[data-state="error"]').waitFor();
    expect(requests).toHaveLength(2);
    expect(await page.evaluate("window.formResults[1]")).toEqual({
      success: false,
      status: 422,
      results: [
        {
          resourceId: "destination",
          resourceName: "destination",
          status: 422,
          body: "Rejected",
        },
      ],
      errors: [
        {
          resourceId: "destination",
          resourceName: "destination",
          status: 422,
          body: "Rejected",
          message: "Rejected",
        },
      ],
    });
    expect(await page.evaluate("window.formStates")).toEqual([
      "initial",
      "success",
      "initial",
      "error",
    ]);
    expect(page.url()).toBe(`${url}/`);
  } finally {
    completeFirstRequest?.();
    await browser?.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}, 15_000);
