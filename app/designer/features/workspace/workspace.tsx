import { Box, Flex } from "~/shared/design-system";
import { useZoom } from "~/designer/shared/nano-values";

type WorkspaceProps = {
  children: JSX.Element;
  onTransitionEnd: () => void;
};

export const Workspace = ({ children, onTransitionEnd }: WorkspaceProps) => {
  const [zoom] = useZoom();

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
        {children}
      </Flex>
    </Box>
  );
};
