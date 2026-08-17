import { parse, type DefaultTreeAdapterMap } from "parse5";

type Element = DefaultTreeAdapterMap["element"];
type Node = DefaultTreeAdapterMap["node"];

export type RouteElementExpectation = {
  tag?: string;
  id?: string;
  attributes?: Record<string, string>;
};

export type RouteAssertions = {
  status?: number;
  text?: string[];
  elements?: RouteElementExpectation[];
  metadata?: Array<"title" | "description">;
  linksResolve?: boolean;
  resourcesResolve?: boolean;
  imageContentTypes?: boolean;
  structuredDataParses?: boolean;
  structuredDataTypes?: string[];
};

type RouteFetch = typeof fetch;

const isElement = (node: Node): node is Element => "tagName" in node;

const walk = (node: Node, visit: (element: Element) => void) => {
  if (isElement(node)) {
    visit(node);
  }
  if ("childNodes" in node) {
    for (const child of node.childNodes) {
      walk(child, visit);
    }
  }
};

const getAttribute = (element: Element | undefined, name: string) =>
  element?.attrs.find((attribute) => attribute.name === name)?.value;

const getText = (node: Node): string => {
  if ("value" in node && typeof node.value === "string") {
    return node.value;
  }
  if ("childNodes" in node) {
    return node.childNodes.map(getText).join("");
  }
  return "";
};

const getVisibleText = (node: Node): string => {
  if (
    isElement(node) &&
    ["script", "style", "template", "noscript", "head"].includes(node.tagName)
  ) {
    return "";
  }
  if ("value" in node && typeof node.value === "string") {
    return node.value;
  }
  if ("childNodes" in node) {
    return node.childNodes.map(getVisibleText).join("");
  }
  return "";
};

const matchesElement = (
  element: Element,
  expectation: RouteElementExpectation
) => {
  if (
    expectation.tag !== undefined &&
    element.tagName !== expectation.tag.toLocaleLowerCase()
  ) {
    return false;
  }
  if (
    expectation.id !== undefined &&
    getAttribute(element, "id") !== expectation.id
  ) {
    return false;
  }
  return Object.entries(expectation.attributes ?? {}).every(
    ([name, value]) => getAttribute(element, name) === value
  );
};

