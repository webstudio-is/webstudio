import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import "../colors/colors.css";
import { Button, LinkButton } from "./button";
import { Dialog, DialogContent, DialogMaximize, DialogTitle } from "./dialog";
import { useState } from "react";
import { userEvent } from "@vitest/browser/context";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./dropdown-menu";
import { MenuCheckedAndSetIcon } from "./menu";

let root: Root | undefined;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-color-scheme");
});

test.each(["light", "dark"] as const)(
  "dropdowns rise above dialogs in %s mode",
  async (mode) => {
    document.documentElement.dataset.colorScheme = mode;
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <Dialog open>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Dialog</DialogTitle>
            <DropdownMenu defaultOpen>
              <DropdownMenuTrigger asChild>
                <Button>Actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Action</DropdownMenuItem>
                <DropdownMenuItem icon={<MenuCheckedAndSetIcon />}>
                  Set
                </DropdownMenuItem>
                <DropdownMenuItem destructive>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </DialogContent>
        </Dialog>
      )
    );
    await vi.waitFor(() =>
      expect(document.querySelector('[role="menu"]')).not.toBeNull()
    );

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    const brightness = (element: Element) => {
      context.fillStyle = getComputedStyle(element).backgroundColor;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data)
        .slice(0, 3)
        .reduce((sum, channel) => sum + channel, 0);
    };
    const dialog = brightness(document.querySelector('[role="dialog"]')!);
    const menu = brightness(document.querySelector('[role="menu"]')!);
    expect(mode === "light" ? menu < dialog : menu > dialog).toBe(true);

    const color = (element: Element, property: "color" | "backgroundColor") => {
      context.fillStyle = getComputedStyle(element)[property];
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
    };
    const luminance = (channels: number[]) =>
      channels
        .map((channel) => {
          const value = channel / 255;
          return value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
        })
        .reduce(
          (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
          0
        );
    const background = luminance(
      color(document.querySelector('[role="menu"]')!, "backgroundColor")
    );
    const contrast = (element: Element) => {
      const foreground = luminance(color(element, "color"));
      return (
        (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05)
      );
    };
    expect(
      contrast(document.querySelector('[role="menuitem"]:last-child')!),
      `${mode} destructive menu text contrast`
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(document.querySelector('[role="menuitem"] svg')!),
      `${mode} set icon contrast`
    ).toBeGreaterThanOrEqual(3);
  }
);

test("shows the maximize button hover background", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <Dialog open>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>
            Editor
            <DialogMaximize />
          </DialogTitle>
        </DialogContent>
      </Dialog>
    );
  });

  const maximizeButton = document.querySelector<HTMLButtonElement>(
    '[aria-label="Expand"]'
  );
  expect(maximizeButton).not.toBeNull();
  await userEvent.hover(maximizeButton!);
  expect(getComputedStyle(maximizeButton!).backgroundColor).not.toBe(
    "rgba(0, 0, 0, 0)"
  );
});

test("keeps the first and subsequent drag positions when only the title must remain visible", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <Dialog open draggable>
        <DialogContent width={640} height={480} aria-describedby={undefined}>
          <DialogTitle>MDX editor</DialogTitle>
        </DialogContent>
      </Dialog>
    );
  });
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
  const title = dialog.querySelector<HTMLElement>('[draggable="true"]')!;
  for (const top of [window.innerHeight - 150, window.innerHeight - 100]) {
    const initial = dialog.getBoundingClientRect();
    const dataTransfer = new DataTransfer();
    await act(async () => {
      title.dispatchEvent(
        new DragEvent("dragstart", {
          bubbles: true,
          clientX: initial.x + 20,
          clientY: initial.y + 20,
          dataTransfer,
        })
      );
      title.dispatchEvent(
        new DragEvent("drag", {
          bubbles: true,
          clientX: initial.x + 20,
          clientY: top + 20,
          dataTransfer,
        })
      );
      title.dispatchEvent(
        new DragEvent("dragend", { bubbles: true, dataTransfer })
      );
    });
    expect(dialog.getBoundingClientRect().top).toBe(top);
    expect(dialog.getBoundingClientRect().height).toBe(initial.height);
  }
  await act(async () => {
    root?.render(
      <Dialog open draggable>
        <DialogContent width={300} height={150} aria-describedby={undefined}>
          <DialogTitle>MDX editor</DialogTitle>
        </DialogContent>
      </Dialog>
    );
  });
  expect(dialog.getBoundingClientRect().width).toBe(300);
  expect(dialog.getBoundingClientRect().height).toBe(150);
});

