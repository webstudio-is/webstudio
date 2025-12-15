import { useEffect, useRef } from "react";
import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";
import { FloatingPanel } from "@webstudio-is/design-system";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  $breakpoints,
  $instances,
  $pages,
  $selectedBreakpointId,
  $styles,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync/sync-stores";
import { BackgroundContent } from "./background-content";
import { $awareness } from "~/shared/awareness";
import { useComputedStyleDecl } from "../../shared/model";
import { setRepeatedStyleItem } from "../../shared/repeated-style";
import { type StyleValue } from "@webstudio-is/css-engine";

registerContainers();
$breakpoints.set(new Map([["base", { id: "base", label: "" }]]));
$selectedBreakpointId.set("base");
$styleSourceSelections.set(
  new Map([["box", { instanceId: "box", values: ["local"] }]])
);
$instances.set(
  new Map([
    ["box", { type: "instance", id: "box", component: "Box", children: [] }],
  ])
);
$pages.set(
  createDefaultPages({
    homePageId: "homePageId",
    rootInstanceId: "box",
  })
);

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

$awareness.set({
  pageId: "homePageId",
  instanceSelector: ["box"],
});

const BackgroundStory = ({ styleValue }: { styleValue: StyleValue }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const backgroundImage = useComputedStyleDecl("background-image");

  useEffect(() => {
    setRepeatedStyleItem(backgroundImage, 0, styleValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div
        ref={elementRef}
        style={{ marginLeft: "400px" }}
        data-floating-panel-container
      ></div>

      <FloatingPanel
        open
        title="Background"
        content={<BackgroundContent index={0} />}
      >
        <button>Trigger</button>
      </FloatingPanel>
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

export const ConicGradient = () => {
  const styleValue: StyleValue = {
    type: "unparsed",
    value:
      "conic-gradient(from 0deg at 50% 50%, rgba(255,126,95,1) 0deg, rgba(254,180,123,1) 120deg, rgba(134,168,231,1) 240deg, rgba(255,126,95,1) 360deg)",
  };
  return <BackgroundStory styleValue={styleValue} />;
};

export const RadialGradient = () => {
  const styleValue: StyleValue = {
    type: "unparsed",
    value:
      "radial-gradient(circle at 50% 50%, rgba(255,126,95,1) 0%, rgba(254,180,123,1) 50%, rgba(134,168,231,1) 100%)",
  };
  return <BackgroundStory styleValue={styleValue} />;
};

export const Solid = () => {
  const styleValue: StyleValue = {
    type: "unparsed",
    value:
      "linear-gradient(0deg, rgba(56,189,248,1) 0%, rgba(56,189,248,1) 100%)",
  };
  return <BackgroundStory styleValue={styleValue} />;
};

export default {
  title: "Style Panel/Backgrounds",
  component: Image,
};
