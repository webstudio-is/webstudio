import { Fragment, useEffect, useState, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTitleActions,
  Flex,
  IconButton,
  PanelBanner,
  PanelContent,
  PanelTabs,
  PanelTabsContent,
  PanelTabsList,
  PanelTabsTrigger,
  ScrollArea,
  Separator,
  Text,
} from "@webstudio-is/design-system";
import { CopyIcon } from "@webstudio-is/icons";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import type { PublishLog } from "./use-publish-logs";
import { getPublishDuration } from "./use-publish-logs";

export type PublishValidationFinding = {
  severity: "error" | "warning";
  source?: "audit" | "build";
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
  onOpen,
}: {
  findings: PublishValidationFinding[];
  onOpen: () => void;
}) => {
  const errors = findings.filter(({ severity }) => severity === "error");
  const warnings = findings.filter(({ severity }) => severity === "warning");
  if (findings.length === 0) {
    return null;
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
}: {
  findings: PublishValidationFinding[];
  canViewPublishLogs: boolean;
  onSelect: (finding: PublishValidationFinding) => void;
}) => (
  <ScrollArea css={{ height: "100%" }}>
    <PanelContent as={Flex} direction="column" gap={3}>
      {findings.map((finding, index) => (
        <Fragment key={`${finding.severity}-${index}`}>
          <Flex direction="column" gap={2}>
            <Text color="subtle" variant="labels">
              {finding.source === "build" ? "Build" : "Audit"}
            </Text>
            {canViewPublishLogs ? (
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
  const [selectedBuildId, setSelectedBuildId] = useState<string>();
  const [selectedFinding, setSelectedFinding] =
    useState<PublishValidationFinding>();
  const isOpen = open ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;
  const errors = findings.filter(({ severity }) => severity === "error");
  const warnings = findings.filter(({ severity }) => severity === "warning");
  const selectedItem = items.find(({ buildId }) => buildId === selectedBuildId);
  const defaultTab = initialTab ?? (errors.length > 0 ? "errors" : "warnings");
  const [tab, setTab] = useState(defaultTab);
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

  useEffect(() => {
    setSelectedBuildId(undefined);
    setSelectedFinding(undefined);
    setTab(defaultTab);
  }, [target, isOpen, defaultTab]);

  useEffect(() => {
    if (canViewPublishLogs === false) {
      setSelectedBuildId(undefined);
      setSelectedFinding(undefined);
    }
  }, [canViewPublishLogs]);

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
            suffix={
              <DialogTitleActions>
                {canViewPublishLogs && reportText.length > 0 && (
                  <CopyToClipboard
                    text={reportText}
                    copyText="Copy all reports"
                  >
                    <IconButton
                      type="button"
                      aria-label="Copy all reports"
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <CopyIcon aria-hidden />
                    </IconButton>
                  </CopyToClipboard>
                )}
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
          ) : selectedItem !== undefined && canViewPublishLogs ? (
            <PanelContent
              as={Flex}
              direction="column"
              gap={3}
              css={{ minHeight: 0, flex: 1 }}
            >
              <Button
                type="button"
                color="neutral"
                onClick={() => setSelectedBuildId(undefined)}
              >
                Back
              </Button>
              <Text variant="titles">Publish log</Text>
              <Text>{selectedItem.domains.join(", ") || "Static export"}</Text>
              {selectedItem.logState === "loading" ? (
                <Text color="subtle">Loading logs…</Text>
              ) : selectedItem.logState === "available" ? (
                <ScrollArea css={{ minHeight: 0, flex: 1 }}>
                  <Text
                    as="pre"
                    userSelect="text"
                    css={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                  >
                    {selectedItem.logText}
                  </Text>
                </ScrollArea>
              ) : (
                <Text color="subtle">Publish logs are unavailable.</Text>
              )}
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
                />
              </PanelTabsContent>
              <PanelTabsContent
                value="publish"
                css={{ flex: 1, minHeight: 0, overflow: "hidden" }}
              >
                <ScrollArea css={{ height: "100%" }}>
                  <PanelContent as={Flex} direction="column" gap={3}>
                    {items.length === 0 && (
                      <Text color="subtle">No publishes in this session.</Text>
                    )}
                    {items.map((item) => {
                      const duration = getPublishDuration(item);
                      return (
                        <Flex key={item.buildId} direction="column" gap={2}>
                          <Text variant="labels">
                            {item.domains.join(", ") || "Static export"}
                          </Text>
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
                                {new Date(item.startedAt).toLocaleString()}
                              </Text>
                            )}
                          {canViewPublishLogs && duration !== undefined && (
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
                                {item.issuesOmitted} more issues not shown.
                              </Text>
                            )}
                          {canViewPublishLogs && item.status !== "pending" && (
                            <Button
                              type="button"
                              color="neutral"
                              onClick={() => {
                                setSelectedBuildId(item.buildId);
                                onLoadLog?.(item);
                              }}
                            >
                              View detailed report
                            </Button>
                          )}
                          {!canViewPublishLogs && (
                            <Text color="subtle">
                              Upgrade to Pro to view publish logs.
                            </Text>
                          )}
                          <Separator />
                        </Flex>
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
