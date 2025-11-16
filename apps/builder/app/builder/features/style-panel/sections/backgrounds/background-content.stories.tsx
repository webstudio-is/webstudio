import { useEffect, useRef } from "react";
import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";
import {
  FloatingPanel,
  FloatingPanelProvider,
} from "@webstudio-is/design-system";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  $breakpoints,
  $pages,
  $selectedBreakpointId,
  $styles,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";
import { BackgroundContent } from "./background-content";
import { $awareness } from "~/shared/awareness";
import { useComputedStyleDecl } from "../../shared/model";
import { setRepeatedStyleItem } from "../../shared/repeated-style";
import type { StyleValue } from "@webstudio-is/css-engine";

registerContainers();
$breakpoints.set(new Map([["base", { id: "base", label: "" }]]));
$selectedBreakpointId.set("base");
$styleSourceSelections.set(
  new Map([["box", { instanceId: "box", values: ["local"] }]])
);
$pages.set(
  createDefaultPages({
    homePageId: "homePageId",
    rootInstanceId: "box",
  })
);
$awareness.set({
  pageId: "homePageId",
  instanceSelector: ["box"],
});

const defaultBackgroundImage: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "backgroundImage",
  value: {
    type: "layers",
    value: [{ type: "keyword", value: "none" }],
  },
};

$styles.set(
  new Map([[getStyleDeclKey(defaultBackgroundImage), defaultBackgroundImage]])
);

const BackgroundStory = ({ styleValue }: { styleValue: StyleValue }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const backgroundImage = useComputedStyleDecl("background-image");

  useEffect(() => {
    setRepeatedStyleItem(backgroundImage, 0, styleValue);
  }, [backgroundImage, styleValue]);

  return (
    <>
      <div ref={elementRef} style={{ marginLeft: "400px" }}></div>

      <FloatingPanelProvider container={elementRef}>
        <FloatingPanel
          open
          title="Background"
          content={<BackgroundContent index={0} />}
        >
          <button>Trigger</button>
        </FloatingPanel>
      </FloatingPanelProvider>
    </>
  );
};

export const Image = () => {
  const styleValue: StyleValue = { type: "keyword", value: "none" };
  return <BackgroundStory styleValue={styleValue} />;
};

export const LinearGradient = () => {
  const styleValue: StyleValue = {
    type: "unparsed",
    value:
      "linear-gradient(135deg, rgba(255,126,95,1) 0%, rgba(254,180,123,1) 35%, rgba(134,168,231,1) 100%)",
  };
  return <BackgroundStory styleValue={styleValue} />;
};

export default {
  title: "Style Panel/Background",
  component: Image,
};
