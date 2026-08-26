/**
 * @vitest-environment jsdom
 */
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

afterEach(cleanup);

const Link = forwardRef<
  HTMLAnchorElement,
  { download?: boolean; href?: string; target?: string }
>(({ download, href = "#destination", target, ...props }, ref) => (
  <a {...props} download={download} href={href} ref={ref} target={target}>
    <span>Destination</span>
  </a>
));

test("closes a popover when a nested link element is activated", () => {
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
});

test("closes a navigation menu when a plain link is activated", () => {
  const onValueChange = vi.fn();
  render(
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

  fireEvent.click(screen.getByText("Destination"));

  expect(screen.queryByText("Destination")).toBeNull();
  expect(onValueChange).toHaveBeenCalledExactlyOnceWith("");
});

test("preserves Navigation Menu Link dismissal behavior", () => {
  const onValueChange = vi.fn();
  render(
    <NavigationMenu value="menu" onValueChange={onValueChange}>
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

test("closes a dialog when a nested link element is activated", async () => {
  render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>Navigation</DialogTitle>
        <DialogDescription>Choose a destination</DialogDescription>
        <Link />
      </DialogContent>
    </Dialog>
  );

  fireEvent.click(screen.getByText("Destination"));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

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
