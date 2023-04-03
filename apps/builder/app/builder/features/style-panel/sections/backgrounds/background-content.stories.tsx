import { BackgroundContent } from "./background-content";
import { getLayerBackgroundStyleInfo } from "./background-layers";
import {
  FloatingPanel,
  FloatingPanelProvider,
} from "~/builder/shared/floating-panel";
import { useRef, useState } from "react";
import type { SetProperty } from "../../shared/use-style-data";

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
  title: "Style/Background",
  component: BackgroundContent,
};
