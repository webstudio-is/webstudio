import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useDraftValue } from "./use-draft-value";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type DraftValueApi<Type> = ReturnType<typeof useDraftValue<Type>>;

let root: Root | undefined;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = undefined;
  document.body.innerHTML = "";
  vi.useRealTimers();
});

const renderDraftValue = <Type,>({
  savedValue,
  onSave,
  options,
  onRender,
}: {
  savedValue: Type;
  onSave: (value: Type) => void;
  options?: Parameters<typeof useDraftValue<Type>>[2];
  onRender?: (draftValue: DraftValueApi<Type>) => void;
}) => {
  let draftValue: DraftValueApi<Type> | undefined;
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  const TestComponent = (props: { savedValue: Type }) => {
    draftValue = useDraftValue(props.savedValue, onSave, options);
    onRender?.(draftValue);
    return null;
  };

  const render = (nextSavedValue: Type) => {
    act(() => {
      root?.render(
        createElement(TestComponent, { savedValue: nextSavedValue })
      );
    });
  };

  render(savedValue);

  return {
    get current() {
      if (draftValue === undefined) {
        throw new Error("useDraftValue was not rendered");
      }
      return draftValue;
    },
    rerender: render,
    unmount: () => {
      act(() => {
        root?.unmount();
      });
      root = undefined;
    },
  };
};

describe("useDraftValue", () => {
  test("autosaves changed value after 500ms", () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    const draftValue = renderDraftValue({
      savedValue: "saved",
      onSave,
    });

    act(() => {
      draftValue.current.set("draft");
    });
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(onSave).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onSave).toHaveBeenCalledExactlyOnceWith("draft");
  });

  test("supports functional updates", () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    const draftValue = renderDraftValue({
      savedValue: 1,
      onSave,
    });

    act(() => {
      draftValue.current.set((value) => value + 1);
    });

    expect(draftValue.current.value).toBe(2);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onSave).toHaveBeenCalledExactlyOnceWith(2);
  });

  test("flushes pending save on unmount and cancels debounce", () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    const draftValue = renderDraftValue({
      savedValue: "saved",
      onSave,
    });

    act(() => {
      draftValue.current.set("draft");
    });
    draftValue.unmount();
    expect(onSave).toHaveBeenCalledExactlyOnceWith("draft");

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test("does not resync deeply equal saved object", () => {
    let renderCount = 0;
    const draftValue = renderDraftValue({
      savedValue: { count: 1 },
      onSave: vi.fn(),
      onRender: () => {
        renderCount += 1;
      },
    });

    expect(renderCount).toBe(1);
    draftValue.rerender({ count: 1 });
    expect(renderCount).toBe(2);
  });

  test("resyncs changed saved object when not editing", () => {
    const draftValue = renderDraftValue({
      savedValue: { count: 1 },
      onSave: vi.fn(),
    });

    draftValue.rerender({ count: 2 });
    expect(draftValue.current.value).toEqual({ count: 2 });
  });
});