test.each([false, true])(
  "contains Escape within the dialog (dismissal prevented: %s)",
  async (preventDismissal) => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const panelKeyDown = vi.fn();
    const dialogKeyDown = vi.fn();
    const onOpenChange = vi.fn();
    await act(async () => {
      root?.render(
        <div onKeyDown={panelKeyDown}>
          <Dialog open onOpenChange={onOpenChange}>
            <DialogContent
              aria-describedby={undefined}
              onKeyDown={dialogKeyDown}
              onEscapeKeyDown={(event) => {
                if (preventDismissal) {
                  event.preventDefault();
                }
              }}
            >
              <DialogTitle>Confirmation</DialogTitle>
              <Button color="primary">Continue</Button>
            </DialogContent>
          </Dialog>
        </div>
      );
    });
    await act(async () => {
      await userEvent.keyboard("{Escape}");
      await new Promise(requestAnimationFrame);
    });
    expect(dialogKeyDown).toHaveBeenCalledOnce();
    expect(panelKeyDown).not.toHaveBeenCalled();
    if (preventDismissal) {
      expect(onOpenChange).not.toHaveBeenCalled();
    } else {
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    }
    await act(async () => userEvent.keyboard("a"));
    expect(panelKeyDown).toHaveBeenCalledOnce();
  }
);

test.each([false, true])(
  "keeps the primary action visibly focused after opening (menu: %s)",
  async (menu) => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const Example = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          {menu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>Actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setOpen(true)}>
                  Convert
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => setOpen(true)}>Convert</Button>
          )}
          {open && (
            <Dialog open>
              <DialogContent aria-describedby={undefined}>
                <DialogTitle>Confirm conversion</DialogTitle>
                <Button>Cancel</Button>
                <Button color="destructive">Confirm</Button>
              </DialogContent>
            </Dialog>
          )}
        </>
      );
    };
    await act(async () => root?.render(<Example />));
    await act(async () => userEvent.click(container.querySelector("button")!));
    if (menu) {
      await act(async () =>
        userEvent.click(document.querySelector('[role="menuitem"]')!)
      );
    }
    await act(async () => new Promise((resolve) => setTimeout(resolve, 100)));
    const action = document.querySelector('[data-button-color="destructive"]');
    expect(action).not.toBeNull();
    expect(document.activeElement).toBe(action);
    expect(getComputedStyle(action!).outlineStyle).toBe("solid");
    expect(getComputedStyle(action!).outlineWidth).toBe("1px");
    await act(async () =>
      userEvent.click(document.querySelector('[role="dialog"] button')!)
    );
    expect(document.activeElement).not.toBe(action);
    expect(getComputedStyle(action!).outlineStyle).toBe("none");
  }
);

test.each(["primary", "destructive", "link"] as const)(
  "focuses the enabled %s action on opening, without activating it",
  async (variant) => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    let action: HTMLElement | null = null;
    let activated = false;
    await act(async () => {
      root?.render(
        <Dialog open>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Confirmation</DialogTitle>
            <Button>Cancel</Button>
            <Button color="primary" disabled>
              Unavailable
            </Button>
            <Button color="primary" state="pending">
              Pending
            </Button>
            <Button color="primary" css={{ display: "none" }}>
              Hidden
            </Button>
            <Button color="primary" css={{ visibility: "hidden" }}>
              Invisible
            </Button>
            <LinkButton color="primary" href="#" aria-disabled>
              Unavailable link
            </LinkButton>
            {variant === "link" ? (
              <LinkButton
                color="primary"
                href="#"
                ref={(element) => {
                  action = element;
                }}
                onClick={() => {
                  activated = true;
                }}
              >
                Continue
              </LinkButton>
            ) : (
              <Button
                color={variant}
                ref={(element) => {
                  action = element;
                }}
                onClick={() => {
                  activated = true;
                }}
              >
                Continue
              </Button>
            )}
          </DialogContent>
        </Dialog>
      );
    });
    expect(action).not.toBeNull();
    expect(document.activeElement).toBe(action);
    expect(activated).toBe(false);
  }
);
