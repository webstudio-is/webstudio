import { describe, expect, test, vi } from "vitest";
import {
  applyColorScheme,
  colorSchemeBootstrapScript,
  clientSettingsStorageKey,
  initializeStoredColorScheme,
} from "./color-scheme";

describe("applyColorScheme", () => {
  test.each([
    { preference: "light", prefersDark: false, expected: "light" },
    { preference: "light", prefersDark: true, expected: "light" },
    { preference: "dark", prefersDark: false, expected: "dark" },
    { preference: "dark", prefersDark: true, expected: "dark" },
    { preference: "system", prefersDark: false, expected: "light" },
    { preference: "system", prefersDark: true, expected: "dark" },
  ] as const)(
    "applies $expected for $preference when prefersDark is $prefersDark",
    ({ preference, prefersDark, expected }) => {
      const root = document.createElement("html");

      applyColorScheme({ preference, prefersDark, root });

      expect(root.dataset.colorScheme).toBe(expected);
    }
  );
});

describe("initializeStoredColorScheme", () => {
  test("applies the stored preference before the application renders", () => {
    const root = document.createElement("html");
    const storage = {
      getItem: vi.fn(() => JSON.stringify({ colorScheme: "dark" })),
    };

    initializeStoredColorScheme({
      root,
      storage,
      storageKey: clientSettingsStorageKey,
      prefersDark: false,
    });

    expect(root.dataset.colorScheme).toBe("dark");
  });

  test("falls back to the system scheme when storage is unavailable or invalid", () => {
    const unavailableRoot = document.createElement("html");
    const unavailableStorage = {
      getItem: vi.fn(() => {
        throw new Error("Storage unavailable");
      }),
    };

    initializeStoredColorScheme({
      root: unavailableRoot,
      storage: unavailableStorage,
      storageKey: clientSettingsStorageKey,
      prefersDark: true,
    });

    expect(unavailableRoot.dataset.colorScheme).toBe("dark");

    const invalidRoot = document.createElement("html");
    const invalidStorage = {
      getItem: vi.fn(() => JSON.stringify({ colorScheme: "sepia" })),
    };

    initializeStoredColorScheme({
      root: invalidRoot,
      storage: invalidStorage,
      storageKey: clientSettingsStorageKey,
      prefersDark: true,
    });

    expect(invalidRoot.dataset.colorScheme).toBe("dark");
  });

  test("resolves a stored system preference from the operating system", () => {
    const root = document.createElement("html");
    const storage = {
      getItem: vi.fn(() => JSON.stringify({ colorScheme: "system" })),
    };

    initializeStoredColorScheme({
      root,
      storage,
      storageKey: clientSettingsStorageKey,
      prefersDark: true,
    });

    expect(root.dataset.colorScheme).toBe("dark");
  });

  test("the document bootstrap applies the scheme synchronously", () => {
    localStorage.setItem(
      clientSettingsStorageKey,
      JSON.stringify({ colorScheme: "system" })
    );
    const originalMatchMedia = window.matchMedia;
    const mediaQueryList = {
      matches: true,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } satisfies MediaQueryList;
    window.matchMedia = vi.fn(() => mediaQueryList);

    Function(colorSchemeBootstrapScript)();

    expect(document.documentElement.dataset.colorScheme).toBe("dark");

    window.matchMedia = originalMatchMedia;
    localStorage.clear();
    delete document.documentElement.dataset.colorScheme;
  });
});
