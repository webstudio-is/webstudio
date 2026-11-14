import { getDiagnosticsReport } from "./diagnostics-utils";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import {
  Button,
  Collapsible,
  Dialog,
  DialogClose,
  DialogContent,
  DialogMaximize,
  DialogTitle,
  DialogTitleActions,
  Flex,
  IconButton,
  Link,
  PanelBanner,
  PanelContent,
  PanelTabs,
  PanelTabsContent,
  PanelTabsList,
  PanelTabsTrigger,
  ScrollAreaNative,
  SectionTitle,
  Separator,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { CopyIcon } from "@webstudio-is/icons";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import type { PublishLog } from "./use-publish-logs";
import { getPublishDuration } from "./use-publish-logs";
import { publishLogStatus } from "./constants";

export type PublishValidationFinding = {
  severity: "error" | "warning";
  source?: "audit" | "build" | "publish";
  title: ReactNode;
  summary?: string;
  details?: ReactNode;
  link?: ReactNode;
  relatedInstanceId?: string;
  reportText: string;
  buildId?: string;
};

const shortFinding = (finding: PublishValidationFinding) =>
  (
    finding.summary ?? (typeof finding.title === "string" ? finding.title : "")
  ).slice(0, 160);

export const PublishValidationBanner = ({
  findings,
  passed = false,
  onOpen,
}: {
  findings: PublishValidationFinding[];
  passed?: boolean;
  onOpen: () => void;
}) => {
  const errors = findings.filter(({ severity }) => severity === "error");
  const warnings = findings.filter(({ severity }) => severity === "warning");
  if (findings.length === 0) {
    return passed ? (
      <PanelBanner variant="success" role="status">
        <Text>Validation passed. Ready to publish.</Text>
      </PanelBanner>
    ) : null;
  }
  const countLabel = [
    errors.length > 0 &&
      `${errors.length} ${errors.length === 1 ? "error" : "errors"}`,
    warnings.length > 0 &&
      `${warnings.length} ${warnings.length === 1 ? "warning" : "warnings"}`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <PanelBanner variant={errors.length > 0 ? "error" : "warning"}>
      <Flex align="center" justify="between" gap={2}>
        <Text css={{ flex: 1, minWidth: 0 }}>
          Publish check found {countLabel}.{" "}
          {errors.length > 0 && "Fix the errors before publishing."}
        </Text>
        <Button
          type="button"
          color="ghost"
          css={{ flexShrink: 0 }}
          onClick={onOpen}
        >
          See issues
        </Button>
      </Flex>
    </PanelBanner>
  );
};

const FindingList = ({
  findings,
  canViewPublishLogs,
  onSelect,
  onOpenPublish,
  issuesOmitted = 0,
  publishBuildIds,
}: {
  findings: PublishValidationFinding[];
  canViewPublishLogs: boolean;
  onSelect: (finding: PublishValidationFinding) => void;
  onOpenPublish?: () => void;
  issuesOmitted?: number;
  publishBuildIds: string[];
}) => (
  <ScrollAreaNative css={{ height: "100%" }}>
    <PanelContent as={Flex} direction="column" gap={3}>
      {findings.map((finding, index) => (
        <Fragment key={`${finding.severity}-${index}`}>
          <Flex direction="column" gap={2}>
            {finding.source !== "publish" && (
              <Text color="subtle" variant="labels">
                {finding.source === "build" ? "Build" : "Audit"}
              </Text>
            )}
            {finding.source === "publish" ? (
              <Text variant="labels" userSelect="text">
                {canViewPublishLogs ? finding.title : shortFinding(finding)}
                {onOpenPublish !== undefined &&
                  finding.buildId !== undefined &&
                  publishBuildIds.includes(finding.buildId) && (
                    <>
                      {" "}
                      <Link
                        as="button"
                        type="button"
                        variant="inherit"
                        color="inherit"
                        underline="always"
                        css={{ border: 0, padding: 0, background: "none" }}
                        onClick={onOpenPublish}
                      >
                        show logs
                      </Link>
                    </>
                  )}
              </Text>
            ) : canViewPublishLogs ? (
              <Button
                type="button"
                color="ghost"
                onClick={() => onSelect(finding)}
              >
                {finding.title}
              </Button>
            ) : (
              <Text variant="labels" userSelect="text">
                {shortFinding(finding)}
              </Text>
            )}
          </Flex>
          {index < findings.length - 1 && <Separator />}
        </Fragment>
      ))}
      {canViewPublishLogs && issuesOmitted > 0 && (
        <Text color="subtle">{issuesOmitted} more issues not shown.</Text>
      )}
    </PanelContent>
  </ScrollAreaNative>
);

const FindingDetails = ({
  finding,
  onBack,
  onNavigate,
}: {
  finding: PublishValidationFinding;
  onBack: () => void;
  onNavigate: () => void;
}) => (
  <PanelContent
    as={Flex}
    direction="column"
    gap={3}
    css={{ minHeight: 0, flex: 1 }}
  >
    <Button type="button" color="neutral" onClick={onBack}>
      Back
    </Button>
    <Text variant="titles" userSelect="text">
      {finding.title}
    </Text>
    {finding.details !== undefined && (
      <ScrollAreaNative css={{ minHeight: 0, flex: 1 }}>
        <Text css={{ userSelect: "text" }}>{finding.details}</Text>
      </ScrollAreaNative>
    )}
    <div
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        onNavigate();
      }}
    >
      {finding.link}
    </div>
  </PanelContent>
);

