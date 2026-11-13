import { useEffect, useState } from "react";
import { StorySection } from "@webstudio-is/design-system";
import {
  blockComponent,
  blockTemplateComponent,
  blockBodyComponent,
  type Instance,
} from "@webstudio-is/sdk";
import {
  componentAttribute,
  idAttribute,
  selectorIdAttribute,
} from "@webstudio-is/react-sdk";
import {
  $allSelectedInstanceSelectors,
  $builderMode,
} from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";
import { Block } from "./block";
import { BlockBody } from "./block-body";
import { BlockTemplate } from "./block-template";

export default {
  title: "Canvas/Content block editor states",
  component: Block,
};

type State =
  | "missing"
  | "noTemplates"
  | "empty"
  | "selectedTemplate"
  | "emptyBody";

const BlockStory = ({
  state,
  surface,
}: {
  state: State;
  surface: "bright" | "dark";
}) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const previousInstances = $instances.get();
    const previousMode = $builderMode.get();
    const previousSelection = $allSelectedInstanceSelectors.get();
    const instances: Instance[] = [
      {
        id: "block",
        type: "instance",
        component: blockComponent,
        children:
          state === "noTemplates" ? [] : [{ type: "id", value: "templates" }],
      },
      {
        id: "templates",
        type: "instance",
        component: blockTemplateComponent,
        children: [],
      },
    ];
    $instances.set(
      new Map(
        (state === "missing" ? [] : instances).map((instance) => [
          instance.id,
          instance,
        ])
      )
    );
    $builderMode.set("design");
    $allSelectedInstanceSelectors.set(
      state === "selectedTemplate" ? [["templates", "block"]] : []
    );
    setReady(true);
    return () => {
      $instances.set(previousInstances);
      $allSelectedInstanceSelectors.set(previousSelection);
      $builderMode.set(previousMode);
    };
  }, [state]);

  return (
    <StorySection title="Content block editor">
      <div
        style={{
          padding: 32,
          width: 560,
          minHeight: 220,
          background: surface === "bright" ? "#fff" : "#151515",
          color: surface === "bright" ? "#151515" : "#fff",
        }}
      >
        {ready &&
          (state === "emptyBody" ? (
            <BlockBody
              {...{
                [componentAttribute]: blockBodyComponent,
                [idAttribute]: "body",
                [selectorIdAttribute]: "body,block",
              }}
            />
          ) : (
            <Block
              {...{
                [idAttribute]: "block",
                [selectorIdAttribute]: "block",
                [componentAttribute]: blockComponent,
              }}
            >
              <BlockTemplate
                {...{
                  [idAttribute]: "templates",
                  [selectorIdAttribute]: "templates,block",
                  [componentAttribute]: blockTemplateComponent,
                  instanceSelector: ["templates", "block"],
                }}
              >
                {state === "selectedTemplate" && <p>Template content</p>}
              </BlockTemplate>
              {state === "selectedTemplate" && (
                <BlockBody
                  {...{
                    [idAttribute]: "body",
                    [selectorIdAttribute]: "body,block",
                    [componentAttribute]: blockBodyComponent,
                    instanceSelector: ["body", "block"],
                  }}
                >
                  <p>Entry content</p>
                </BlockBody>
              )}
            </Block>
          ))}
      </div>
    </StorySection>
  );
};

export const MissingInstanceBright = () => (
  <BlockStory state="missing" surface="bright" />
);
export const MissingInstanceDark = () => (
  <BlockStory state="missing" surface="dark" />
);
export const MissingTemplatesBright = () => (
  <BlockStory state="noTemplates" surface="bright" />
);
export const MissingTemplatesDark = () => (
  <BlockStory state="noTemplates" surface="dark" />
);
export const EmptyEditableBright = () => (
  <BlockStory state="empty" surface="bright" />
);
export const EmptyEditableDark = () => (
  <BlockStory state="empty" surface="dark" />
);
export const SelectedTemplateBright = () => (
  <BlockStory state="selectedTemplate" surface="bright" />
);
export const SelectedTemplateDark = () => (
  <BlockStory state="selectedTemplate" surface="dark" />
);
export const EmptyBodyBright = () => (
  <BlockStory state="emptyBody" surface="bright" />
);
export const EmptyBodyDark = () => (
  <BlockStory state="emptyBody" surface="dark" />
);
