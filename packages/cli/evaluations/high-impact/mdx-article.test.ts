import { expect, test } from "vitest";
import { encodeDataSourceVariable } from "@webstudio-is/sdk";
import { mdxArticleFixture } from "./fixtures";
import {
  evaluateHighImpactOutcome,
  type HighImpactEvaluationInput,
} from "./validate";

const successfulInput = (): HighImpactEvaluationInput => {
  const project = structuredClone(mdxArticleFixture.project);
  project.dataSources.push({
    id: "document-data",
    type: "parameter",
    name: "document",
    scopeInstanceId: "article-block",
  });
  project.props.push(
    {
      id: "src",
      instanceId: "article-block",
      name: "src",
      type: "asset",
      value: "article-file",
    },
    {
      id: "document",
      instanceId: "article-block",
      name: "document",
      type: "parameter",
      value: "document-data",
    }
  );
  for (const [id, path] of [
    ["article-title", "title"],
    ["article-author", "author.name"],
    ["article-reading-time", "readingTime"],
  ]) {
    project.instances.find((instance) => instance.id === id)!.children = [
      {
        type: "expression",
        mode: "readwrite",
        value: `${encodeDataSourceVariable("document-data")}.frontmatter.${path}`,
      },
    ];
  }
  return {
    fixture: mdxArticleFixture,
    project,
    toolCalls: [
      "meta.guide",
      "connect-content-block-source",
      "update-content-block-frontmatter",
      "reload-content-block-source",
      "inspect-content-block-source",
      "audit",
    ].map((name) => ({ name })),
    mdxDocument: {
      frontmatter: {
        title: "Aurora trails",
        author: { name: "Noor Silva" },
        readingTime: 6,
        draft: false,
      },
      body: "## Plan your route\n\nFollow the marked trail and carry a map.\n",
    },
  };
};

test("accepts an editable MDX article after its author update and reload", () => {
  expect(evaluateHighImpactOutcome(successfulInput())).toMatchObject({
    passed: true,
    failures: [],
  });
});

test.each([
  ["read-only", "article-author-editable"],
  ["query-bound", "article-author-editable"],
  ["concatenated", "article-reading-time-editable"],
  ["outside-block", "article-title-editable"],
  ["lost-metadata", "mdxMetadataPreserved"],
  ["lost-body", "mdxBodyPreserved"],
  ["disconnected", "mdxSourceConnected"],
  ["not-reloaded", "mdxSavedAndReloaded"],
  ["missing-document-variable", "mdxDocumentVariable"],
  ["wrong-document-scope", "mdxDocumentVariable"],
  ["detached-suffix", "mdxSuffixPreserved"],
] as const)("rejects an article that is %s", (failure, check) => {
  const input = successfulInput();
  const author = input.project.instances.find(
    (instance) => instance.id === "article-author"
  )!;
  const readingTime = input.project.instances.find(
    (instance) => instance.id === "article-reading-time"
  )!;
  if (failure === "read-only") {
    author.children = [
      {
        type: "expression",
        mode: "read",
        value: `${encodeDataSourceVariable("document-data")}.frontmatter.author.name`,
      },
    ];
  }
  if (failure === "query-bound") {
    author.children = [
      {
        type: "expression",
        mode: "readwrite",
        value: `${encodeDataSourceVariable("query-data")}.data.properties.author.name`,
      },
    ];
  }
  if (failure === "concatenated") {
    readingTime.children = [
      {
        type: "expression",
        mode: "readwrite",
        value: `${encodeDataSourceVariable("document-data")}.frontmatter.readingTime + " min read"`,
      },
    ];
  }
  if (failure === "outside-block") {
    const block = input.project.instances.find(
      (instance) => instance.id === "article-block"
    )!;
    block.children = block.children.filter(
      (child) => child.value !== "article-title"
    );
  }
  if (failure === "lost-metadata") {
    delete input.mdxDocument!.frontmatter.draft;
  }
  if (failure === "lost-body") {
    input.mdxDocument!.body = "";
  }
  if (failure === "disconnected") {
    input.project.props = input.project.props.filter(
      (prop) => prop.name !== "src"
    );
  }
  if (failure === "not-reloaded") {
    input.toolCalls = input.toolCalls.filter(
      (call) => call.name !== "reload-content-block-source"
    );
  }
  if (failure === "missing-document-variable") {
    input.project.dataSources = [];
  }
  if (failure === "wrong-document-scope") {
    input.project.dataSources[0].scopeInstanceId = "home-root";
  }
  if (failure === "detached-suffix") {
    const block = input.project.instances.find(
      (instance) => instance.id === "article-block"
    )!;
    block.children = block.children.filter(
      (child) => child.value !== "article-reading-suffix"
    );
  }
  const result = evaluateHighImpactOutcome(input);
  expect(result.passed).toBe(false);
  expect(result.checks[check]).toBe("failed");
});
