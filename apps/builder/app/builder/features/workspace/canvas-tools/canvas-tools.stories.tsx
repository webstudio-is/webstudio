import { useEffect, useState } from "react";
import { Box, StorySection } from "@webstudio-is/design-system";
import { createDefaultPages } from "@webstudio-is/project-build";
import { coreMetas, type Instance } from "@webstudio-is/sdk";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import { $collaborators } from "@webstudio-is/sync-client";
import {
  $allSelectedInstanceSelectors,
  $builderMode,
  $canvasToolsVisible,
  $collaborativeInstanceRect,
  $collaborativeInstanceSelector,
  $dragAndDropState,
  $hoveredInstanceOutline,
  $hoveredInstanceSelector,
  $instanceContextMenu,
  $registeredComponentMetas,
  $selectedInstanceOutlines,
  $selectedPageId,
} from "~/shared/nano-states";
import { $instanceSelectionUpdate } from "~/shared/nano-states/instance-selection";
import { $instances, $pages, $props } from "~/shared/sync/data-stores";
import {
  $canvasRect,
  $canvasScrollbarSize,
  $canvasWidth,
  $isStylePanelGridVisible,
  $workspaceRect,
} from "~/builder/shared/nano-states";
import { $ephemeralStyles } from "~/canvas/stores";
import { CanvasTools } from "./canvas-tools";

type State =
  | "selected"
  | "slot"
  | "hovered"
  | "collaborator"
  | "dragging"
  | "menu";

export default {
  title: "Canvas tools/Composed overlays",
  component: CanvasTools,
};

const boxRect = new DOMRect(200, 130, 300, 200);
const selector = ["box", "body"];

