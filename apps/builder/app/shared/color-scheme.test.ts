import { describe, expect, test, vi } from "vitest";
import {
  applyColorScheme,
  colorSchemeCookieName,
  createColorSchemeBootstrapScript,
  clientSettingsStorageKey,
  initializeStoredColorScheme,
  parseColorSchemeCookie,
  serializeColorSchemeCookie,
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
  test("prefers the shared cookie over origin-local settings", () => {
    const root = document.createElement("html");
    const storage = {
      getItem: vi.fn(() => JSON.stringify({ colorScheme: "light" })),
    };

    initializeStoredColorScheme({
      root,
      storage,
      storageKey: clientSettingsStorageKey,
      storedPreference: "dark",
      prefersDark: false,
    });

    expect(root.dataset.colorScheme).toBe("dark");
  });

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

  test("the document bootstrap applies the shared scheme synchronously", () => {
    localStorage.setItem(
      clientSettingsStorageKey,
      JSON.stringify({ colorScheme: "light" })
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

    Function(createColorSchemeBootstrapScript("dark"))();

    expect(document.documentElement.dataset.colorScheme).toBe("dark");

    window.matchMedia = originalMatchMedia;
    localStorage.clear();
    delete document.documentElement.dataset.colorScheme;
  });
});

describe("shared color scheme cookie", () => {
  test("round-trips a preference across subdomains", () => {
    const serialized = serializeColorSchemeCookie({
      preference: "dark",
      domain: "apps.webstudio.is",
      secure: true,
    });

    expect(serialized).toContain(`${colorSchemeCookieName}=dark`);
    expect(serialized).toContain("Domain=apps.webstudio.is");
    expect(serialized).toContain("Path=/");
    expect(serialized).toContain("Secure");
    expect(parseColorSchemeCookie(serialized)).toBe("dark");
  });

  test("ignores missing and invalid preferences", () => {
    expect(parseColorSchemeCookie(undefined)).toBeUndefined();
    expect(
      parseColorSchemeCookie(`${colorSchemeCookieName}=sepia`)
    ).toBeUndefined();
  });
});
