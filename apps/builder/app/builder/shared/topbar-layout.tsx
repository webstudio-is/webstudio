import type { ReactNode } from "react";
import {
  theme,
  css,
  Flex,
  Toolbar,
  ToolbarToggleGroup,
  type CSS,
} from "@webstudio-is/design-system";

const topbarContainerStyle = css({
  position: "relative",
  display: "flex",
  justifyContent: "space-between",
  background: theme.colors.backgroundTopbar,
  height: theme.spacing[15],
  paddingRight: theme.panel.paddingInline,
  color: theme.colors.foregroundContrastMain,
});

type TopbarLayoutProps = {
  menu: ReactNode;
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  loading?: ReactNode;
  css?: CSS;
};

export const TopbarLayout = ({
  menu,
  left,
  center,
  right,
  loading,
  css,
}: TopbarLayoutProps) => (
  <nav className={topbarContainerStyle({ css })}>
    <Flex css={{ flexBasis: "20%" }}>
      <Flex grow={false} shrink={false}>
        {menu}
      </Flex>
      {left && <Flex align="center">{left}</Flex>}
    </Flex>
    <Flex justify="center">{center}</Flex>
    <Toolbar>
      <ToolbarToggleGroup
        type="single"
        css={{
          isolation: "isolate",
          justifyContent: "flex-end",
          gap: theme.spacing[5],
          flexShrink: 0,
        }}
      >
        {right}
      </ToolbarToggleGroup>
    </Toolbar>
    {loading}
  </nav>
);
