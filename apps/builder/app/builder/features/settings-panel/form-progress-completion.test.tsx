import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { test, expect, vi } from "vitest";
import { EditorView } from "@codemirror/view";
import { currentCompletions, startCompletion } from "@codemirror/autocomplete";
import { TooltipProvider } from "@webstudio-is/design-system";
import { $builderMode } from "~/shared/nano-states";
import {
  encodeDataSourceVariable,
  type DataSource,
  type Instances,
  type Props,
} from "@webstudio-is/sdk";
import {
  ExpressionCompletionScopeContext,
  ExpressionEditor,
} from "~/builder/shared/expression-editor";
import {
  BindingPopover,
  evaluateExpressionWithinScope,
} from "~/builder/shared/binding-popover";
import { getResourceScopeForInstance } from "./resource-scope";
import { getFormProgressCompletionScope } from "./form-context-preview";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("Resource expression suggests example file fields while evaluating real empty files", async () => {
  const variable: DataSource = {
    id: "output",
    type: "variable",
    name: "renamedProgress",
    scopeInstanceId: "form",
    value: {
      type: "json",
      value: { status: "idle", loaded: 0, total: 0, files: [] },
    },
  };
  const instances: Instances = new Map([
    [
      "form",
      { id: "form", type: "instance", component: "ResourceForm", children: [] },
    ],
  ]);
  const props: Props = new Map([
    [
      "callback",
      {
        id: "callback",
        instanceId: "form",
        name: "onProgressChange",
        type: "action",
        value: [
          {
            type: "execute",
            args: ["value"],
            code: `${encodeDataSourceVariable(variable.id)} = value`,
          },
        ],
      },
    ],
  ]);
  const dataSources = new Map([[variable.id, variable]]);
  const actual = { status: "idle", loaded: 0, total: 0, files: [] };
  const { scope, aliases } = getResourceScopeForInstance({
    page: undefined,
    instanceKey: "form,root",
    dataSources,
    variableValuesByInstanceSelector: new Map([
      ["form,root", new Map([[variable.id, actual]])],
    ]),
    formScopeInstanceId: "form",
    formScopeSelector: ["form", "root"],
  });
  const resolve = (value: Record<string, unknown>) =>
    getFormProgressCompletionScope({
      instances,
      props,
      dataSources,
      scope: value,
    });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const previousMode = $builderMode.get();
  $builderMode.set("design");
  try {
    await act(async () =>
      root.render(
        <TooltipProvider>
          <ExpressionCompletionScopeContext.Provider value={resolve}>
            <ExpressionEditor
              value="renamedProgress.files[0]."
              scope={scope}
              aliases={aliases}
              onChange={() => {}}
              onChangeComplete={() => {}}
            />
          </ExpressionCompletionScopeContext.Provider>
        </TooltipProvider>
      )
    );
    const view = EditorView.findFromDOM(container.querySelector(".cm-editor")!);
    expect(view).toBeDefined();
    view!.dispatch({ selection: { anchor: view!.state.doc.length } });
    await act(async () => {
      startCompletion(view!);
    });
    await expect
      .poll(() => currentCompletions(view!.state).map(({ label }) => label))
      .toContain("name");
    expect(currentCompletions(view!.state).map(({ label }) => label)).toEqual(
      expect.arrayContaining(["id", "fieldName", "name", "size", "type"])
    );
    expect(
      await evaluateExpressionWithinScope(
        `${encodeDataSourceVariable(variable.id)}.files.length`,
        scope
      )
    ).toBe(0);
    expect(actual.files).toEqual([]);
    const onRemove = vi.fn();
    await act(async () =>
      root.render(
        <TooltipProvider>
          <ExpressionCompletionScopeContext.Provider value={resolve}>
            <BindingPopover
              scope={scope}
              aliases={aliases}
              variant="bound"
              value={`${encodeDataSourceVariable(variable.id)}.files`}
              onChange={() => {}}
              onRemove={onRemove}
            />
          </ExpressionCompletionScopeContext.Provider>
        </TooltipProvider>
      )
    );
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button[data-variant="bound"]')!
        .click();
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      );
    });
    const reset = document.querySelector<HTMLButtonElement>(
      '[aria-label="Reset binding"]'
    );
    expect(reset).not.toBeNull();
    await act(async () => reset!.click());
    expect(onRemove).toHaveBeenCalledExactlyOnceWith([]);
  } finally {
    await act(async () => root.unmount());
    $builderMode.set(previousMode);
    container.remove();
  }
});
