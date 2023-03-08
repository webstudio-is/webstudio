import { BackgroundContent } from "./background-content";
import { getLayerBackgroundStyleInfo } from "./background-layers";
import {
  FloatingPanel,
  FloatingPanelProvider,
} from "~/builder/shared/floating-panel";
import { useRef, useState } from "react";
import type { StyleValue } from "@webstudio-is/css-data";

const defaultCurrentStyle = getLayerBackgroundStyleInfo(0, {
  backgroundImage: {
    value: {
      type: "layers",
      value: [{ type: "keyword", value: "none" }],
    },
  },
});
const deleteProperty = () => () => {
  // do nothing
};

export const BackgroundContentStory = () => {
  const eltRef = useRef<HTMLDivElement>(null);

  const [currentStyle, setCurrentStyle] = useState(defaultCurrentStyle);

  const setProperty = (propertyName: string) => (style: StyleValue) => {
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
      <div ref={eltRef} style={{ marginLeft: "400px" }}></div>

      <FloatingPanelProvider container={eltRef}>
        <FloatingPanel
          open={true}
          title="Background"
          content={
            <BackgroundContent
              currentStyle={currentStyle}
              deleteProperty={deleteProperty}
              setProperty={setProperty}
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
  title: "Style/Background",
  component: BackgroundContent,
};
