import { readCliDoc } from "./docs";

const mcpVisionMarkdown = readCliDoc("mcp-vision");

const getSection = (markdown: string, heading: string) => {
  const lines = markdown.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line === `## ${heading}`);
  if (startIndex === -1) {
    throw new Error(`Missing markdown section "${heading}".`);
  }
  const endIndex = lines.findIndex(
    (line, index) => index > startIndex && line.startsWith("## ")
  );
  return lines
    .slice(startIndex + 1, endIndex === -1 ? undefined : endIndex)
    .join("\n")
    .trim();
};

const getParagraph = (heading: string) =>
  getSection(mcpVisionMarkdown, heading);

const getListItems = (heading: string) =>
  getSection(mcpVisionMarkdown, heading)
    .split(/\r?\n/)
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());

export const generatedAppDependencyNotes = getListItems(
  "Generated App Dependency Notes"
);

export const visualVerificationRule = getParagraph("Visual Verification Rule");

const visionVerificationLoopItems = getListItems("Vision Verification Loop");

export const getVisionVerificationLoop = ({
  includeDiff,
}: {
  includeDiff: boolean;
}) =>
  visionVerificationLoopItems.flatMap((step) => {
    if (step === "{{dependency-notes}}") {
      return generatedAppDependencyNotes;
    }
    if (step.startsWith("{{diff}} ")) {
      return includeDiff ? [step.slice("{{diff}} ".length)] : [];
    }
    return [step];
  });

export const getVisionWorkflowSummary = ({
  includeDiff,
}: {
  includeDiff: boolean;
}) =>
  includeDiff
    ? getParagraph("Workflow Summary With Diff")
    : getParagraph("Workflow Summary Without Diff");

export const screenshotVerificationSummary = getParagraph(
  "Screenshot Verification Summary"
);
