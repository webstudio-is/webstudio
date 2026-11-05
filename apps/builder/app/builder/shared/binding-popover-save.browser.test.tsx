import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { EditorView } from "@codemirror/view";
import { expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { $builderMode } from "~/shared/nano-states";
import { BindingPopover } from "./binding-popover";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("saves the latest binding edit when the editor loses focus immediately", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const previousMode = $builderMode.get();
  const onChange = vi.fn();
  $builderMode.set("design");
  try {
    await act(async () => {
      root.render(
        <TooltipProvider>
          <BindingPopover
            scope={{}}
            aliases={new Map()}
            variant="bound"
            value='{"name":"before"}'
            onChange={onChange}
          />
        </TooltipProvider>
      );
    });
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button[data-variant="bound"]')!
        .click();
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      );
    });
    const editor = document.querySelector<HTMLElement>(
      '[role="dialog"] [role="textbox"]'
    );
    expect(editor).not.toBeNull();
    const view = EditorView.findFromDOM(editor!);
    expect(view).not.toBeNull();

    act(() => {
      view!.focus();
      view!.dispatch({
        changes: {
          from: 0,
          to: view!.state.doc.length,
          insert: '{"name":"after"}',
        },
      });
      view!.contentDOM.blur();
    });

    expect(onChange).toHaveBeenCalledExactlyOnceWith('{"name":"after"}');

    act(() => {
      view!.focus();
      view!.dispatch({
        changes: {
          from: 0,
          to: view!.state.doc.length,
          insert: '{"name":',
        },
      });
      view!.contentDOM.blur();
    });

    expect(onChange).toHaveBeenCalledTimes(1);

    act(() => {
      view!.focus();
      view!.dispatch({
        changes: {
          from: 0,
          to: view!.state.doc.length,
          insert: '{"name":"fixed"}',
        },
      });
      view!.contentDOM.blur();
    });

    expect(onChange).toHaveBeenLastCalledWith('{"name":"fixed"}');
    expect(onChange).toHaveBeenCalledTimes(2);
  } finally {
    await act(async () => root.unmount());
    $builderMode.set(previousMode);
    container.remove();
    vi.unstubAllGlobals();
  }
});
