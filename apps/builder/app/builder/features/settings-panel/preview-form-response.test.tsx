import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { fetch as builderFetch } from "~/shared/fetch.client";
import { $project } from "~/shared/sync/data-stores";
import { draftPersistence } from "~/shared/sync/draft-persistence";
import { submitPreviewForm } from "~/shared/preview-form-bridge";
import { subscribePreviewFormRequests } from "~/shared/preview-form-parent";
import { $previewFormExchanges } from "~/shared/preview-form-inspection";
import {
  $resourcePreviewExchanges,
  recordResourcePreviewExchange,
} from "~/shared/preview-resource-inspection";
import { FormResourcePreview } from "./variable-editors/form-resource-preview";

const listeners = vi.hoisted(
  () => new Map<string, Set<(payload: unknown) => void>>()
);
vi.mock("~/shared/pubsub", () => ({
  publish: ({ type, payload }: { type: string; payload?: unknown }) => {
    for (const listener of listeners.get(type) ?? []) {
      listener(structuredClone(payload));
    }
  },
  subscribe: (type: string, listener: (payload: unknown) => void) => {
    const handlers = listeners.get(type) ?? new Set();
    handlers.add(listener);
    listeners.set(type, handlers);
    return () => handlers.delete(listener);
  },
}));
vi.mock("@webstudio-is/protocol", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@webstudio-is/protocol")>()),
  parseBuilderUrl: () => ({ projectId: "project" }),
}));
vi.mock("~/shared/fetch.client", () => ({ fetch: vi.fn() }));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  draftPersistence.reset();
  $project.set(undefined);
  listeners.clear();
  vi.clearAllMocks();
});

test("Preview email response survives metadata refresh and editor reopening, but clears on project switch", async () => {
  $project.set({ id: "project", title: "Before" } as never);
  draftPersistence.reset("project");
  const exchange = {
    resourceId: "email-resource",
    resourceName: "Email",
    kind: "email" as const,
    request: {
      method: "POST",
      url: "https://webstudio-email-service.wstd.workers.dev/trpc/email.send",
      headers: [{ name: "authorization", value: "[redacted]" }],
      body: { subject: "Contact", text: "Submitted message" },
      truncated: false,
    },
    response: {
      status: 200,
      statusText: "OK",
      headers: [{ name: "x-request-id", value: "email-service-request" }],
      body: { id: "captured-email-service-response" },
      truncated: false,
    },
  };
  vi.mocked(builderFetch).mockResolvedValue(
    Response.json({
      success: true,
      status: 200,
      results: [
        {
          resourceId: "email-resource",
          status: 200,
          body: { id: "public-form-result" },
        },
      ],
      errors: [],
      previewExchanges: [exchange],
    })
  );
  const publish = vi.fn(
    ({ type, payload }: { type: string; payload?: unknown }) => {
      for (const listener of listeners.get(type) ?? []) {
        listener(structuredClone(payload));
      }
    }
  );
  const unsubscribe = subscribePreviewFormRequests(publish);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const editor = (
    <TooltipProvider>
      <FormResourcePreview
        variable={{
          id: "email-variable",
          type: "resource",
          resourceId: "email-resource",
          name: "Email",
        }}
        variableValue={undefined}
        inspectSubmission
        alwaysShowRequestTab
        emptyPreviewMessage="Submit this Form in Preview to see the email service response."
      />
    </TooltipProvider>
  );
  const openResponse = async () => {
    const tab = Array.from(
      container.querySelectorAll<HTMLElement>('[role="tab"]')
    ).find((tab) => tab.textContent === "Response")!;
    await act(async () => {
      tab.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, button: 0 })
      );
      tab.click();
    });
  };
  try {
    await act(async () => root.render(editor));
    expect(
      Array.from(
        container.querySelectorAll('[role="tab"]'),
        (tab) => tab.textContent
      )
    ).toEqual(["Request", "Response", "Diagnostics"]);
    expect(
      container.querySelector('[role="tab"][data-state="active"]')?.textContent
    ).toBe("Request");
    await openResponse();
    expect(container.textContent).toContain("Submit this Form in Preview");
    await act(async () => {
      const result = await submitPreviewForm({
        values: { message: "Submitted message" },
        managedFormId: "form",
        path: "/contact",
        signal: new AbortController().signal,
      });
      expect(result.success).toBe(true);
      expect(result).not.toHaveProperty("previewExchanges");
    });
    expect($previewFormExchanges.get().get("email-resource")?.attempts).toEqual(
      [exchange]
    );
    const activePanel = () =>
      container.querySelector('[role="tabpanel"][data-state="active"]');
    await expect
      .poll(() => activePanel()?.textContent)
      .toContain("captured-email-service-response");
    expect(activePanel()?.textContent).toContain("email-service-request");
    expect(activePanel()?.textContent).not.toContain("public-form-result");
    expect(activePanel()?.textContent).not.toContain(
      "Submit this Form in Preview"
    );

    recordResourcePreviewExchange("explicit-preview", exchange);
    await act(async () => {
      $project.set({ id: "project", title: "Updated metadata" } as never);
      root.render(null);
    });
    expect($resourcePreviewExchanges.get().has("explicit-preview")).toBe(true);
    await act(async () => root.render(editor));
    await openResponse();
    await expect
      .poll(() => activePanel()?.textContent)
      .toContain("captured-email-service-response");
    expect(builderFetch).toHaveBeenCalledOnce();
    await act(async () => $project.set({ id: "another-project" } as never));
    expect($previewFormExchanges.get().size).toBe(0);
    expect($resourcePreviewExchanges.get().size).toBe(0);
    expect(container.textContent).toContain("Submit this Form in Preview");
  } finally {
    act(() => root.unmount());
    container.remove();
    unsubscribe();
  }
});
