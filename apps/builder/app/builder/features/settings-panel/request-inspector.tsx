import { useState, type ComponentProps, type ReactNode, type Ref } from "react";
import {
  cssVar,
  Flex,
  Grid,
  PanelTabs,
  PanelTabsContent,
  PanelTabsList,
  PanelTabsTrigger,
  rawTheme,
  ScrollAreaNative,
  SectionTitle,
  SectionTitleLabel,
  styled,
  Text,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import { AlertIcon, InfoCircleIcon, SpinnerIcon } from "@webstudio-is/icons";
import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";

export const clearSettledDiagnosticsKey = (
  pendingKey: string | undefined,
  settledKey: string
) => (pendingKey === settledKey ? undefined : pendingKey);

export const RequestDiagnosticsContent = ({
  children,
  padded = true,
}: {
  children: ReactNode;
  padded?: boolean;
}) => (
  <ScrollAreaNative css={{ height: "100%", overflow: "auto" }}>
    {padded ? (
      <Flex direction="column" gap={3} css={{ padding: theme.panel.padding }}>
        {children}
      </Flex>
    ) : (
      children
    )}
  </ScrollAreaNative>
);

export const RequestDiagnosticsTable = ({
  children,
}: {
  children: ReactNode;
}) => (
  <Grid
    css={{
      border: `1px solid ${cssVar("--border-default")}`,
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
      borderBottom: `1px solid ${cssVar("--border-default")}`,
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

export const RequestDiagnosticDisclosure = ({
  severity,
  title,
  location,
  details,
  defaultOpen = false,
}: {
  severity: "error" | "warning";
  title: string;
  location: string;
  details: ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <Grid
      css={{
        borderBottom: `1px solid ${cssVar("--border-default")}`,
        "&:last-child": { borderBottom: 0 },
      }}
    >
      <CollapsibleSectionRoot
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        fullWidth
        showSeparator={false}
        trigger={
          <SectionTitle
            aria-label={`${severity === "error" ? "Error" : "Warning"}: ${title}`}
          >
            {severity === "warning" && (
              <AlertIcon
                aria-hidden
                color={cssVar("--foreground-warning")}
                style={{ flexShrink: 0 }}
              />
            )}
            <SectionTitleLabel onClick={() => setIsOpen((value) => !value)}>
              {severity === "error" ? `Error · ${title}` : title}
            </SectionTitleLabel>
          </SectionTitle>
        }
      >
        <Grid
          css={{
            gridTemplateColumns: "max-content minmax(0, 1fr)",
            columnGap: theme.spacing[7],
            rowGap: theme.spacing[3],
            paddingInline: theme.panel.paddingInline,
            paddingTop: theme.spacing[2],
            "& > :nth-child(odd)": { minWidth: theme.spacing[17] },
            "& > :nth-child(even)": {
              minWidth: 0,
              overflowWrap: "anywhere",
            },
          }}
        >
          <Text color="moreSubtle">Location</Text>
          <Text userSelect="text">{location}</Text>
          <Text color="moreSubtle">Details</Text>
          <Text userSelect="text">{details}</Text>
        </Grid>
      </CollapsibleSectionRoot>
    </Grid>
  );
};

const RequestInspectorLoading = ({ label }: { label: string }) => (
  <Flex
    role="status"
    aria-label={label}
    aria-live="polite"
    direction="column"
    align="center"
    justify="center"
    gap={2}
    css={{
      position: "absolute",
      inset: 0,
      zIndex: 1,
      backgroundColor: cssVar("--background-primary"),
    }}
  >
    <SpinnerIcon size={rawTheme.spacing[15]} />
    <Text color="moreSubtle">{label}</Text>
  </Flex>
);

export const RequestInspector = ({
  queryContainerRef,
  preview,
  diagnostics,
  queryPending = false,
  previewPending = false,
  diagnosticsPending = false,
  onDiagnosticsOpen,
}: {
  queryContainerRef?: Ref<HTMLDivElement>;
  preview: ReactNode;
  diagnostics?: ReactNode;
  queryPending?: boolean;
  previewPending?: boolean;
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
        borderBottom: `1px solid ${cssVar("--border-default")}`,
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
        aria-busy={queryPending}
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
        {queryPending && <RequestInspectorLoading label="Loading query…" />}
      </PanelTabsContent>
    )}
    <PanelTabsContent
      value="preview"
      aria-busy={previewPending}
      css={{ flex: 1, position: "relative", overflow: "hidden" }}
    >
      {preview}
      {previewPending && <RequestInspectorLoading label="Loading preview…" />}
    </PanelTabsContent>
    <PanelTabsContent
      value="diagnostics"
      aria-busy={diagnosticsPending}
      css={{ flex: 1, position: "relative", overflow: "hidden" }}
    >
      {diagnostics ?? (
        <Flex align="center" justify="center" css={{ height: "100%" }}>
          <Text color="moreSubtle">No diagnostics available</Text>
        </Flex>
      )}
      {diagnosticsPending && (
        <RequestInspectorLoading label="Loading diagnostics…" />
      )}
    </PanelTabsContent>
  </PanelTabs>
);
