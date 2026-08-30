import { forwardRef } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./navigation-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { getLinkActivation } from "./navigation-overlay";

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  window.history.replaceState(null, "", "/");
});

const Link = forwardRef<
  HTMLAnchorElement,
  { download?: boolean; href?: string; target?: string }
>(({ download, href = "#destination", target, ...props }, ref) => (
  <a {...props} download={download} href={href} ref={ref} target={target}>
    <span>Destination</span>
  </a>
));

test("closes a popover and preserves hash navigation", async () => {
  render(
    <Popover open>
      <PopoverTrigger>
        <button>Open</button>
      </PopoverTrigger>
      <PopoverContent>
        <Link />
      </PopoverContent>
    </Popover>
  );

  fireEvent.click(screen.getByText("Destination"));

  expect(screen.queryByText("Destination")).toBeNull();
  await waitFor(() => expect(window.location.hash).toBe("#destination"));
});

test("closes a navigation menu when a plain link is activated", () => {
  const onValueChange = vi.fn();
  render(
    <NavigationMenu defaultValue="menu" onValueChange={onValueChange}>
      <NavigationMenuList>
        <NavigationMenuItem value="menu">
          <NavigationMenuTrigger>
            <button>Menu</button>
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <Link />
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );

  fireEvent.click(screen.getByText("Destination"));

  expect(screen.queryByText("Destination")).toBeNull();
  expect(onValueChange).toHaveBeenCalledExactlyOnceWith("");
});

test("preserves controlled Navigation Menu state", () => {
  const onValueChange = vi.fn();
  const menu = (
    <NavigationMenu value="menu" onValueChange={onValueChange}>
      <NavigationMenuList>
        <NavigationMenuItem value="menu">
          <NavigationMenuTrigger>
            <button>Menu</button>
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <Link />
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
  render(menu);

  fireEvent.click(screen.getByText("Destination"));

  expect(screen.getByText("Destination")).toBeDefined();
  expect(onValueChange).toHaveBeenCalledExactlyOnceWith("");
});

test("preserves Navigation Menu Link dismissal behavior", () => {
  const onValueChange = vi.fn();
  render(
    <NavigationMenu defaultValue="menu" onValueChange={onValueChange}>
      <NavigationMenuList>
        <NavigationMenuItem value="menu">
          <NavigationMenuTrigger>
            <button>Menu</button>
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink>
              <Link />
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );

  fireEvent.click(screen.getByText("Destination"));

  expect(screen.queryByText("Destination")).toBeNull();
  expect(onValueChange).toHaveBeenCalledExactlyOnceWith("");
});

test.each([
  ["a modified click", { ctrlKey: true }, {}],
  ["a link opening another context", {}, { target: "_blank" }],
] as const)(
  "keeps a navigation menu open for %s",
  (_name, eventInit, linkProps) => {
    const onValueChange = vi.fn();
    render(
      <NavigationMenu defaultValue="menu" onValueChange={onValueChange}>
        <NavigationMenuList>
          <NavigationMenuItem value="menu">
            <NavigationMenuTrigger>
              <button>Menu</button>
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink>
                <Link {...linkProps} />
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );

    fireEvent.click(screen.getByText("Destination"), eventInit);

    expect(screen.getByText("Destination")).toBeDefined();
    expect(onValueChange).not.toHaveBeenCalled();
  }
);

test("closes a dialog when a nested link element is activated", async () => {
  render(
    <Dialog open>
      <DialogTrigger>
        <button>Open navigation</button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Navigation</DialogTitle>
        <DialogDescription>Choose a destination</DialogDescription>
        <Link />
      </DialogContent>
    </Dialog>
  );

  fireEvent.click(screen.getByText("Destination"));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(document.activeElement).not.toBe(
    screen.getByRole("button", { name: "Open navigation" })
  );
});

test.each(["_parent", "_top"])(
  "recognizes target=%s as same-context navigation at the top level",
  (target) => {
    const anchor = document.createElement("a");
    const child = document.createElement("span");
    anchor.setAttribute("href", "#destination");
    anchor.setAttribute("target", target);
    anchor.append(child);
    const topLevelWindow = {} as Window;
    Object.defineProperties(topLevelWindow, {
      name: { value: "" },
      parent: { value: topLevelWindow },
      top: { value: topLevelWindow },
    });
    const ownerDocument = vi
      .spyOn(anchor, "ownerDocument", "get")
      .mockReturnValue({
        defaultView: topLevelWindow,
        querySelector: () => null,
      } as unknown as Document);

    expect(
      getLinkActivation({
        target: child,
        button: 0,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      })
    ).toBe(anchor);
    ownerDocument.mockRestore();
  }
);

test.each(["_parent", "_top"])(
  "keeps an overlay open for target=%s in a child context",
  (target) => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    const iframeDocument = iframe.contentDocument;
    if (iframeDocument === null) {
      throw new Error("Expected iframe document");
    }
    const anchor = iframeDocument.createElement("a");
    const child = iframeDocument.createElement("span");
    anchor.setAttribute("href", "#destination");
    anchor.setAttribute("target", target);
    anchor.append(child);

    expect(
      getLinkActivation({
        target: child,
        button: 0,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      })
    ).toBeUndefined();

    iframe.remove();
  }
);

