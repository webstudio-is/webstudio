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
import type { PublishSessionItem } from "./use-publish-session";
import { getPublishDuration } from "./use-publish-session";

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
  isPro,
  onSelect,
}: {
  findings: PublishValidationFinding[];
  isPro: boolean;
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
            {isPro ? (
              <Button
                type="button"
                color="ghost"
                onClick={() => onSelect(finding)}
              >
                {finding.title}
              </Button>
            ) : (
              <Text variant="labels" userSelect="text">
                {finding.summary ?? finding.title}
              </Text>
            )}
          </Flex>
          {index < findings.length - 1 && <Separator />}
        </Fragment>
      ))}
    </PanelContent>
  </ScrollArea>
);

export const PublishValidationResults = ({
  findings,
  open,
  onOpenChange,
  target,
  initialTab,
  items = [],
  isPro = true,
  onLoadLog,
}: {
  findings: PublishValidationFinding[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  target?: string;
  initialTab?: "warnings" | "errors" | "publish";
  items?: PublishSessionItem[];
  isPro?: boolean;
  onLoadLog?: (item: PublishSessionItem) => void;
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>();
  const [selectedFinding, setSelectedFinding] =
    useState<PublishValidationFinding>();
  const isOpen = open ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;
  const errors = findings.filter(({ severity }) => severity === "error");
  const warnings = findings.filter(({ severity }) => severity === "warning");
  const selectedItem = items.find(
    ({ attemptId }) => attemptId === selectedAttemptId
  );
  const defaultTab = initialTab ?? (errors.length > 0 ? "errors" : "warnings");
  const reportText = findings.map(({ reportText }) => reportText).join("\n\n");

  useEffect(() => {
    setSelectedAttemptId(undefined);
    setSelectedFinding(undefined);
  }, [target, isOpen]);

  useEffect(() => {
    if (isPro === false) {
      setSelectedAttemptId(undefined);
      setSelectedFinding(undefined);
    }
  }, [isPro]);

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
                {isPro && reportText.length > 0 && (
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
          {selectedFinding !== undefined && isPro ? (
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
              {selectedFinding.link}
            </PanelContent>
          ) : selectedItem !== undefined && isPro ? (
            <PanelContent
              as={Flex}
              direction="column"
              gap={3}
              css={{ minHeight: 0, flex: 1 }}
            >
              <Button
                type="button"
                color="neutral"
                onClick={() => setSelectedAttemptId(undefined)}
              >
                Back
              </Button>
              <Text variant="titles">Publish report</Text>
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
              key={`${defaultTab}-${target}`}
              defaultValue={defaultTab}
              css={{ flex: 1, minHeight: 0, overflow: "hidden" }}
            >
              <PanelTabsList aria-label="Publish check severity">
                <PanelTabsTrigger value="warnings">Warnings</PanelTabsTrigger>
                <PanelTabsTrigger value="errors">Errors</PanelTabsTrigger>
                <PanelTabsTrigger value="publish">Publish</PanelTabsTrigger>
              </PanelTabsList>
              <PanelTabsContent
                value="warnings"
                css={{ flex: 1, minHeight: 0, overflow: "hidden" }}
              >
                <FindingList
                  findings={warnings}
                  isPro={isPro}
                  onSelect={setSelectedFinding}
                />
              </PanelTabsContent>
              <PanelTabsContent
                value="errors"
                css={{ flex: 1, minHeight: 0, overflow: "hidden" }}
              >
                <FindingList
                  findings={errors}
                  isPro={isPro}
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
                        <Flex key={item.attemptId} direction="column" gap={2}>
                          <Text variant="labels">
                            {item.domains.join(", ") || "Static export"}
                          </Text>
                          <Text color="subtle">
                            {item.availability === "pending"
                              ? "Publishing started"
                              : item.outcome === "succeeded"
                                ? "Published"
                                : item.outcome === "failed"
                                  ? "Publish failed"
                                  : "Publish logs are unavailable."}
                          </Text>
                          {item.startedAt !== undefined && (
                            <Text>
                              Started:{" "}
                              {new Date(item.startedAt).toLocaleString()}
                            </Text>
                          )}
                          {duration !== undefined && (
                            <Text>Duration: {duration}s</Text>
                          )}
                          {item.outcome === "failed" &&
                            (item.failedStage !== undefined ||
                              item.failureReason !== undefined) && (
                              <Text color="destructive">
                                {[
                                  item.failedStage,
                                  item.failureReason?.replaceAll("_", " "),
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
                                  {finding.summary ?? finding.title}
                                </Text>
                              ))}
                            </Flex>
                          )}
                          {item.issues !== undefined &&
                            item.issues.length > 0 && (
                              <Text variant="labels">Build</Text>
                            )}
                          {item.issues?.map((issue, index) => (
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
                          {(item.issuesOmitted ?? 0) > 0 && (
                            <Text color="subtle">
                              {item.issuesOmitted} more issues not shown.
                            </Text>
                          )}
                          {isPro && item.availability === "available" && (
                            <Button
                              type="button"
                              color="neutral"
                              onClick={() => {
                                setSelectedAttemptId(item.attemptId);
                                onLoadLog?.(item);
                              }}
                            >
                              View detailed report
                            </Button>
                          )}
                          {!isPro && (
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