const fetchResource = async ({
  url,
  fetchImpl,
  signal,
}: {
  url: string;
  fetchImpl: RouteFetch;
  signal?: AbortSignal;
}) => {
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      signal,
    });
    return {
      url,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get("content-type") ?? undefined,
    };
  } catch (error) {
    return {
      url,
      status: 0,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const hasStructuredDataType = (
  value: unknown,
  expectedType: string
): boolean => {
  if (Array.isArray(value)) {
    return value.some((item) => hasStructuredDataType(item, expectedType));
  }
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const type = record["@type"];
  if (
    type === expectedType ||
    (Array.isArray(type) && type.includes(expectedType))
  ) {
    return true;
  }
  return hasStructuredDataType(record["@graph"], expectedType);
};

export const renderAndVerifyRoute = async ({
  baseUrl,
  path,
  assertions = {},
  maxDurationMs,
  fetchImpl = fetch,
}: {
  baseUrl: string;
  path: string;
  assertions?: RouteAssertions;
  maxDurationMs?: number;
  fetchImpl?: RouteFetch;
}) => {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout =
    maxDurationMs === undefined
      ? undefined
      : setTimeout(() => controller.abort(), maxDurationMs);
  try {
    const routeUrl = new URL(path, baseUrl).href;
    const response = await fetchImpl(routeUrl, {
      redirect: "follow",
      signal: controller.signal,
    });
    const html = await response.text();
    const document = parse(html);
    const elements: Element[] = [];
    walk(document, (element) => elements.push(element));
    const title = elements.find((element) => element.tagName === "title");
    const description = elements.find(
      (element) =>
        element.tagName === "meta" &&
        getAttribute(element, "name")?.toLocaleLowerCase() === "description"
    );
    const urls = new Map<string, { kind: "image" | "link" | "resource" }>();
    for (const element of elements) {
      const source = getAttribute(element, "src");
      const href = getAttribute(element, "href");
      if (element.tagName === "img" && source !== undefined) {
        urls.set(new URL(source, routeUrl).href, { kind: "image" });
      } else if (element.tagName === "a" && href !== undefined) {
        if (
          href.startsWith("#") === false &&
          href.startsWith("mailto:") === false
        ) {
          urls.set(new URL(href, routeUrl).href, { kind: "link" });
        }
      } else if (
        (element.tagName === "script" && source !== undefined) ||
        (element.tagName === "link" && href !== undefined)
      ) {
        urls.set(new URL(source ?? href!, routeUrl).href, { kind: "resource" });
      }
    }
    const shouldFetch = (kind: "image" | "link" | "resource") =>
      (kind === "image" &&
        (assertions.resourcesResolve || assertions.imageContentTypes)) ||
      (kind === "link" && assertions.linksResolve) ||
      (kind === "resource" && assertions.resourcesResolve);
    const resourceResults = await Promise.all(
      [...urls]
        .filter(([, { kind }]) => shouldFetch(kind))
        .map(async ([url]) =>
          fetchResource({ url, fetchImpl, signal: controller.signal })
        )
    );
    const jsonLd = elements
      .filter(
        (element) =>
          element.tagName === "script" &&
          getAttribute(element, "type")?.toLocaleLowerCase() ===
            "application/ld+json"
      )
      .map((element) => {
        try {
          return { valid: true as const, value: JSON.parse(getText(element)) };
        } catch (error) {
          return {
            valid: false as const,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });
    const checks = [
      ...(assertions.status === undefined
        ? []
        : [
            {
              assertion: "status",
              passed: response.status === assertions.status,
              expected: assertions.status,
              actual: response.status,
            },
          ]),
      ...(assertions.text ?? []).map((text) => ({
        assertion: "text",
        passed: getVisibleText(document).includes(text),
        expected: text,
      })),
      ...(assertions.elements ?? []).map((element) => ({
        assertion: "element",
        passed: elements.some((candidate) =>
          matchesElement(candidate, element)
        ),
        expected: element,
      })),
      ...(assertions.metadata ?? []).map((field) => {
        const value =
          field === "title"
            ? title === undefined
              ? ""
              : getText(title).trim()
            : (getAttribute(description, "content")?.trim() ?? "");
        return {
          assertion: "metadata",
          field,
          passed: value.length > 0,
          actual: value,
        };
      }),
      ...(assertions.linksResolve
        ? [
            {
              assertion: "links-resolve",
              passed: resourceResults
                .filter(({ url }) => urls.get(url)?.kind === "link")
                .every(({ ok }) => ok),
            },
          ]
        : []),
      ...(assertions.resourcesResolve
        ? [
            {
              assertion: "resources-resolve",
              passed: resourceResults
                .filter(({ url }) => urls.get(url)?.kind !== "link")
                .every(({ ok }) => ok),
            },
          ]
        : []),
      ...(assertions.imageContentTypes
        ? [
            {
              assertion: "image-content-types",
              passed: resourceResults
                .filter(({ url }) => urls.get(url)?.kind === "image")
                .every(
                  ({ ok, contentType }) =>
                    ok && contentType?.toLocaleLowerCase().startsWith("image/")
                ),
            },
          ]
        : []),
      ...(assertions.structuredDataParses
        ? [
            {
              assertion: "structured-data-parses",
              passed: jsonLd.length > 0 && jsonLd.every(({ valid }) => valid),
            },
          ]
        : []),
      ...(assertions.structuredDataTypes ?? []).map((type) => ({
        assertion: "structured-data-type",
        passed: jsonLd.some(
          (result) => result.valid && hasStructuredDataType(result.value, type)
        ),
        expected: type,
      })),
    ];
    return {
      route: { url: routeUrl, status: response.status },
      html,
      metadata: {
        title: title === undefined ? undefined : getText(title).trim(),
        description: getAttribute(description, "content"),
      },
      resourceUrls: [...urls.keys()],
      resources: resourceResults,
      structuredData: jsonLd,
      assertions: checks,
      passed: checks.every(({ passed }) => passed),
      elapsedMs: Date.now() - startedAt,
    };
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
};
