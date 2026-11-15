import { createRef } from "react";
import { FetchInterceptor } from "@mswjs/interceptors/fetch";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { Dialog, TooltipProvider } from "@webstudio-is/design-system";
import type { ResourceRequest } from "@webstudio-is/sdk";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { $resources } from "~/shared/sync/data-stores";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
const initialResources = $resources.get();
const interceptor = new FetchInterceptor();
beforeAll(() => interceptor.apply());
afterAll(() => interceptor.dispose());

afterEach(async () => {
  act(() => root?.unmount());
  root = undefined;
  $resources.set(initialResources);
  const { __testing__ } = await import("~/shared/resources");
  __testing__.reset();
  document.body.innerHTML = "";
  interceptor.removeAllListeners("request");
});

test("Resource editor Refresh sends its computed GET to the inspected loader", async () => {
  const url = "https://api.tilmaplatform.com/api/orgs/holyredeemer/en/";
  const loaderCalls: Request[] = [];
  interceptor.on("request", ({ request, controller }) => {
    const requestUrl = new URL(request.url);
    if (
      requestUrl.origin !== location.origin ||
      requestUrl.pathname !== "/rest/resources-loader"
    ) {
      return;
    }
    loaderCalls.push(request.clone());
    controller.respondWith(
      request.method === "POST"
        ? Response.json({ resources: [] })
        : Response.error()
    );
  });
  // Install interception before fetch.client captures fetch at import time.
  const [{ HttpResourceEditor }, { updateCsrfToken }] = await Promise.all([
    import("./http-resource-editor"),
    import("~/shared/csrf.client"),
  ]);
  updateCsrfToken("test-token");

  const variable = {
    id: "holy-redeemer-variable",
    type: "resource" as const,
    name: "Holy Redeemer",
    resourceId: "holy-redeemer-resource",
    scopeInstanceId: "instance",
  };
  $resources.set(
    new Map([
      [
        variable.resourceId,
        {
          id: variable.resourceId,
          name: variable.name,
          method: "get" as const,
          url: JSON.stringify(url),
          headers: [],
        },
      ],
    ])
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <TooltipProvider>
        <Dialog open>
          <HttpResourceEditor
            variable={variable}
            formRef={createRef<HTMLFormElement>()}
            onSubmit={vi.fn()}
            disabled={false}
            commonFields={
              <input type="hidden" name="name" value={variable.name} />
            }
            title="Edit Resource"
            titleActions={(options) => (
              <button
                type="button"
                data-testid="refresh-resource"
                onClick={options?.onRefresh}
              >
                Refresh
              </button>
            )}
            value={undefined}
            onValueChange={vi.fn()}
            variableType="resource"
          />
        </Dialog>
      </TooltipProvider>
    );
  });

  await act(async () => {
    await userEvent.click(
      document.querySelector('[data-testid="refresh-resource"]')!
    );
  });
  await vi.waitFor(() => expect(loaderCalls).toHaveLength(1));
  const [request] = loaderCalls;
  expect(new URL(request.url).searchParams.has("inspect")).toBe(true);
  expect(request.method).toBe("POST");
  expect((await request.json()) as ResourceRequest[]).toEqual([
    {
      name: variable.name,
      method: "get",
      url,
      searchParams: [],
      headers: [],
    },
  ]);
});