const PublishHistoryEntry = ({
  item,
  defaultOpen,
  canViewPublishLogs,
}: {
  item: PublishLog;
  defaultOpen: boolean;
  canViewPublishLogs: boolean;
}) => {
  const duration = getPublishDuration(item);
  return (
    <Collapsible.Root asChild defaultOpen={defaultOpen}>
      <Flex direction="column" gap={2}>
        <Collapsible.Trigger asChild>
          <SectionTitle
            aria-labelledby={`publish-title-${item.buildId}`}
            suffixPlaceholder={<CopyIcon aria-hidden />}
            suffix={
              canViewPublishLogs &&
              item.logState === "available" &&
              item.logText !== undefined && (
                <CopyToClipboard text={item.logText} copyText="Copy log">
                  <IconButton
                    type="button"
                    aria-label="Copy log"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <CopyIcon aria-hidden />
                  </IconButton>
                </CopyToClipboard>
              )
            }
          >
            <Text
              as="span"
              id={`publish-title-${item.buildId}`}
              variant="titles"
              truncate
              css={{ flex: "0 1 auto", minWidth: 0 }}
            >
              {item.domains.length > 0
                ? item.domains.join(", ")
                : "Static export"}
            </Text>
          </SectionTitle>
        </Collapsible.Trigger>
        <Collapsible.Content asChild>
          <Flex
            direction="column"
            gap={2}
            css={{
              paddingInline: theme.panel.paddingInline,
            }}
          >
            <Text color="subtle">{publishLogStatus[item.status].text}</Text>
            {canViewPublishLogs && item.startedAt !== undefined && (
              <Text>Started: {new Date(item.startedAt).toLocaleString()}</Text>
            )}
            {canViewPublishLogs && duration !== undefined && (
              <Text>Duration: {duration}s</Text>
            )}
            {canViewPublishLogs &&
              item.status === "failed" &&
              (item.failedStage !== undefined || item.code !== undefined) && (
                <Text color="destructive">
                  {[item.failedStage, item.code?.replaceAll("_", " ")]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              )}
            {canViewPublishLogs &&
              item.status !== "pending" &&
              (item.logState === "available" ? (
                <Text
                  as="pre"
                  variant="mono"
                  userSelect="text"
                  css={{
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {item.logText}
                </Text>
              ) : (
                <Text color="subtle">
                  {item.logHandle === undefined ||
                  item.logState === "unavailable"
                    ? "Publish logs are unavailable."
                    : "Loading logs…"}
                </Text>
              ))}
          </Flex>
        </Collapsible.Content>
        <Separator />
      </Flex>
    </Collapsible.Root>
  );
};

const PublishHistory = ({
  items,
  canViewPublishLogs,
  onLoadLog,
}: {
  items: PublishLog[];
  canViewPublishLogs: boolean;
  onLoadLog?: (item: PublishLog) => void;
}) => {
  useEffect(() => {
    if (!canViewPublishLogs) {
      return;
    }
    for (const item of items) {
      if (
        item.status !== "pending" &&
        item.logHandle !== undefined &&
        item.logState === undefined
      ) {
        onLoadLog?.(item);
      }
    }
  }, [canViewPublishLogs, items, onLoadLog]);
  return (
    <ScrollAreaNative css={{ height: "100%" }}>
      <PanelContent as={Flex} direction="column" gap={3}>
        {!canViewPublishLogs && (
          <PanelBanner variant="info" role="note">
            <Text>Upgrade to Pro to view publish logs.</Text>
          </PanelBanner>
        )}
        {items.length === 0 && (
          <Text color="subtle">No publishes in this session.</Text>
        )}
        {items.map((item, index) => (
          <PublishHistoryEntry
            key={item.buildId}
            item={item}
            defaultOpen={index === items.length - 1}
            canViewPublishLogs={canViewPublishLogs}
          />
        ))}
      </PanelContent>
    </ScrollAreaNative>
  );
};

export const PublishDiagnosticsDialog = ({
  findings,
  open,
  onOpenChange,
  target,
  initialTab,
  items = [],
  canViewPublishLogs = true,
  includeLatestPublishFindings = true,
  onLoadLog,
}: {
  findings: PublishValidationFinding[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  target?: string;
  initialTab?: "warnings" | "errors" | "publish";
  items?: PublishLog[];
  canViewPublishLogs?: boolean;
  includeLatestPublishFindings?: boolean;
  onLoadLog?: (item: PublishLog) => void;
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] =
    useState<PublishValidationFinding>();
  const isOpen = open ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  const {
    findings: reportFindings,
    tabs,
    publishes: orderedItems,
    reportText,
    publishText,
    issuesOmitted,
  } = getDiagnosticsReport({
    findings,
    items,
    canViewPublishLogs,
    includeLatestPublishFindings,
  });
  const defaultTab = initialTab ?? tabs.at(-1)?.value ?? "publish";
  const [tab, setTab] = useState(defaultTab);

  const activeTab =
    (tab === "publish" && items.length > 0) ||
    tabs.some(({ value }) => value === tab)
      ? tab
      : (tabs.at(-1)?.value ?? "publish");

  const copyText = activeTab === "publish" ? publishText : reportText;

  useEffect(() => {
    setSelectedFinding(undefined);
    setTab(defaultTab);
  }, [target, isOpen, defaultTab]);

  useEffect(() => {
    if (canViewPublishLogs === false) {
      setSelectedFinding(undefined);
    }
  }, [canViewPublishLogs]);

  if (open === undefined && reportFindings.length === 0 && items.length === 0) {
    return null;
  }

  return (
    <>
      {open === undefined && (
        <PublishValidationBanner
          findings={reportFindings}
          onOpen={() => setIsOpen(true)}
        />
      )}
      <Dialog open={isOpen} onOpenChange={setIsOpen} draggable resize="both">
        <DialogContent
          width={640}
          height={640}
          aria-describedby={undefined}
          css={{ display: "flex", flexDirection: "column" }}
        >
          <DialogTitle
            maximizable
            suffix={
              <DialogTitleActions>
                {canViewPublishLogs && copyText.length > 0 && (
                  <CopyToClipboard text={copyText} copyText="Copy all reports">
                    <IconButton
                      type="button"
                      aria-label="Copy all reports"
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <CopyIcon aria-hidden />
                    </IconButton>
                  </CopyToClipboard>
                )}
                <DialogMaximize />
                <DialogClose />
              </DialogTitleActions>
            }
          >
            Diagnostics
          </DialogTitle>
          {selectedFinding !== undefined && canViewPublishLogs ? (
            <FindingDetails
              finding={selectedFinding}
              onBack={() => setSelectedFinding(undefined)}
              onNavigate={() => setIsOpen(false)}
            />
          ) : (
            <PanelTabs
              value={activeTab}
              onValueChange={(value) => setTab(value as typeof tab)}
              css={{ flex: 1, minHeight: 0, overflow: "hidden" }}
            >
              <PanelTabsList aria-label="Publish check severity">
                {tabs.map(({ value, label }) => (
                  <PanelTabsTrigger key={value} value={value}>
                    {label}
                  </PanelTabsTrigger>
                ))}
                {items.length > 0 && (
                  <PanelTabsTrigger value="publish">Publish</PanelTabsTrigger>
                )}
              </PanelTabsList>
              {tabs.map(({ value, findings }) => (
                <PanelTabsContent
                  key={value}
                  value={value}
                  css={{ flex: 1, minHeight: 0, overflow: "hidden" }}
                >
                  <FindingList
                    findings={findings}
                    canViewPublishLogs={canViewPublishLogs}
                    issuesOmitted={issuesOmitted}
                    publishBuildIds={items.map(({ buildId }) => buildId)}
                    onSelect={setSelectedFinding}
                    onOpenPublish={
                      items.length > 0 ? () => setTab("publish") : undefined
                    }
                  />
                </PanelTabsContent>
              ))}
              <PanelTabsContent
                value="publish"
                css={{ flex: 1, minHeight: 0, overflow: "hidden" }}
              >
                <PublishHistory
                  items={orderedItems}
                  canViewPublishLogs={canViewPublishLogs}
                  onLoadLog={onLoadLog}
                />
              </PanelTabsContent>
            </PanelTabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
