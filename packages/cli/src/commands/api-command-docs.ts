import { readCliDoc } from "../docs";

const apiUseCasesMarkdown = readCliDoc("api-use-cases");

type UseCaseScenario = {
  useCase: string;
  commands: string[];
  notes?: string[];
  patchNamespaces?: string[];
};

type KnownCliGap = {
  capability: string;
  missing: string;
  currentFallback: string;
  suggestedCommands: string[];
};

const getHeadingBlocks = (markdown: string) => {
  const matches = [...markdown.matchAll(/^## (.+)$/gm)];
  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? markdown.length;
    return {
      title: match[1],
      body: markdown.slice(start, end).trim(),
    };
  });
};

const getSectionList = (body: string, label: string) => {
  const lines = body.split(/\r?\n/);
  const labelIndex = lines.findIndex((line) => line === `${label}:`);
  if (labelIndex === -1) {
    return undefined;
  }
  const values: string[] = [];
  for (const line of lines.slice(labelIndex + 1)) {
    if (line.startsWith("- ")) {
      const value = line.slice(2).trim();
      if (value !== "none") {
        values.push(value);
      }
      continue;
    }
    if (line.trim() !== "") {
      break;
    }
    if (values.length > 0) {
      break;
    }
  }
  return values;
};

const getSectionParagraph = (body: string, label: string) => {
  const lines = body.split(/\r?\n/);
  const labelIndex = lines.findIndex((line) => line === `${label}:`);
  if (labelIndex === -1) {
    return "";
  }
  return (
    lines
      .slice(labelIndex + 1)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(0) ?? ""
  );
};

const [useCasesMarkdown, knownGapsMarkdown = ""] = apiUseCasesMarkdown.split(
  "\n# Known CLI Gaps\n"
);

export const useCaseScenarios = getHeadingBlocks(useCasesMarkdown).map(
  ({ title, body }) => {
    const notes = getSectionList(body, "Notes");
    const patchNamespaces = getSectionList(body, "Patch namespaces");
    return {
      useCase: title,
      commands: getSectionList(body, "Commands") ?? [],
      ...(notes === undefined ? {} : { notes }),
      ...(patchNamespaces === undefined ? {} : { patchNamespaces }),
    };
  }
) satisfies UseCaseScenario[];

export const knownCliGaps = getHeadingBlocks(knownGapsMarkdown).map(
  ({ title, body }) => ({
    capability: title,
    missing: getSectionParagraph(body, "Missing"),
    currentFallback: getSectionParagraph(body, "Current fallback"),
    suggestedCommands: getSectionList(body, "Suggested commands") ?? [],
  })
) satisfies KnownCliGap[];
