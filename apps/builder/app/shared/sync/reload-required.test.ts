import { $syncStatus } from "@webstudio-is/sync-client";
import { afterEach, expect, test, vi } from "vitest";
import { requireBuilderReload } from "./reload-required";

afterEach(() => {
  $syncStatus.set({ status: "idle" });
});

test("uses the standard fatal sync state and reload flow", () => {
  const reload = vi.fn();
  const confirm = vi.fn(() => true);

  requireBuilderReload({
    error: "The MDX file changed remotely.",
    target: { confirm, location: { reload } } as never,
  });

  expect(confirm).toHaveBeenCalledWith("The MDX file changed remotely.");
  expect(reload).toHaveBeenCalledOnce();
  expect($syncStatus.get()).toEqual({
    status: "fatal",
    error: "The MDX file changed remotely.",
  });
});

test("shows one reload confirmation when the same fatal error is reported repeatedly", () => {
  const reload = vi.fn();
  const confirm = vi.fn(() => false);
  const input = {
    error: "This file changed since it was opened.",
    target: { confirm, location: { reload } } as never,
  };

  requireBuilderReload(input);
  requireBuilderReload(input);
  requireBuilderReload(input);

  expect(confirm).toHaveBeenCalledOnce();
  expect(reload).not.toHaveBeenCalled();
  expect($syncStatus.get()).toEqual({
    status: "fatal",
    error: "This file changed since it was opened.",
  });
});
