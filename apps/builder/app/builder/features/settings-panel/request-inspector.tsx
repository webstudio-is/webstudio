import type { ComponentProps, ReactNode } from "react";
import {
  Flex,
  Grid,
  PanelTabs,
  PanelTabsContent,
  PanelTabsList,
  PanelTabsTrigger,
  ScrollAreaNative,
  Text,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import { InfoCircleIcon } from "@webstudio-is/icons";

export const RequestDiagnosticsContent = ({
  children,
}: {
  children: ReactNode;
}) => (
  <ScrollAreaNative css={{ height: "100%", overflow: "auto" }}>
    <Flex direction="column" gap={3} css={{ padding: theme.panel.padding }}>
      {children}
    </Flex>
  </ScrollAreaNative>
);

export const RequestDiagnosticsTable = ({
  children,
}: {
  children: ReactNode;
}) => (
  <Grid
    css={{
      border: `1px solid ${theme.colors.borderMain}`,
      borderRadius: theme.borderRadius[4],
      overflow: "hidden",
    }}
  >
    {children}
  </Grid>
);

export const RequestDiagnosticsRow = ({
  label,
  value,
  description,
  valueColor,
}: {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  valueColor?: ComponentProps<typeof Text>["color"];
}) => (
  <Grid
    columns={2}
    gap={2}
    css={{
      padding: theme.spacing[5],
      borderBottom: `1px solid ${theme.colors.borderMain}`,
      "&:last-child": { borderBottom: 0 },
    }}
  >
    <Flex align="center" gap={1}>
      <Text color="moreSubtle">{label}</Text>
      {description !== undefined && (
        <Tooltip variant="wrapped" content={description}>
          <InfoCircleIcon tabIndex={0} />
        </Tooltip>
      )}
    </Flex>
    <Text
      color={valueColor}
      userSelect="text"
      css={{ fontVariantNumeric: "tabular-nums" }}
    >
      {value}
    </Text>
  </Grid>
);

export const RequestInspector = ({
  preview,
  diagnostics,
}: {
  preview: ReactNode;
  diagnostics?: ReactNode;
}) => (
  <PanelTabs
    defaultValue="preview"
    css={{ height: "100%", minWidth: 0, overflow: "hidden" }}
  >
    <PanelTabsList
      aria-label="Request details"
      css={{
        flexShrink: 0,
        borderBottom: `1px solid ${theme.colors.borderMain}`,
      }}
    >
      <PanelTabsTrigger value="preview">Preview</PanelTabsTrigger>
      <PanelTabsTrigger value="diagnostics">Diagnostics</PanelTabsTrigger>
    </PanelTabsList>
    <PanelTabsContent
      value="preview"
      css={{ flex: 1, position: "relative", overflow: "hidden" }}
    >
      {preview}
    </PanelTabsContent>
    <PanelTabsContent
      value="diagnostics"
      css={{ flex: 1, position: "relative", overflow: "hidden" }}
    >
      {diagnostics ?? (
        <Flex align="center" justify="center" css={{ height: "100%" }}>
          <Text color="moreSubtle">No diagnostics available</Text>
        </Flex>
      )}
    </PanelTabsContent>
  </PanelTabs>
);
