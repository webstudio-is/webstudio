import { useRef } from "react";
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

export const BackgroundContentStory = () => {
  const elementRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={elementRef} style={{ marginLeft: "400px" }}></div>

      <FloatingPanelProvider container={elementRef}>
        <FloatingPanel
          open
          title="Background"
          content={<BackgroundContent index={0} />}
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
