import { useEffect, useState } from "react";
import { Box, StorySection } from "@webstudio-is/design-system";
import {
  blockBodyComponent,
  blockComponent,
  blockTemplateComponent,
  coreMetas,
  elementComponent,
  type Instance,
} from "@webstudio-is/sdk";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import {
  $allSelectedInstanceSelectors,
  $blockChildOutline,
  $builderMode,
  $modifierKeys,
  $registeredComponentMetas,
  $textEditingInstanceSelector,
  $textEditorContextMenu,
  execTextEditorContextMenuCommand,
} from "~/shared/nano-states";
import { $instanceSelectionUpdate } from "~/shared/nano-states/instance-selection";
import { $instances, $props } from "~/shared/sync/data-stores";
import {
  $canvasRect,
  $canvasScrollbarSize,
  $canvasWidth,
  $workspaceRect,
} from "~/builder/shared/nano-states";
import {
  BlockChildHoveredInstanceOutline,
  TemplatesMenu,
} from "./block-instance-outline";
import { TextEditorContextMenu } from "../block-editor-context-menu";

export default {
  title: "Canvas tools/Content block outline",
  component: BlockChildHoveredInstanceOutline,
};

const BlockStory = ({
  state,
}: {
  state: "add" | "delete" | "menu" | "slash" | "slashEmpty";
}) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const previous = {
      blockChildOutline: $blockChildOutline.get(),
      builderMode: $builderMode.get(),
      modifierKeys: $modifierKeys.get(),
      metas: $registeredComponentMetas.get(),
      instances: $instances.get(),
      props: $props.get(),
      allSelected: $allSelectedInstanceSelectors.get(),
      selectionUpdate: $instanceSelectionUpdate.get(),
      textEditing: $textEditingInstanceSelector.get(),
      textMenu: $textEditorContextMenu.get(),
      canvasWidth: $canvasWidth.get(),
      workspaceRect: $workspaceRect.get(),
      canvasRect: $canvasRect.get(),
      scrollbar: $canvasScrollbarSize.get(),
    };
    const instances: Instance[] = [
      {
        type: "instance",
        id: "body",
        component: "Body",
        children: [{ type: "id", value: "block" }],
      },
      {
        type: "instance",
        id: "block",
        component: blockComponent,
        children: [
          { type: "id", value: "templates" },
          { type: "id", value: "content" },
        ],
      },
      {
        type: "instance",
        id: "templates",
        component: blockTemplateComponent,
        children: [
          { type: "id", value: "heading" },
          { type: "id", value: "paragraph" },
        ],
      },
      {
        type: "instance",
        id: "heading",
        component: elementComponent,
        tag: "h2",
        children: [],
      },
      {
        type: "instance",
        id: "paragraph",
        component: elementComponent,
        tag: "p",
        children: [],
      },
      {
        type: "instance",
        id: "content",
        component: blockBodyComponent,
        children: [{ type: "id", value: "current" }],
      },
      {
        type: "instance",
        id: "current",
        component: elementComponent,
        tag: "p",
        children: [{ type: "text", value: "Article text" }],
      },
    ];
    $instances.set(
      new Map(instances.map((instance) => [instance.id, instance]))
    );
    $props.set(new Map());
    $registeredComponentMetas.set(
      new Map(Object.entries({ ...coreMetas, ...baseComponentMetas }))
    );
    $builderMode.set("content");
    $modifierKeys.set({ altKey: state === "delete" });
    $canvasWidth.set(800);
    $workspaceRect.set(new DOMRect(0, 0, 800, 500));
    $canvasRect.set(new DOMRect(0, 0, 800, 500));
    $canvasScrollbarSize.set({ width: 0, height: 0 });
    $blockChildOutline.set({
      selector: ["current", "content", "block", "body"],
      hoveredSelector: ["current", "content", "block", "body"],
      rect: new DOMRect(220, 170, 260, 170),
    });
    if (state === "slash" || state === "slashEmpty") {
      $textEditingInstanceSelector.set({
        selector: ["current", "content", "block", "body"],
        reason: "left",
      });
      $textEditorContextMenu.set({
        cursorRect: new DOMRect(300, 240, 2, 20),
        replaceAnchor: false,
      });
    }
    setReady(true);
    const filterTimer =
      state === "slashEmpty"
        ? window.setTimeout(() => {
            execTextEditorContextMenuCommand({
              type: "filter",
              value: "no matching template",
            });
          }, 250)
        : undefined;
    return () => {
      if (filterTimer !== undefined) {
        window.clearTimeout(filterTimer);
      }
      $blockChildOutline.set(previous.blockChildOutline);
      $builderMode.set(previous.builderMode);
      $modifierKeys.set(previous.modifierKeys);
      $registeredComponentMetas.set(previous.metas);
      $instances.set(previous.instances);
      $allSelectedInstanceSelectors.set(previous.allSelected);
      $instanceSelectionUpdate.set(previous.selectionUpdate);
      $textEditingInstanceSelector.set(previous.textEditing);
      $textEditorContextMenu.set(previous.textMenu);
      $props.set(previous.props);
      $canvasWidth.set(previous.canvasWidth);
      $workspaceRect.set(previous.workspaceRect);
      $canvasRect.set(previous.canvasRect);
      $canvasScrollbarSize.set(previous.scrollbar);
    };
  }, [state]);

  return (
    <StorySection title="Content block outline">
      <Box
        css={{
          position: "relative",
          width: 800,
          height: 500,
          backgroundColor: "#fff",
        }}
      >
        {ready &&
          (state === "slash" || state === "slashEmpty" ? (
            <TextEditorContextMenu />
          ) : state === "menu" ? (
            <TemplatesMenu
              open
              onOpenChange={() => {}}
              anchor={["current", "content", "block", "body"]}
              triggerTooltipContent={<>Insert block</>}
              templates={[
                [
                  $instances.get().get("heading")!,
                  ["heading", "templates", "block", "body"],
                ],
                [
                  $instances.get().get("paragraph")!,
                  ["paragraph", "templates", "block", "body"],
                ],
              ]}
              value={undefined}
              onValueChangeComplete={() => {}}
              modal
              inert={false}
              preventFocusOnHover={false}
            >
              <button type="button">Insert block</button>
            </TemplatesMenu>
          ) : (
            <BlockChildHoveredInstanceOutline />
          ))}
      </Box>
    </StorySection>
  );
};

export const Insert = () => <BlockStory state="add" />;
export const Delete = () => <BlockStory state="delete" />;
export const TemplatesMenuOpen = () => <BlockStory state="menu" />;
export const SlashMenu = () => <BlockStory state="slash" />;
export const SlashMenuNoResults = () => <BlockStory state="slashEmpty" />;
