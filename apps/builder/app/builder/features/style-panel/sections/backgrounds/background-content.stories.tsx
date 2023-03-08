import { BackgroundContent } from "./background-content";
import { getLayerBackgroundStyleInfo } from "./background-layers";
import {
  FloatingPanel,
  FloatingPanelProvider,
} from "~/builder/shared/floating-panel";
import { useRef } from "react";

const currentStyle = getLayerBackgroundStyleInfo(0, {
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
const setProperty = deleteProperty;

export const BackgroundContentStory = () => {
  const eltRef = useRef<HTMLDivElement>(null);
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
              deleteProperty={setProperty}
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
