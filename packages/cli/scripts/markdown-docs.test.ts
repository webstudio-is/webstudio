import { describe, expect, test } from "vitest";
import {
  buildDocTitles,
  buildDocSections,
  stripDocMeta,
} from "./markdown-docs";

describe("markdown docs metadata extraction", () => {
  test("builds directive-marked doc sections", () => {
    const docs = {
      "manual-api": `# API

::doc-section{field="safetyRules"}

Rules:

- API rule.

::doc-section{field="safetyRules"}

## Safety Rules

- Safety rule.`,
      "manual-llm": `# LLM

::doc-section{field="implementationProcess"}

## LLM Implementation Process

1. Discover.

::doc-section{field="visualDesignWorkflow"}

## Visual Design Workflow

- Verify visually.

::doc-section{field="generatedFileGuardrails"}

## Generated Files Guardrails

- Avoid generated files.

::doc-section{field="rules"}

## Rules

- LLM rule.`,
      "manual-mcp": `# MCP

::doc-section{field="rules"}

## Core Rules

- MCP rule.`,
    };

    expect(buildDocSections(docs)).toEqual({
      "manual-api": {
        safetyRules: ["API rule.", "Safety rule."],
      },
      "manual-llm": {
        implementationProcess: ["Discover."],
        visualDesignWorkflow: ["Verify visually."],
        generatedFileGuardrails: ["Avoid generated files."],
        rules: ["LLM rule."],
      },
      "manual-mcp": {
        rules: ["MCP rule."],
      },
    });
  });

  test("builds titles and strips generation-only directives", () => {
    const docs = {
      "manual-api": `# API

::doc-section{field="safetyRules"}

## Safety Rules

- Safety rule.`,
    };

    expect(buildDocTitles(docs)).toEqual({
      "manual-api": "API",
    });
    expect(stripDocMeta(docs["manual-api"])).not.toContain("doc-section");
    expect(stripDocMeta(docs["manual-api"])).toContain(
      "# API\n\n## Safety Rules"
    );
  });

  test("fails on empty directive-marked lists", () => {
    expect(() =>
      buildDocSections({
        "manual-mcp":
          '# MCP\n\n::doc-section{field="rules"}\n\n## Core Rules\n\nOnly prose.',
      })
    ).toThrow("Missing generated doc section manual-mcp:rules");

    expect(() =>
      buildDocSections({
        "manual-mcp": "# MCP\n\n## Core Rules\n\n- Rule.",
      })
    ).toThrow("Missing generated doc sections manual-mcp");
  });
});
