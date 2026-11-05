import { once } from "node:events";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { expect, test } from "vitest";
import {
  createBrowserScreenshotSession,
  defaultBrowserScreenshotDependencies,
  type BrowserScreenshotSession,
} from "@webstudio-is/vision/browser";
import { resolveScreenshotBrowser } from "../screenshot";

test.each([false, true])(
  "captures managed Form results before redirect body eviction (context gap: %s)",
  async (navigationGap) => {
    const browser = await resolveScreenshotBrowser({ browser: "auto" });
    const { outputFiles } = await build({
      stdin: {
        contents: `
        import { createElement } from "react";
        import { createRoot } from "react-dom/client";
        import { ResourceForm } from "../sdk-components-react/src/resource-form";
        createRoot(document.querySelector("main")).render(createElement(
          ResourceForm,
          {
            action: [{ dataSourceId: "receiver" }],
            "data-ws-managed-form-id": "contact",
            successRedirect: "/thanks?token=private-query#private-fragment",
          },
          createElement("input", { name: "message", required: true }),
          createElement("button", { type: "submit" }, "Submit"),
        ));
      `,
        resolveDir: fileURLToPath(new URL("../..", import.meta.url)),
        loader: "tsx",
      },
      bundle: true,
      write: false,
      minify: true,
      jsx: "automatic",
      conditions: ["webstudio"],
      define: { "process.env.NODE_ENV": '"production"' },
    });
    let writes = 0;
    const server = createServer((request, response) => {
      const path = new URL(request.url!, "http://localhost").pathname;
      if (request.method === "POST" && path === "/__ws-form/contact") {
        writes += 1;
        request.resume();
        response.setHeader("Content-Type", "application/json");
        response.end(
          JSON.stringify({
            success: true,
            status: 200,
            results: [
              {
                status: 201,
                resourceId: "receiver",
                resourceName: "Receiver",
                body: "private-response-body",
                headers: { authorization: "private-header" },
              },
            ],
            errors: [
              {
                status: 503,
                resourceName: "Receipt",
                message: "private-error",
                body: "private-error-body",
              },
            ],
          })
        );
        return;
      }
      if (path === "/client.js") {
        response.setHeader("Content-Type", "application/javascript");
        response.end(outputFiles[0].contents);
        return;
      }
      response.setHeader("Content-Type", "text/html");
      response.end(
        path === "/thanks"
          ? "<main>Done</main>"
          : '<main data-ws-project="fixture"></main><script src="/client.js"></script>'
      );
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Test server did not bind a port");
    }
    const origin = `http://127.0.0.1:${address.port}`;
    let navigated = false;
    let completed = false;
    let lateReads = 0;
    let bodyReads = 0;
    let gaps = 0;
    let managedRequestId: string | undefined;
    let session: BrowserScreenshotSession | undefined;
    try {
      session = await createBrowserScreenshotSession(
        {
          url: `${origin}/contact`,
          browserPath: browser.path,
          output: "unused.png",
          width: 800,
          height: 600,
          waitUntil: "load",
          waitForTimeout: 0,
          timeout: 15_000,
        },
        {
          ...defaultBrowserScreenshotDependencies,
          createWebSocket: (url) => {
            const socket = new WebSocket(url);
            socket.addEventListener("message", (event) => {
              const message = JSON.parse(String(event.data));
              if (
                message.method === "Network.responseReceived" &&
                new URL(message.params.response.url).pathname ===
                  "/__ws-form/contact"
              ) {
                managedRequestId = message.params.requestId;
              }
              if (
                message.method === "Network.loadingFinished" &&
                message.params.requestId === managedRequestId
              ) {
                completed = true;
              }
              if (
                message.method === "Page.frameNavigated" &&
                new URL(message.params.frame.url).pathname === "/thanks"
              ) {
                navigated = true;
              }
            });
            const send = socket.send.bind(socket);
            socket.send = (data) => {
              const message = JSON.parse(String(data));
              if (
                navigationGap &&
                navigated &&
                gaps === 0 &&
                message.method === "Runtime.evaluate" &&
                message.params.expression.includes("aria-busy")
              ) {
                gaps += 1;
                queueMicrotask(() =>
                  socket.dispatchEvent(
                    new MessageEvent("message", {
                      data: JSON.stringify({
                        id: message.id,
                        error: {
                          code: -32000,
                          message: "Execution context was destroyed",
                        },
                      }),
                    })
                  )
                );
                return;
              }
              if (
                message.method === "Network.getResponseBody" &&
                message.params.requestId === managedRequestId
              ) {
                bodyReads += 1;
                expect(completed).toBe(true);
                // Reproduce Chrome dropping this completed resource at navigation,
                // independent of whether this browser version retains durable bodies.
                if (navigated) {
                  lateReads += 1;
                  queueMicrotask(() =>
                    socket.dispatchEvent(
                      new MessageEvent("message", {
                        data: JSON.stringify({
                          id: message.id,
                          error: {
                            code: -32000,
                            message: "No resource with given identifier found",
                          },
                        }),
                      })
                    )
                  );
                  return;
                }
              }
              send(data);
            };
            return socket;
          },
        }
      );
      const result = await session.submitForm!({
        url: `${origin}/contact`,
        selector: "form",
        values: [{ name: "message", value: "private-submitted-value" }],
        timeout: 15_000,
      });
      expect(writes).toBe(1);
      expect(navigated).toBe(true);
      expect(result).toMatchObject({
        status: "submitted",
        pageUrl: `${origin}/thanks`,
        redirect: `${origin}/thanks`,
        results: [
          { status: 201, resourceId: "receiver", resourceName: "Receiver" },
        ],
        errors: [{ status: 503, name: "Receipt" }],
      });
      expect(bodyReads).toBe(1);
      expect(lateReads).toBe(0);
      expect(gaps).toBe(Number(navigationGap));
      expect(JSON.stringify(result)).not.toContain("private-");
    } finally {
      await session?.close();
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  },
  30_000
);
