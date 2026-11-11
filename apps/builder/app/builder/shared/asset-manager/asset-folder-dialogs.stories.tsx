import { useEffect, useRef, useState } from "react";
import { StorySection } from "@webstudio-is/design-system";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { AssetFolder } from "@webstudio-is/sdk";
import {
  createAssetFolderFixture,
  createAssetFoldersFixture,
} from "@webstudio-is/sdk/testing";
import { $assetFolders, $pages, $project } from "~/shared/sync/data-stores";
import {
  AssetFolderSettingsDialog,
  CreateAssetFolderDialog,
  MoveAssetManagerItemsDialog,
} from "./asset-folder-dialogs";

const folder = createAssetFolderFixture({ id: "posts", name: "Posts" });
const otherFolder = createAssetFolderFixture({
  id: "existing",
  name: "Existing",
});

type State =
  | "new"
  | "new-ready"
  | "collection-option"
  | "duplicate"
  | "existing"
  | "setup-pending"
  | "setup-error"
  | "setup-success"
  | "settings"
  | "settings-no-delete"
  | "delete-confirmation"
  | "move"
  | "move-blocked";

const whenFound = (
  selector: string,
  onFound: (element: HTMLElement) => void
) => {
  const observer = new MutationObserver(() => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element !== null) {
      observer.disconnect();
      onFound(element);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const element = document.querySelector<HTMLElement>(selector);
  if (element !== null) {
    observer.disconnect();
    onFound(element);
  }
  return () => observer.disconnect();
};

const FolderStory = ({ state }: { state: State }) => {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(true);
  const setupAttempts = useRef(0);

  useEffect(() => {
    const previous = {
      folders: $assetFolders.get(),
      pages: $pages.get(),
      project: $project.get(),
    };
    $assetFolders.set(createAssetFoldersFixture(folder, otherFolder));
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));
    $project.set({ id: "project" } as never);
    setReady(true);
    return () => {
      $assetFolders.set(previous.folders);
      $pages.set(previous.pages);
      $project.set(previous.project);
    };
  }, []);

  useEffect(() => {
    if (
      !ready ||
      !["duplicate", "new-ready", "collection-option"].includes(state)
    ) {
      return;
    }
    return whenFound("#asset-folder-name", (element) => {
      const input = element as HTMLInputElement;
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set?.call(input, state === "duplicate" ? "Existing" : "New folder");
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
      if (state === "collection-option") {
        document
          .querySelector<HTMLButtonElement>("#asset-folder-content-collection")
          ?.click();
      }
    });
  }, [ready, state]);

  useEffect(() => {
    if (!ready || !state.startsWith("setup-")) {
      return;
    }
    return whenFound('[role="dialog"]', () => {
      Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => button.textContent === "Use as content collection")
        ?.click();
    });
  }, [ready, state]);

  const createCollection = async (): Promise<AssetFolder> => {
    if (state === "setup-pending") {
      return new Promise<AssetFolder>(() => {});
    }
    if (state === "setup-error" && setupAttempts.current++ === 0) {
      throw new Error("The collection could not be created.");
    }
    return folder;
  };

  if (!ready || !open) {
    return <StorySection title="Asset folder dialog">{null}</StorySection>;
  }

  return (
    <StorySection title="Asset folder dialog">
      {state === "settings" ||
      state === "settings-no-delete" ||
      state === "delete-confirmation" ? (
        <AssetFolderSettingsDialog
          folder={folder}
          open
          onOpenChange={setOpen}
          canDelete={state !== "settings-no-delete"}
          initialDeleteConfirmation={state === "delete-confirmation"}
          onUseAsCollection={() => {}}
        />
      ) : state === "move" || state === "move-blocked" ? (
        <MoveAssetManagerItemsDialog
          initialFolderId={folder.id}
          canMove={() => state === "move"}
          onMove={() => {}}
          onClose={() => setOpen(false)}
        />
      ) : (
        <CreateAssetFolderDialog
          open
          onOpenChange={setOpen}
          onConfigureCollection={() => {}}
          currentFolderId={undefined}
          existingFolder={
            ["new", "new-ready", "collection-option", "duplicate"].includes(
              state
            )
              ? undefined
              : folder
          }
          createFolder={() => ({ folderId: "created" })}
          createCollection={createCollection}
        />
      )}
    </StorySection>
  );
};

export default {
  title: "Asset Manager/Folder dialogs",
  component: CreateAssetFolderDialog,
};

export const NewFolder = () => <FolderStory state="new" />;
export const NewFolderReady = () => <FolderStory state="new-ready" />;
export const CollectionOptionSelected = () => (
  <FolderStory state="collection-option" />
);
export const DuplicateName = () => <FolderStory state="duplicate" />;
export const ExistingFolderSetup = () => <FolderStory state="existing" />;
export const CollectionSetupPending = () => (
  <FolderStory state="setup-pending" />
);
export const CollectionSetupErrorAndRetry = () => (
  <FolderStory state="setup-error" />
);
export const CollectionSetupSuccess = () => (
  <FolderStory state="setup-success" />
);
export const FolderSettings = () => <FolderStory state="settings" />;
export const FolderSettingsNoDelete = () => (
  <FolderStory state="settings-no-delete" />
);
export const DeleteConfirmation = () => (
  <FolderStory state="delete-confirmation" />
);
export const MoveAllowed = () => <FolderStory state="move" />;
export const MoveBlocked = () => <FolderStory state="move-blocked" />;
