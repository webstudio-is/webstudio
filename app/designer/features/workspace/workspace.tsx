import { Box, Flex } from "~/shared/design-system";
import { useCanvasWidth, useZoom } from "~/designer/shared/nano-states";
import { CanvasTools } from "./canvas-tools";

type WorkspaceProps = {
  children: JSX.Element;
  onTransitionEnd: () => void;
};

export const Workspace = ({ children, onTransitionEnd }: WorkspaceProps) => {
  const [zoom] = useZoom();
  const [canvasWidth] = useCanvasWidth();

  return (
    <Box
      css={{
        flexGrow: 1,
        background: "$gray8",
        overflow: "auto",
        scrollbarGutter: "stable",
      }}
    >
      <Flex
        direction="column"
        align="center"
        css={{
          transformStyle: "preserve-3d",
          transition: "transform 200ms ease-out",
          height: "100%",
          width: "100%",
        }}
        style={{
          transform: `scale(${zoom / 100})`,
        }}
        onTransitionEnd={onTransitionEnd}
      >
        <div style={{ width: canvasWidth, height: "100%" }}>
          {children}
          <CanvasTools />
        </div>
      </Flex>
    </Box>
  );
};
