import { useEffect, useState } from "react";
import { Box, StorySection, theme } from "@webstudio-is/design-system";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  blockBodyComponent,
  blockComponent,
  contentBlockSourceProp,
  coreMetas,
  elementComponent,
  type Instance,
} from "@webstudio-is/sdk";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import {
  $allSelectedInstanceSelectors,
  $builderMode,
  $editingItemSelector,
  $registeredComponentMetas,
  $selectedPageId,
  selectInstance,
  selectInstances,
} from "~/shared/nano-states";
import { $instances, $pages, $props } from "~/shared/sync/data-stores";
import { $externalContentRoots } from "~/shared/external-content-mutations";
import { NavigatorPanel } from "./navigator";

type State =
  | "design"
  | "no-content"
  | "content"
  | "mdx"
  | "multi"
  | "menu"
  | "rename";

export default { title: "Navigator/Panel", component: NavigatorPanel };

const NavigatorStory = ({ state }: { state: State }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const previous = {
      builderMode: $builderMode.get(),
      metas: $registeredComponentMetas.get(),
      instances: $instances.get(),
      pages: $pages.get(),
      props: $props.get(),
      selectedPageId: $selectedPageId.get(),
      selectedInstances: $allSelectedInstanceSelectors.get(),
      editingItem: $editingItemSelector.get(),
      externalRoots: $externalContentRoots.get(),
    };
    const isContent =
      state === "no-content" || state === "content" || state === "mdx";
    const bodyChildren =
      state === "no-content"
        ? []
        : isContent
          ? [{ type: "id" as const, value: "block" }]
          : ["first", "second", "third"].map((value) => ({
              type: "id" as const,
              value,
            }));
    const instances: Instance[] = [
      {
        type: "instance",
        id: "body",
        component: "Body",
        children: bodyChildren,
      },
      ...(isContent && state !== "no-content"
        ? [
            {
              type: "instance" as const,
              id: "block",
              component: blockComponent,
              label: "Article",
              children: [
                {
                  type: "id" as const,
                  value: state === "mdx" ? "mdx" : "heading",
                },
              ],
            },
            state === "mdx"
              ? {
                  type: "instance" as const,
                  id: "mdx",
                  component: blockBodyComponent,
                  children: [],
                }
              : {
                  type: "instance" as const,
                  id: "heading",
                  component: elementComponent,
                  tag: "h1",
                  label: "Article heading",
                  children: [
                    { type: "text" as const, value: "Article heading" },
                  ],
                },
          ]
        : []),
      ...(!isContent
        ? ["first", "second", "third"].map(
            (id): Instance => ({
              type: "instance",
              id,
              component: elementComponent,
              tag: "div",
              label: `${id[0].toUpperCase()}${id.slice(1)} box`,
              children: [],
            })
          )
        : []),
    ];
    $registeredComponentMetas.set(
      new Map(Object.entries({ ...coreMetas, ...baseComponentMetas }))
    );
    $instances.set(
      new Map(instances.map((instance) => [instance.id, instance]))
    );
    $pages.set(
      createDefaultPages({ rootInstanceId: "body", homePageId: "home" })
    );
    $props.set(
      state === "mdx"
        ? new Map([
            [
              "source",
              {
                id: "source",
                instanceId: "block",
                name: contentBlockSourceProp,
                type: "asset" as const,
                value: "article",
              },
            ],
          ])
        : new Map()
    );
    $externalContentRoots.set(new Map());
    $selectedPageId.set("home");
    $builderMode.set(isContent ? "content" : "design");
    if (state === "multi") {
      selectInstances([
        ["first", "body"],
        ["second", "body"],
      ]);
    } else if (state === "rename") {
      selectInstance(["first", "body"]);
      $editingItemSelector.set(["first", "body"]);
    } else if (state === "mdx") {
      selectInstance(["mdx", "block", "body"]);
    } else if (state === "content") {
      selectInstance(["heading", "block", "body"]);
    } else {
      selectInstance(["first", "body"]);
    }
    setReady(true);
    return () => {
      $builderMode.set(previous.builderMode);
      $registeredComponentMetas.set(previous.metas);
      $instances.set(previous.instances);
      $pages.set(previous.pages);
      $props.set(previous.props);
      $selectedPageId.set(previous.selectedPageId);
      $allSelectedInstanceSelectors.set(previous.selectedInstances);
      $editingItemSelector.set(previous.editingItem);
      $externalContentRoots.set(previous.externalRoots);
    };
  }, [state]);

  useEffect(() => {
    if (!ready || state !== "menu") {
      return;
    }
    const showMenu = () => {
      const row = Array.from(
        document.querySelectorAll<HTMLButtonElement>("[data-tree-button]")
      ).find((item) => item.textContent?.includes("First box"));
      if (row) {
        observer.disconnect();
        row.dispatchEvent(
          new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            button: 2,
          })
        );
      }
    };
    const observer = new MutationObserver(showMenu);
    observer.observe(document.body, { childList: true, subtree: true });
    showMenu();
    return () => observer.disconnect();
  }, [ready, state]);

  return (
    <StorySection title="Navigator">
      <Box
        css={{
          width: theme.sizes.sidebarWidth,
          height: 480,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {ready && <NavigatorPanel onClose={() => {}} />}
      </Box>
    </StorySection>
  );
};

export const Design = () => <NavigatorStory state="design" />;
export const NoEditableContent = () => <NavigatorStory state="no-content" />;
export const EditableContent = () => <NavigatorStory state="content" />;
export const MdxContent = () => <NavigatorStory state="mdx" />;
export const MultiSelection = () => <NavigatorStory state="multi" />;
export const ContextMenu = () => <NavigatorStory state="menu" />;
export const Rename = () => <NavigatorStory state="rename" />;
