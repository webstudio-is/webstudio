import { BackgroundContent } from "./background-content";
import { getLayerBackgroundStyleInfo } from "./background-layers";
import {
  FloatingPanel,
  FloatingPanelProvider,
} from "~/builder/shared/floating-panel";
import { useRef, useState } from "react";
import type { SetProperty } from "../../shared/use-style-data";
import {
  $breakpoints,
  $selectedBreakpointId,
  $selectedInstanceSelector,
  $styles,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";
import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";

const backgroundImage: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "backgroundImage",
  value: {
    type: "layers",
    value: [{ type: "keyword", value: "none" }],
  },
};

registerContainers();
$breakpoints.set(new Map([["base", { id: "base", label: "" }]]));
$selectedBreakpointId.set("base");
$styles.set(new Map([[getStyleDeclKey(backgroundImage), backgroundImage]]));
$styleSourceSelections.set(
  new Map([["box", { instanceId: "box", values: ["local"] }]])
);
$selectedInstanceSelector.set(["box"]);

const defaultCurrentStyle = getLayerBackgroundStyleInfo(0, {
  backgroundImage: {
    value: backgroundImage.value,
  },
});
const deleteProperty = () => () => {
  // do nothing
};

export const BackgroundContentStory = () => {
  const elementRef = useRef<HTMLDivElement>(null);

  const [currentStyle, setCurrentStyle] = useState(defaultCurrentStyle);

  const setProperty: SetProperty =
    (propertyName: string) => (style, options) => {
      if (options?.isEphemeral) {
        return;
      }

      setCurrentStyle({
        ...currentStyle,
        [propertyName]: {
          value: style,
          local: style,
        },
      });
    };

  return (
    <>
      <div ref={elementRef} style={{ marginLeft: "400px" }}></div>

      <FloatingPanelProvider container={elementRef}>
        <FloatingPanel
          open={true}
          title="Background"
          content={
            <BackgroundContent
              index={0}
              currentStyle={currentStyle}
              deleteProperty={deleteProperty}
              setProperty={setProperty}
              setBackgroundColor={(color) => {
                setProperty("backgroundColor")(color);
              }}
            />
          }
        >
          <div>Trigger</div>
        </FloatingPanel>
      </FloatingPanelProvider>
    </>
  );
};

export default {
  title: "Style Panel/Background",
  component: BackgroundContent,
};
