import { useEffect, useState } from "react";
import type { Asset } from "@webstudio-is/sdk";
import { createAssetContentSession } from "@webstudio-is/content-engine/asset-content-session";
import { AssetRevisionConflictError } from "@webstudio-is/content-engine/asset-content-repository";
import { StorySection } from "@webstudio-is/design-system";
import { $assets } from "~/shared/sync/data-stores";
import { $authPermit } from "~/shared/nano-states";
import {
  createAssetContentBridge,
  getAssetContentBridge,
  __testing__ as bridgeTesting,
} from "~/shared/asset-content-bridge.client";
import { CreateTextFileDialog } from "./create-text-file-dialog";
import { TextFileEditor } from "./text-file-editor";

const asset: Asset = {
  id: "story-text-file",
  projectId: "story-project",
  name: "notes.txt",
  format: "txt",
  type: "file",
  size: 36,
  meta: {},
  createdAt: "2026-01-01T00:00:00.000Z",
};

export default {
  title: "Asset Manager/Text file editor",
  component: TextFileEditor,
};

const markdownAsset: Asset = {
  ...asset,
  id: "story-markdown-file",
  name: "article.md",
  format: "md",
};
const mdxSource = "# Article\n\nMDX preview content.";
const mdxAsset: Asset = {
  ...asset,
  id: "story-mdx-file",
  name: "article.mdx",
  format: "mdx",
  size: new TextEncoder().encode(mdxSource).byteLength,
};

const EditorStory = ({
  state,
}: {
  state: "loaded" | "error" | "readOnly" | "markdown" | "markdownReadOnly";
}) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const previousAssets = $assets.get();
    const previousPermit = $authPermit.get();
    const previousFetch = window.fetch;
    const currentAsset = state.startsWith("markdown") ? markdownAsset : asset;
    $assets.set(new Map([[currentAsset.id, currentAsset]]));
    $authPermit.set("own");
    window.fetch = async (input, init) => {
      if (String(input).includes(`/cgi/asset/${currentAsset.name}`)) {
        return state === "error"
          ? new Response("", { status: 404 })
          : new Response(
              state.startsWith("markdown")
                ? "# Article\n\nA Markdown preview.\n"
                : "Text file preview\nSecond line\n"
            );
      }
      return previousFetch(input, init);
    };
    setReady(true);
    return () => {
      setReady(false);
      $assets.set(previousAssets);
      $authPermit.set(previousPermit);
      window.fetch = previousFetch;
    };
  }, [state]);
  return (
    <StorySection title="Text file editor">
      {ready && (
        <TextFileEditor
          assetId={state.startsWith("markdown") ? markdownAsset.id : asset.id}
          readOnly={state === "readOnly" || state === "markdownReadOnly"}
          onOpenChange={() => {}}
        />
      )}
    </StorySection>
  );
};

export const Loaded = () => <EditorStory state="loaded" />;
export const ReadOnly = () => <EditorStory state="readOnly" />;
export const LoadError = () => <EditorStory state="error" />;
export const Markdown = () => <EditorStory state="markdown" />;
export const MarkdownReadOnly = () => <EditorStory state="markdownReadOnly" />;

const MdxStory = ({
  state,
}: {
  state: "loaded" | "readOnly" | "failed" | "conflicting";
}) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    const previousAssets = $assets.get();
    const previousPermit = $authPermit.get();
    let previousBridge: ReturnType<typeof getAssetContentBridge> | undefined;
    try {
      previousBridge = getAssetContentBridge();
    } catch {
      // Storybook has no Asset content bridge until this fixture installs one.
    }
    const session = createAssetContentSession({
      repository: {
        readContent: async () => ({
          asset: mdxAsset,
          data: (async function* () {
            yield new TextEncoder().encode(mdxSource);
          })(),
        }),
        updateContent: async () => {
          if (state === "conflicting") {
            throw new AssetRevisionConflictError(
              "This file changed elsewhere. Reload before continuing."
            );
          }
          if (state === "failed") {
            throw new Error("Unable to save this file.");
          }
          return mdxAsset;
        },
      },
      authorize: () => true,
      debounceMilliseconds: 60_000,
    });
    bridgeTesting.initBridge(
      createAssetContentBridge({
        origin: window.location.origin,
        request: fetch,
        authorize: () => true,
        requireReload: () => {},
        getContentSession: () => session,
      })
    );
    $assets.set(new Map([[mdxAsset.id, mdxAsset]]));
    $authPermit.set("own");
    const prepare = async () => {
      await session.open(mdxAsset.id);
      if (state === "failed" || state === "conflicting") {
        session.save(mdxAsset.id, "# Updated article");
        await session.flush(mdxAsset.id).catch(() => {});
      }
      if (!disposed) {
        setReady(true);
      }
    };
    void prepare();
    return () => {
      disposed = true;
      session.dispose();
      $assets.set(previousAssets);
      $authPermit.set(previousPermit);
      if (previousBridge) {
        bridgeTesting.initBridge(previousBridge);
      } else {
        bridgeTesting.clearBridge();
      }
    };
  }, [state]);
  return (
    <StorySection title="MDX content editor">
      {ready && (
        <TextFileEditor
          assetId={mdxAsset.id}
          readOnly={state === "readOnly"}
          onOpenChange={() => {}}
        />
      )}
    </StorySection>
  );
};

export const Mdx = () => <MdxStory state="loaded" />;
export const MdxReadOnly = () => <MdxStory state="readOnly" />;
export const MdxSaveError = () => <MdxStory state="failed" />;
export const MdxConflict = () => <MdxStory state="conflicting" />;

const CreateStory = ({
  state,
}: {
  state: "default" | "invalid" | "disabled";
}) => {
  useEffect(() => {
    if (state !== "invalid") {
      return;
    }
    const showError = () => {
      const button = Array.from(document.querySelectorAll("button")).find(
        (item) => item.textContent === "Create file"
      );
      if (button) {
        observer.disconnect();
        button.click();
      }
    };
    const observer = new MutationObserver(showError);
    observer.observe(document.body, { childList: true, subtree: true });
    showError();
    return () => observer.disconnect();
  }, [state]);
  return (
    <CreateTextFileDialog
      open
      defaultName={state === "invalid" ? "image.png" : "untitled.md"}
      disabled={state === "disabled"}
      onOpenChange={() => {}}
      onCreated={() => {}}
    />
  );
};

export const Create = () => <CreateStory state="default" />;
export const CreateInvalidExtension = () => <CreateStory state="invalid" />;
export const CreateDisabled = () => <CreateStory state="disabled" />;
