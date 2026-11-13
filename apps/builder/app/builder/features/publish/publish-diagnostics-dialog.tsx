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
  ScrollArea,
  SectionTitle,
  SectionTitleLabel,
  Separator,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { CopyIcon } from "@webstudio-is/icons";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import type { PublishLog } from "./use-publish-logs";
import { getPublishDuration } from "./use-publish-logs";

export type PublishValidationFinding = {
  severity: "error" | "warning";
  source?: "audit" | "build" | "publish";
  title: ReactNode;
  summary?: string;
  details?: ReactNode;
  link?: ReactNode;
  relatedInstanceId?: string;
  reportText: string;
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
}: {
  findings: PublishValidationFinding[];
  canViewPublishLogs: boolean;
  onSelect: (finding: PublishValidationFinding) => void;
  onOpenPublish?: () => void;
}) => (
  <ScrollArea css={{ height: "100%" }}>
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
                {onOpenPublish !== undefined && (
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
    </PanelContent>
  </ScrollArea>
);

export const PublishDiagnosticsDialog = ({
  findings,
  open,
  onOpenChange,
  target,
  initialTab,
  items = [],
  canViewPublishLogs = true,
  onLoadLog,
}: {
  findings: PublishValidationFinding[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  target?: string;
  initialTab?: "warnings" | "errors" | "publish";
  items?: PublishLog[];
  canViewPublishLogs?: boolean;
  onLoadLog?: (item: PublishLog) => void;
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] =
    useState<PublishValidationFinding>();
  const isOpen = open ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;
  const errors = findings.filter(({ severity }) => severity === "error");
  const warnings = findings.filter(({ severity }) => severity === "warning");
  const defaultTab = initialTab ?? (errors.length > 0 ? "errors" : "warnings");
  const [tab, setTab] = useState(defaultTab);
  const orderedItems = [...items].reverse();
  const activeTab =
    (tab === "warnings" && warnings.length > 0) ||
    (tab === "errors" && errors.length > 0) ||
    (tab === "publish" && items.length > 0)
      ? tab
      : errors.length > 0
        ? "errors"
        : warnings.length > 0
          ? "warnings"
          : "publish";
  const reportText = findings.map(({ reportText }) => reportText).join("\n\n");
  const publishText = orderedItems
    .filter(
      (item) => item.logState === "available" && item.logText !== undefined
    )
    .map((item) =>
      [
        ...(item.domains.length > 0 ? item.domains : ["Static export"]),
        item.logText,
      ].join("\n")
    )
    .join("\n\n");
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

  useEffect(() => {
    if (isOpen === false || activeTab !== "publish" || !canViewPublishLogs) {
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
  }, [activeTab, canViewPublishLogs, isOpen, items, onLoadLog]);

  if (open === undefined && findings.length === 0) {
    return null;
  }

  return (
    <>
      {open === undefined && (
        <PublishValidationBanner
          findings={findings}
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
            <PanelContent
              as={Flex}
              direction="column"
              gap={3}
              css={{ minHeight: 0, flex: 1 }}
            >
              <Button
                type="button"
                color="neutral"
                onClick={() => setSelectedFinding(undefined)}
              >
                Back
              </Button>
              <Text variant="titles" userSelect="text">
                {selectedFinding.title}
              </Text>
              {selectedFinding.details !== undefined && (
                <ScrollArea css={{ minHeight: 0, flex: 1 }}>
                  <Text userSelect="text">{selectedFinding.details}</Text>
                </ScrollArea>
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
                  setIsOpen(false);
                }}
              >
                {selectedFinding.link}
              </div>
            </PanelContent>
          ) : (
            <PanelTabs
              value={activeTab}
              onValueChange={(value) => setTab(value as typeof tab)}
              css={{ flex: 1, minHeight: 0, overflow: "hidden" }}
            >
              <PanelTabsList aria-label="Publish check severity">
                {warnings.length > 0 && (
                  <PanelTabsTrigger value="warnings">Warnings</PanelTabsTrigger>
                )}
                {errors.length > 0 && (
                  <PanelTabsTrigger value="errors">Errors</PanelTabsTrigger>
                )}
                {items.length > 0 && (
                  <PanelTabsTrigger value="publish">Publish</PanelTabsTrigger>
                )}
              </PanelTabsList>
              <PanelTabsContent
                value="warnings"
                css={{ flex: 1, minHeight: 0, overflow: "hidden" }}
              >
                <FindingList
                  findings={warnings}
                  canViewPublishLogs={canViewPublishLogs}
                  onSelect={setSelectedFinding}
                  onOpenPublish={
                    items.length > 0 ? () => setTab("publish") : undefined
                  }
                />
              </PanelTabsContent>
              <PanelTabsContent
                value="errors"
                css={{ flex: 1, minHeight: 0, overflow: "hidden" }}
              >
                <FindingList
                  findings={errors}
                  canViewPublishLogs={canViewPublishLogs}
                  onSelect={setSelectedFinding}
                  onOpenPublish={
                    items.length > 0 ? () => setTab("publish") : undefined
                  }
                />
              </PanelTabsContent>
              <PanelTabsContent
                value="publish"
                css={{ flex: 1, minHeight: 0, overflow: "hidden" }}
              >
                <ScrollArea css={{ height: "100%" }}>
                  <PanelContent as={Flex} direction="column" gap={3}>
                    {!canViewPublishLogs && (
                      <PanelBanner variant="info" role="note">
                        <Text>Upgrade to Pro to view publish logs.</Text>
                      </PanelBanner>
                    )}
                    {items.length === 0 && (
                      <Text color="subtle">No publishes in this session.</Text>
                    )}
                    {orderedItems.map((item, index) => {
                      const duration = getPublishDuration(item);
                      return (
                        <Collapsible.Root
                          key={item.buildId}
                          asChild
                          defaultOpen={index === orderedItems.length - 1}
                        >
                          <Flex direction="column" gap={2}>
                            <Collapsible.Trigger asChild>
                              <SectionTitle
                                suffixPlaceholder={<CopyIcon aria-hidden />}
                                suffix={
                                  canViewPublishLogs &&
                                  item.logState === "available" &&
                                  item.logText !== undefined && (
                                    <CopyToClipboard
                                      text={item.logText}
                                      copyText="Copy log"
                                    >
                                      <IconButton
                                        type="button"
                                        aria-label="Copy log"
                                        onPointerDown={(event) =>
                                          event.stopPropagation()
                                        }
                                      >
                                        <CopyIcon aria-hidden />
                                      </IconButton>
                                    </CopyToClipboard>
                                  )
                                }
                              >
                                <SectionTitleLabel>
                                  {item.domains.length > 0
                                    ? item.domains.join(", ")
                                    : "Static export"}
                                </SectionTitleLabel>
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
                                <Text color="subtle">
                                  {item.status === "pending"
                                    ? "Publishing started"
                                    : item.status === "success"
                                      ? "Published"
                                      : "Publish failed"}
                                </Text>
                                {canViewPublishLogs &&
                                  item.startedAt !== undefined && (
                                    <Text>
                                      Started:{" "}
                                      {new Date(
                                        item.startedAt
                                      ).toLocaleString()}
                                    </Text>
                                  )}
                                {canViewPublishLogs &&
                                  duration !== undefined && (
                                    <Text>Duration: {duration}s</Text>
                                  )}
                                {canViewPublishLogs &&
                                  item.status === "failed" &&
                                  (item.failedStage !== undefined ||
                                    item.code !== undefined) && (
                                    <Text color="destructive">
                                      {[
                                        item.failedStage,
                                        item.code?.replaceAll("_", " "),
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </Text>
                                  )}
                                {canViewPublishLogs &&
                                  item.status !== "pending" &&
                                  (item.logState === "available" ? (
                                    <Text
                                      as="pre"
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
                                {item.findings.length > 0 && (
                                  <Flex direction="column" gap={1}>
                                    <Text variant="labels">Audit</Text>
                                    {item.findings.map((finding, index) => (
                                      <Text key={index}>
                                        {canViewPublishLogs
                                          ? (finding.summary ?? finding.title)
                                          : shortFinding(finding)}
                                      </Text>
                                    ))}
                                  </Flex>
                                )}
                                {canViewPublishLogs &&
                                  item.issues !== undefined &&
                                  item.issues.length > 0 && (
                                    <Text variant="labels">Build</Text>
                                  )}
                                {canViewPublishLogs &&
                                  item.issues?.map((issue, index) => (
                                    <Text
                                      key={index}
                                      color={
                                        issue.severity === "error"
                                          ? "destructive"
                                          : "subtle"
                                      }
                                    >
                                      {issue.message}
                                    </Text>
                                  ))}
                                {canViewPublishLogs &&
                                  (item.issuesOmitted ?? 0) > 0 && (
                                    <Text color="subtle">
                                      {item.issuesOmitted} more issues not
                                      shown.
                                    </Text>
                                  )}
                              </Flex>
                            </Collapsible.Content>
                            <Separator />
                          </Flex>
                        </Collapsible.Root>
                      );
                    })}
                  </PanelContent>
                </ScrollArea>
              </PanelTabsContent>
            </PanelTabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
