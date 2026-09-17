type MarkdownNode = {
  type: string;
  value?: unknown;
  children?: MarkdownNode[];
  data?: Record<string, unknown>;
};

export const githubAlertTypes = [
  "NOTE",
  "TIP",
  "IMPORTANT",
  "WARNING",
  "CAUTION",
] as const;

export type GithubAlertType = (typeof githubAlertTypes)[number];

export const getGithubAlertType = (node: unknown) => {
  if (typeof node !== "object" || node === null || !("data" in node)) {
    return;
  }
  const data = node.data;
  if (typeof data !== "object" || data === null || !("githubAlert" in data)) {
    return;
  }
  const type = data.githubAlert;
  return githubAlertTypes.find((candidate) => candidate === type);
};

const getMarker = (value: string) => {
  for (const type of githubAlertTypes) {
    const marker = `[!${type}]`;
    if (value === marker) {
      return { type, length: marker.length };
    }
    if (value.startsWith(`${marker}\n`)) {
      return { type, length: marker.length + 1 };
    }
    if (value.startsWith(`${marker}\r\n`)) {
      return { type, length: marker.length + 2 };
    }
  }
};

export const transformGithubAlerts = (tree: unknown) => {
  const visit = (node: MarkdownNode) => {
    for (const child of node.children ?? []) {
      visit(child);
    }
    if (node.type !== "blockquote") {
      return;
    }
    const paragraph = node.children?.[0];
    const markerNode = paragraph?.children?.[0];
    if (
      paragraph?.type !== "paragraph" ||
      markerNode?.type !== "text" ||
      typeof markerNode.value !== "string"
    ) {
      return;
    }
    const marker = getMarker(markerNode.value);
    if (marker === undefined) {
      return;
    }
    markerNode.value = markerNode.value.slice(marker.length);
    if (markerNode.value === "") {
      paragraph.children?.shift();
    }
    if (paragraph.children?.length === 0) {
      node.children?.shift();
    }
    node.data = { ...node.data, githubAlert: marker.type };
  };
  if (typeof tree === "object" && tree !== null && "type" in tree) {
    visit(tree as MarkdownNode);
  }
};

export const remarkGithubAlerts = () => transformGithubAlerts;
