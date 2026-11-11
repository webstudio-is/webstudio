import { useEffect, useState } from "react";
import { StorySection } from "@webstudio-is/design-system";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { Asset } from "@webstudio-is/sdk";
import {
  $assets,
  $pages,
  $projectSettings,
  $props,
  $styles,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import {
  DeleteUnusedAssetsDialog,
  openDeleteUnusedAssetsDialog,
} from "./delete-unused-assets";

registerContainers();

const createFile = (id: string): Asset => ({
  id,
  projectId: "project",
  name: `${id}.txt`,
  filename: id,
  type: "file",
  format: "txt",
  size: 1,
  meta: {},
  createdAt: "2026-09-08T00:00:00Z",
});

const UnusedAssetsStory = ({
  state,
}: {
  state: "empty" | "populated" | "deselected";
}) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const previous = {
      assets: $assets.get(),
      pages: $pages.get(),
      projectSettings: $projectSettings.get(),
      props: $props.get(),
      styles: $styles.get(),
    };
    const files =
      state === "empty" ? [] : [createFile("first"), createFile("second")];
    $assets.set(new Map(files.map((file) => [file.id, file])));
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));
    $projectSettings.set({ meta: {}, compiler: {} });
    $props.set(new Map());
    $styles.set(new Map());
    setReady(true);
    return () => {
      $assets.set(previous.assets);
      $pages.set(previous.pages);
      $projectSettings.set(previous.projectSettings);
      $props.set(previous.props);
      $styles.set(previous.styles);
    };
  }, [state]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    openDeleteUnusedAssetsDialog();
    if (state !== "deselected") {
      return;
    }
    const observer = new MutationObserver(() => {
      const selectAll = document.querySelector<HTMLButtonElement>(
        "#select-all-unused-assets"
      );
      if (selectAll !== null) {
        observer.disconnect();
        selectAll.click();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [ready, state]);

  return (
    <StorySection title="Delete unused assets">
      {ready && <DeleteUnusedAssetsDialog />}
    </StorySection>
  );
};

export default {
  title: "Asset Manager/Delete unused assets",
  component: DeleteUnusedAssetsDialog,
};

export const Empty = () => <UnusedAssetsStory state="empty" />;
export const Populated = () => <UnusedAssetsStory state="populated" />;
export const AllDeselected = () => <UnusedAssetsStory state="deselected" />;
