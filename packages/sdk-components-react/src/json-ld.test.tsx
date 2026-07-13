import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { JsonLd } from "./json-ld";

test("renders safely serialized JSON-LD without a wrapper", () => {
  const markup = renderToStaticMarkup(
    <JsonLd
      code={JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Acme </script><script>unsafe()</script>",
      })}
    />
  );

  expect(markup).toContain('<script type="application/ld+json">');
  expect(markup).toContain('"@type":"Organization"');
  expect(markup).toContain("\\u003c/script>");
  expect(markup).not.toContain("</script><script>unsafe()");
  expect(markup.startsWith("<script")).toBe(true);
});

test("renders structured values produced by expression bindings", () => {
  expect(
    renderToStaticMarkup(
      <JsonLd
        code={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Acme",
        }}
      />
    )
  ).toContain(
    '{"@context":"https://schema.org","@type":"Organization","name":"Acme"}'
  );
});

test.each(["", "not json", '"text"', "null", "1"])(
  "omits invalid JSON-LD value %j from published output",
  (code) => {
    expect(renderToStaticMarkup(<JsonLd code={code} />)).toBe("");
  }
);

test("omits structurally invalid JSON-LD from published output", () => {
  expect(
    renderToStaticMarkup(
      <JsonLd code='{"@context":"https://schema.org","@type":1}' />
    )
  ).toBe("");
});

test("renders visible JSON-LD code on canvas", () => {
  const markup = renderToStaticMarkup(
    <ReactSdkContext.Provider
      value={{
        assetBaseUrl: "",
        imageLoader: ({ src }) => src,
        renderer: "canvas",
        resources: {},
        breakpoints: [],
        onError: console.error,
      }}
    >
      <JsonLd code={{ "@context": "https://schema.org", name: "Acme" }} />
    </ReactSdkContext.Provider>
  );

  expect(markup).toContain("&lt;script");
  expect(markup).toContain("application/ld+json");
  expect(markup).toContain(
    "{&quot;@context&quot;:&quot;https://schema.org&quot;,&quot;name&quot;:&quot;Acme&quot;}"
  );
  expect(markup).toContain("&lt;/script&gt;");
  expect(markup).not.toContain('<script type="application/ld+json">');
});

test("renders an invalid dynamic JSON-LD placeholder on canvas", () => {
  const markup = renderToStaticMarkup(
    <ReactSdkContext.Provider
      value={{
        assetBaseUrl: "",
        imageLoader: ({ src }) => src,
        renderer: "canvas",
        resources: {},
        breakpoints: [],
        onError: console.error,
      }}
    >
      <JsonLd code={undefined} />
    </ReactSdkContext.Provider>
  );

  expect(markup).toContain("JSON-LD value is unavailable or invalid.");
  expect(markup).not.toContain('<script type="application/ld+json">');
});

test("updates canvas preview after dynamic JSON-LD becomes valid", () => {
  const context = {
    assetBaseUrl: "",
    imageLoader: ({ src }: { src: string }) => src,
    renderer: "canvas" as const,
    resources: {},
    breakpoints: [],
    onError: console.error,
  };
  const invalidMarkup = renderToStaticMarkup(
    <ReactSdkContext.Provider value={context}>
      <JsonLd code={{ "@type": 1 }} />
    </ReactSdkContext.Provider>
  );

  expect(invalidMarkup).toContain("JSON-LD value is unavailable or invalid.");

  const validMarkup = renderToStaticMarkup(
    <ReactSdkContext.Provider value={context}>
      <JsonLd
        code={{
          "@context": "https://schema.org",
          "@type": "Organization",
        }}
      />
    </ReactSdkContext.Provider>
  );

  expect(validMarkup).toContain("&quot;@type&quot;:&quot;Organization&quot;");
  expect(validMarkup).not.toContain("JSON-LD value is unavailable or invalid.");
});

test("keeps Schema.org vocabulary data out of the published component bundle", async () => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL("./json-ld.tsx", import.meta.url))],
    bundle: true,
    write: false,
    metafile: true,
    format: "esm",
    platform: "browser",
    conditions: ["webstudio"],
    external: ["react", "react/jsx-runtime", "@webstudio-is/react-sdk/runtime"],
  });

  expect(
    Object.keys(result.metafile?.inputs ?? {}).some(
      (path) =>
        path.endsWith("/schema-org.ts") || path.endsWith("/schema-org-data.ts")
    )
  ).toBe(false);
});