test.each([
  ["a modified click", { ctrlKey: true }, {}],
  ["a non-primary click", { button: 1 }, {}],
  ["a download", {}, { download: true }],
  ["a link opening another context", {}, { target: "_blank" }],
  ["an empty fragment", {}, { href: "#" }],
] as const)("keeps a popover open for %s", (_name, eventInit, linkProps) => {
  render(
    <Popover open>
      <PopoverTrigger>
        <button>Open</button>
      </PopoverTrigger>
      <PopoverContent>
        <Link {...linkProps} />
      </PopoverContent>
    </Popover>
  );

  fireEvent.click(screen.getByText("Destination"), eventInit);

  expect(screen.getByText("Destination")).toBeDefined();
});

test("keeps a popover open when the document target opens another context", () => {
  const base = document.createElement("base");
  base.target = "_blank";
  document.head.append(base);

  try {
    render(
      <Popover open>
        <PopoverTrigger>
          <button>Open</button>
        </PopoverTrigger>
        <PopoverContent>
          <Link />
        </PopoverContent>
      </Popover>
    );

    fireEvent.click(screen.getByText("Destination"));

    expect(screen.getByText("Destination")).toBeDefined();
  } finally {
    base.remove();
  }
});

test("keeps navigation overlays interactive on the builder canvas", () => {
  render(
    <ReactSdkContext.Provider
      value={{
        assetBaseUrl: "/",
        imageLoader: ({ src }) => src,
        resources: {},
        breakpoints: [],
        onError: () => {},
        renderer: "canvas",
      }}
    >
      <Popover open>
        <PopoverTrigger>
          <button>Open</button>
        </PopoverTrigger>
        <PopoverContent>
          <Link />
        </PopoverContent>
      </Popover>
    </ReactSdkContext.Provider>
  );

  fireEvent.click(screen.getByText("Destination"));

  expect(screen.getByText("Destination")).toBeDefined();
});

test("closes navigation overlays in builder preview", () => {
  render(
    <ReactSdkContext.Provider
      value={{
        assetBaseUrl: "/",
        imageLoader: ({ src }) => src,
        resources: {},
        breakpoints: [],
        onError: () => {},
        renderer: "preview",
      }}
    >
      <Popover open>
        <PopoverTrigger>
          <button>Open</button>
        </PopoverTrigger>
        <PopoverContent>
          <Link />
        </PopoverContent>
      </Popover>
    </ReactSdkContext.Provider>
  );

  fireEvent.click(screen.getByText("Destination"));

  expect(screen.queryByText("Destination")).toBeNull();
});
