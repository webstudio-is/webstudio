import { useEffect, useRef, useState } from "react";
import {
  createDefaultCollectionConfig,
  parseCollectionConfig,
} from "@webstudio-is/content-engine";
import type { Asset } from "@webstudio-is/sdk";
import { StorySection } from "@webstudio-is/design-system";
import { $authPermit } from "~/shared/nano-states";
import { $assets } from "~/shared/sync/data-stores";
import { CollectionEntrySettingsDialog } from "./collection-entry-settings-dialog";

const asset: Asset = {
  id: "post",
  projectId: "project",
  name: "post.mdx",
  filename: "post",
  folderId: "posts",
  type: "file",
  format: "mdx",
  size: 1,
  meta: {},
  createdAt: "2026-09-08T00:00:00Z",
};
const collection = {
  status: "ready" as const,
  folderId: "posts",
  configAsset: asset,
  templateAsset: asset,
  templateProperties: {},
  config: parseCollectionConfig(createDefaultCollectionConfig()),
};
const validSource = "---\ntitle: Old\nslug: post\ndraft: false\n---\nBody";
const invalidSource = "---\ntitle: \nslug: different\ndraft: yes\n---\nBody";

type State =
  | "loading"
  | "read-error"
  | "loaded"
  | "validation"
  | "saving"
  | "save-error"
  | "uncertain-save"
  | "discard"
  | "canvas-unavailable";

const whenFound = (
  selector: string,
  onFound: (element: HTMLElement) => void
) => {
  const found = document.querySelector<HTMLElement>(selector);
  if (found !== null) {
    onFound(found);
    return () => {};
  }
  const observer = new MutationObserver(() => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element !== null) {
      observer.disconnect();
      onFound(element);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
};

const EntryStory = ({ state }: { state: State }) => {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(true);
  const readAttempt = useRef(0);
  const saveAttempt = useRef(0);

  useEffect(() => {
    const previousAssets = $assets.get();
    const previousPermit = $authPermit.get();
    $assets.set(new Map([[asset.id, asset]]));
    $authPermit.set("own");
    setReady(true);
    return () => {
      $assets.set(previousAssets);
      $authPermit.set(previousPermit);
    };
  }, []);

  useEffect(() => {
    if (
      !ready ||
      !["saving", "save-error", "uncertain-save", "discard"].includes(state)
    ) {
      return;
    }
    return whenFound("#collection-entry-title", (element) => {
      const input = element as HTMLInputElement;
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;
      setValue?.call(input, "Updated");
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
  }, [ready, state]);

  useEffect(() => {
    if (!ready || state !== "discard") {
      return;
    }
    return whenFound('[role="alert"]', () => {
      Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => button.textContent === "Edit file")
        ?.click();
    });
  }, [ready, state]);

  const readSource = async () => {
    if (state === "loading") {
      return new Promise<string>(() => {});
    }
    if (state === "read-error" && readAttempt.current++ === 0) {
      throw new Error("The entry could not be loaded.");
    }
    return state === "validation" ? invalidSource : validSource;
  };
  const updateContent = async () => {
    if (state === "saving") {
      return new Promise<Asset>(() => {});
    }
    if (state === "uncertain-save" || state === "discard") {
      throw Object.assign(new Error("The entry could not be saved."), {
        code: "ASSET_UPDATE_COMMIT_UNCERTAIN",
      });
    }
    if (state === "save-error" && saveAttempt.current++ === 0) {
      throw new Error("The entry could not be saved.");
    }
    return asset;
  };

  return (
    <StorySection title="Entry settings">
      {ready && open && (
        <CollectionEntrySettingsDialog
          asset={asset}
          collection={collection}
          readSource={readSource}
          updateContent={updateContent}
          onClose={() => setOpen(false)}
          onOpenFile={() => setOpen(false)}
          onOpenCanvas={
            state === "canvas-unavailable" ? undefined : () => setOpen(false)
          }
        />
      )}
    </StorySection>
  );
};

export default {
  title: "Asset Manager/Collection entry settings",
  component: CollectionEntrySettingsDialog,
};

export const Loading = () => <EntryStory state="loading" />;
export const ReadErrorAndRetry = () => <EntryStory state="read-error" />;
export const Loaded = () => <EntryStory state="loaded" />;
export const Validation = () => <EntryStory state="validation" />;
export const Saving = () => <EntryStory state="saving" />;
export const SaveErrorAndRetry = () => <EntryStory state="save-error" />;
export const UncertainSave = () => <EntryStory state="uncertain-save" />;
export const DiscardConfirmation = () => <EntryStory state="discard" />;
export const CanvasUnavailable = () => (
  <EntryStory state="canvas-unavailable" />
);