const CanvasStory = ({
  state,
  surface,
}: {
  state: State;
  surface: "bright" | "dark";
}) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const previous = {
      builderMode: $builderMode.get(),
      visible: $canvasToolsVisible.get(),
      canvasWidth: $canvasWidth.get(),
      workspaceRect: $workspaceRect.get(),
      canvasRect: $canvasRect.get(),
      scrollbar: $canvasScrollbarSize.get(),
      gridVisible: $isStylePanelGridVisible.get(),
      ephemeralStyles: $ephemeralStyles.get(),
      selected: $selectedInstanceOutlines.get(),
      hovered: $hoveredInstanceOutline.get(),
      hoveredSelector: $hoveredInstanceSelector.get(),
      collaboratorRect: $collaborativeInstanceRect.get(),
      collaboratorSelector: $collaborativeInstanceSelector.get(),
      collaborators: $collaborators.get(),
      drag: $dragAndDropState.get(),
      contextMenu: $instanceContextMenu.get(),
      allSelected: $allSelectedInstanceSelectors.get(),
      selectionUpdate: $instanceSelectionUpdate.get(),
      instances: $instances.get(),
      pages: $pages.get(),
      props: $props.get(),
      metas: $registeredComponentMetas.get(),
      selectedPageId: $selectedPageId.get(),
    };
    const instances: Instance[] = [
      {
        type: "instance",
        id: "body",
        component: "Body",
        children: [{ type: "id", value: state === "slot" ? "slot" : "box" }],
      },
      {
        type: "instance",
        id: "slot",
        component: "Slot",
        children: [{ type: "id", value: "box" }],
      },
      {
        type: "instance",
        id: "box",
        component: "Box",
        label: "Card",
        children: [],
      },
    ];
    const currentSelector =
      state === "slot" ? ["box", "slot", "body"] : selector;
    $builderMode.set("design");
    $canvasToolsVisible.set(true);
    $canvasWidth.set(900);
    $workspaceRect.set(new DOMRect(0, 0, 900, 600));
    $canvasRect.set(new DOMRect(0, 0, 900, 600));
    $canvasScrollbarSize.set({ width: 0, height: 0 });
    $isStylePanelGridVisible.set(false);
    $ephemeralStyles.set([]);
    $instances.set(
      new Map(instances.map((instance) => [instance.id, instance]))
    );
    $pages.set(
      createDefaultPages({ rootInstanceId: "body", homePageId: "home" })
    );
    $props.set(new Map());
    $registeredComponentMetas.set(
      new Map(Object.entries({ ...coreMetas, ...baseComponentMetas }))
    );
    $selectedPageId.set("home");
    $selectedInstanceOutlines.set(
      state === "selected" || state === "slot"
        ? [{ instanceId: "box", selector: currentSelector, rect: boxRect }]
        : []
    );
    $hoveredInstanceOutline.set(
      state === "hovered" ? { instanceId: "box", rect: boxRect } : undefined
    );
    $hoveredInstanceSelector.set(
      state === "hovered" ? currentSelector : undefined
    );
    $collaborativeInstanceRect.set(
      state === "collaborator" ? boxRect : undefined
    );
    $collaborativeInstanceSelector.set(
      state === "collaborator" ? currentSelector : undefined
    );
    const collaborators = new Map($collaborators.get());
    collaborators.clear();
    if (state === "collaborator") {
      collaborators.set("alex", {
        name: "Alex",
        pageId: "home",
        selectedInstanceIds: currentSelector,
        pointerPosition: { x: 0, y: 0, xRatio: 0.52, yRatio: 0.42 },
      });
    }
    $collaborators.set(collaborators);
    $dragAndDropState.set(
      state === "dragging"
        ? {
            isDragging: true,
            dropTarget: {
              itemSelector: ["body"],
              indexWithinChildren: 0,
              placement: {
                closestChildIndex: 0,
                indexAdjustment: 0,
                childrenOrientation: { type: "vertical", reverse: false },
              },
            },
            placementIndicator: {
              parentRect: { left: 100, top: 100, width: 500, height: 400 },
              type: "between-children",
              x: 200,
              y: 350,
              length: 300,
              direction: "horizontal",
            },
          }
        : { isDragging: false }
    );
    $instanceContextMenu.set(
      state === "menu"
        ? { position: { x: 300, y: 230 }, instanceSelector: currentSelector }
        : undefined
    );
    setReady(true);
    return () => {
      $builderMode.set(previous.builderMode);
      $canvasToolsVisible.set(previous.visible);
      $canvasWidth.set(previous.canvasWidth);
      $workspaceRect.set(previous.workspaceRect);
      $canvasRect.set(previous.canvasRect);
      $canvasScrollbarSize.set(previous.scrollbar);
      $isStylePanelGridVisible.set(previous.gridVisible);
      $ephemeralStyles.set(previous.ephemeralStyles);
      $selectedInstanceOutlines.set(previous.selected);
      $hoveredInstanceOutline.set(previous.hovered);
      $hoveredInstanceSelector.set(previous.hoveredSelector);
      $collaborativeInstanceRect.set(previous.collaboratorRect);
      $collaborativeInstanceSelector.set(previous.collaboratorSelector);
      $collaborators.set(previous.collaborators);
      $dragAndDropState.set(previous.drag);
      $instanceContextMenu.set(previous.contextMenu);
      $instances.set(previous.instances);
      $allSelectedInstanceSelectors.set(previous.allSelected);
      $instanceSelectionUpdate.set(previous.selectionUpdate);
      $pages.set(previous.pages);
      $props.set(previous.props);
      $registeredComponentMetas.set(previous.metas);
      $selectedPageId.set(previous.selectedPageId);
    };
  }, [state]);

  return (
    <StorySection title="Canvas tools">
      <Box
        css={{
          position: "relative",
          width: 900,
          height: 600,
          backgroundColor: surface === "bright" ? "#fff" : "#151515",
        }}
      >
        {ready && <CanvasTools />}
      </Box>
    </StorySection>
  );
};

export const SelectedBright = () => (
  <CanvasStory state="selected" surface="bright" />
);
export const SelectedDark = () => (
  <CanvasStory state="selected" surface="dark" />
);
export const SelectedSlot = () => <CanvasStory state="slot" surface="bright" />;
export const HoveredBright = () => (
  <CanvasStory state="hovered" surface="bright" />
);
export const HoveredDark = () => <CanvasStory state="hovered" surface="dark" />;
export const CollaboratorBright = () => (
  <CanvasStory state="collaborator" surface="bright" />
);
export const CollaboratorDark = () => (
  <CanvasStory state="collaborator" surface="dark" />
);
export const Dragging = () => <CanvasStory state="dragging" surface="bright" />;
export const InstanceContextMenu = () => (
  <CanvasStory state="menu" surface="bright" />
);
