import { describe, expect, test } from "vitest";
import { createCanonicalAssetFileEntry } from "./canonical";
import {
  compileContentSource,
  ContentSourceChangedError,
  type ContentSource,
  type ContentSourceFile,
} from "./content-source";

const projectId = "project";

const createFile = (
  values: Partial<ContentSourceFile> & Pick<ContentSourceFile, "id">
): ContentSourceFile => ({
  path: `blog/${values.id}.md`,
  contentType: "text/markdown",
  contentRef: `revisions/${values.id}.md`,
  revision: `revision-${values.id}`,
  size: 20,
  createdAt: "2026-07-27T00:00:00.000Z",
  ...values,
});

const createEntry = (file: ContentSourceFile) =>
  createCanonicalAssetFileEntry({
    projectId,
    document: {
      _id: file.id,
      _type: "asset.file",
      name: file.path.split("/").at(-1) ?? file.id,
      path: file.path,
      key: file.id,
      extension: file.path.split(".").at(-1) ?? "",
      mimeType: file.contentType,
      size: file.size,
      createdAt: file.createdAt,
      revision: file.revision,
      contentRef: file.contentRef,
      properties: { title: file.id },
    },
  });

const getRevision = (files: readonly ContentSourceFile[]) =>
  JSON.stringify(files);

const createMutableSource = ({
  initial,
  mutate,
  mutateEveryAttempt = false,
}: {
  initial: readonly ContentSourceFile[];
  mutate: (files: readonly ContentSourceFile[]) => ContentSourceFile[];
  mutateEveryAttempt?: boolean;
}) => {
  let files = [...initial];
  let openCount = 0;
  const source: ContentSource = {
    async openSnapshot() {
      openCount += 1;
      const captured = files.map((file) => ({ ...file }));
      const revision = getRevision(captured);
      return {
        revision,
        files: captured,
        async loadEntries() {
          if (openCount === 1 || mutateEveryAttempt) {
            files = mutate(files);
          }
          return captured.map(createEntry);
        },
        async isCurrent() {
          return getRevision(files) === revision;
        },
      };
    },
  };
  return {
    source,
    getFiles: () => files,
    getOpenCount: () => openCount,
  };
};

describe("content source snapshots", () => {
  test.each([
    {
      name: "content replacement",
      mutate: ([file]: readonly ContentSourceFile[]) => [
        {
          ...file,
          revision: "replacement-revision",
          contentRef: "revisions/replacement.md",
        },
      ],
      expectedPath: "blog/article.md",
    },
    {
      name: "deletion",
      mutate: () => [],
      expectedPath: undefined,
    },
    {
      name: "folder movement",
      mutate: ([file]: readonly ContentSourceFile[]) => [
        { ...file, path: "archive/article.md" },
      ],
      expectedPath: "archive/article.md",
    },
    {
      name: "filesystem change",
      mutate: ([file]: readonly ContentSourceFile[]) => [
        { ...file, revision: "filesystem-revision", size: file.size + 1 },
      ],
      expectedPath: "blog/article.md",
    },
  ])("retries after $name", async ({ mutate, expectedPath }) => {
    const { source, getFiles, getOpenCount } = createMutableSource({
      initial: [createFile({ id: "article" })],
      mutate,
    });

    const result = await compileContentSource({ source, projectId });

    expect(getOpenCount()).toBe(2);
    expect(result.artifact.documents[0]?.path).toBe(expectedPath);
    expect(result.sourceRevision).toBe(getRevision(getFiles()));
  });

  test("fails clearly when the source changes on both attempts", async () => {
    const { source } = createMutableSource({
      initial: [createFile({ id: "article" })],
      mutate: ([file]) => [{ ...file, revision: `${file.revision}-changed` }],
      mutateEveryAttempt: true,
    });

    await expect(compileContentSource({ source, projectId })).rejects.toThrow(
      ContentSourceChangedError
    );
  });

  test("rejects entries that do not belong to the captured snapshot", async () => {
    const file = createFile({ id: "article" });
    const source: ContentSource = {
      async openSnapshot() {
        return {
          revision: file.revision,
          files: [file],
          async loadEntries() {
            return [createEntry({ ...file, contentRef: "revisions/other.md" })];
          },
          async isCurrent() {
            return true;
          },
        };
      },
    };

    await expect(compileContentSource({ source, projectId })).rejects.toThrow(
      "outside the captured snapshot"
    );
  });
});
