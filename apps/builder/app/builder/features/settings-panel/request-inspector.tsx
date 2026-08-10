import type { ComponentProps, ReactNode, Ref } from "react";
import {
  Flex,
  Grid,
  PanelTabs,
  PanelTabsContent,
  PanelTabsList,
  PanelTabsTrigger,
  ScrollAreaNative,
  styled,
  Text,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import { InfoCircleIcon } from "@webstudio-is/icons";

export const clearSettledDiagnosticsKey = (
  pendingKey: string | undefined,
  settledKey: string
) => (pendingKey === settledKey ? undefined : pendingKey);

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

const DiagnosticsLabel = styled(Flex, {
  "& [data-diagnostics-info]": {
    opacity: 0,
  },
  "&:hover [data-diagnostics-info], &:focus-within [data-diagnostics-info]": {
    opacity: 1,
  },
});

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
    <DiagnosticsLabel align="center" gap={1}>
      <Text color="moreSubtle">{label}</Text>
      {description !== undefined && (
        <Tooltip variant="wrapped" content={description}>
          <InfoCircleIcon data-diagnostics-info tabIndex={0} />
        </Tooltip>
      )}
    </DiagnosticsLabel>
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
  queryContainerRef,
  preview,
  diagnostics,
  diagnosticsPending = false,
  onDiagnosticsOpen,
}: {
  queryContainerRef?: Ref<HTMLDivElement>;
  preview: ReactNode;
  diagnostics?: ReactNode;
  diagnosticsPending?: boolean;
  onDiagnosticsOpen?: () => void;
}) => (
  <PanelTabs
    key={queryContainerRef === undefined ? "preview" : "query"}
    defaultValue={queryContainerRef === undefined ? "preview" : "query"}
    css={{ height: "100%", minWidth: 0, overflow: "hidden" }}
  >
    <PanelTabsList
      aria-label="Request details"
      css={{
        flexShrink: 0,
        borderBottom: `1px solid ${theme.colors.borderMain}`,
      }}
    >
      {queryContainerRef !== undefined && (
        <PanelTabsTrigger value="query">Query</PanelTabsTrigger>
      )}
      <PanelTabsTrigger value="preview">Preview</PanelTabsTrigger>
      <PanelTabsTrigger value="diagnostics" onClick={onDiagnosticsOpen}>
        Diagnostics
      </PanelTabsTrigger>
    </PanelTabsList>
    {queryContainerRef !== undefined && (
      <PanelTabsContent
        value="query"
        css={{ flex: 1, position: "relative", overflow: "hidden" }}
      >
        <div
          ref={queryContainerRef}
          style={{
            height: "100%",
            minHeight: 0,
            minWidth: 0,
            overflow: "hidden",
            position: "relative",
          }}
        />
      </PanelTabsContent>
    )}
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
          <Text color="moreSubtle">
            {diagnosticsPending
              ? "Loading diagnostics..."
              : "No diagnostics available"}
          </Text>
        </Flex>
      )}
    </PanelTabsContent>
  </PanelTabs>
);
