import { expect, test, vi } from "vitest";
import { inspectRegistry } from "./registry";

test("inspects an item embedded in a local registry index", async () => {
  const readFile = vi.fn(async () =>
    JSON.stringify({
      items: [
        {
          name: "button",
          title: "Button",
          type: "registry:ui",
          dependencies: ["class-variance-authority"],
          registryDependencies: ["utils"],
          files: [
            {
              path: "registry/new-york/button/button.tsx",
              target: "components/ui/button.tsx",
              type: "registry:ui",
            },
          ],
          docs: "https://example.com/button",
        },
      ],
    })
  );

  await expect(
    inspectRegistry(
      { source: "/tmp/registry.json", item: "button" },
      { readFile, fetch: async (source) => fetch(source) }
    )
  ).resolves.toEqual({
    source: "/tmp/registry.json",
    name: "button",
    title: "Button",
    description: undefined,
    type: "registry:ui",
    dependencies: ["class-variance-authority"],
    devDependencies: [],
    registryDependencies: ["utils"],
    files: [
      {
        path: "registry/new-york/button/button.tsx",
        target: "components/ui/button.tsx",
        type: "registry:ui",
      },
    ],
    docs: "https://example.com/button",
    compatibility: {
      status: "unsupported",
      installation: {
        status: "unsupported",
        reason:
          "Webstudio does not install external shadcn registry files into a project.",
      },
      conversion: {
        status: "unsupported",
        reason:
          "Webstudio does not convert external React registry files into editable Webstudio components yet.",
      },
      requirements: {
        dependencies: ["class-variance-authority"],
        devDependencies: [],
        registryDependencies: ["utils"],
      },
      sourceCode: {
        status: "not-analyzed",
        reason:
          "Inspecting registry metadata does not execute or analyze arbitrary external source files.",
      },
      manualSteps: [
        "Use the item metadata as a reference to recreate the UI with Webstudio components and styles.",
      ],
    },
  });
  expect(readFile).toHaveBeenCalledWith("/tmp/registry.json", "utf8");
});

test("loads a remote item file when the registry index only lists its name", async () => {
  const fetch = vi.fn(async (source: string) => ({
    ok: true,
    status: 200,
    text: async () =>
      source.endsWith("registry.json")
        ? JSON.stringify({ items: [{ name: "dialog" }] })
        : JSON.stringify({
            name: "dialog",
            files: [
              {
                path: "registry/new-york/dialog/dialog.tsx",
                type: "registry:ui",
              },
            ],
          }),
  }));

  await expect(
    inspectRegistry(
      {
        source: "https://registry.example.com/r/registry.json",
        item: "dialog",
      },
      { readFile: vi.fn(), fetch: async (source) => fetch(source) }
    )
  ).resolves.toMatchObject({
    source: "https://registry.example.com/r/dialog.json",
    name: "dialog",
    files: [
      {
        path: "registry/new-york/dialog/dialog.tsx",
        type: "registry:ui",
      },
    ],
    compatibility: {
      status: "unsupported",
      requirements: { registryDependencies: [] },
    },
  });
  expect(fetch).toHaveBeenNthCalledWith(
    1,
    "https://registry.example.com/r/registry.json"
  );
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    "https://registry.example.com/r/dialog.json"
  );
});

test("preserves multi-file items and transitive registry dependencies", async () => {
  await expect(
    inspectRegistry(
      { source: "/tmp/accordion.json" },
      {
        readFile: vi.fn(async () =>
          JSON.stringify({
            name: "accordion",
            title: "Accordion",
            type: "registry:ui",
            dependencies: ["@radix-ui/react-accordion"],
            devDependencies: ["tailwindcss-animate"],
            registryDependencies: ["button", "separator"],
            files: [
              {
                path: "registry/new-york/accordion/accordion.tsx",
                target: "components/ui/accordion.tsx",
                type: "registry:ui",
              },
              {
                path: "registry/new-york/accordion/accordion-demo.tsx",
                target: "components/accordion-demo.tsx",
                type: "registry:example",
              },
            ],
            docs: "https://example.com/accordion",
          })
        ),
        fetch: async (source) => fetch(source),
      }
    )
  ).resolves.toEqual({
    source: "/tmp/accordion.json",
    name: "accordion",
    title: "Accordion",
    description: undefined,
    type: "registry:ui",
    dependencies: ["@radix-ui/react-accordion"],
    devDependencies: ["tailwindcss-animate"],
    registryDependencies: ["button", "separator"],
    files: [
      {
        path: "registry/new-york/accordion/accordion.tsx",
        target: "components/ui/accordion.tsx",
        type: "registry:ui",
      },
      {
        path: "registry/new-york/accordion/accordion-demo.tsx",
        target: "components/accordion-demo.tsx",
        type: "registry:example",
      },
    ],
    docs: "https://example.com/accordion",
    compatibility: {
      status: "unsupported",
      installation: expect.objectContaining({ status: "unsupported" }),
      conversion: expect.objectContaining({ status: "unsupported" }),
      requirements: {
        dependencies: ["@radix-ui/react-accordion"],
        devDependencies: ["tailwindcss-animate"],
        registryDependencies: ["button", "separator"],
      },
      sourceCode: expect.objectContaining({ status: "not-analyzed" }),
      manualSteps: expect.any(Array),
    },
  });
});

test("accepts a matching item name for a direct registry item source", async () => {
  await expect(
    inspectRegistry(
      { source: "/tmp/button.json", item: "button" },
      {
        readFile: vi.fn(async () => JSON.stringify({ name: "button" })),
        fetch: async (source) => fetch(source),
      }
    )
  ).resolves.toMatchObject({ source: "/tmp/button.json", name: "button" });

  await expect(
    inspectRegistry(
      { source: "/tmp/button.json", item: "dialog" },
      {
        readFile: vi.fn(async () => JSON.stringify({ name: "button" })),
        fetch: async (source) => fetch(source),
      }
    )
  ).rejects.toThrow("contains item button, not dialog");
});

test("rejects a registry index without an item name", async () => {
  await expect(
    inspectRegistry(
      { source: "/tmp/registry.json", item: undefined },
      {
        readFile: vi.fn(async () =>
          JSON.stringify({ items: [{ name: "button" }] })
        ),
        fetch,
      }
    )
  ).rejects.toThrow("Pass --item <name>");
});
