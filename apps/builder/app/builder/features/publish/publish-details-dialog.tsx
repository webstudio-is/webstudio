import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTitleActions,
  Flex,
  IconButton,
  PanelTabs,
  PanelTabsContent,
  PanelTabsList,
  PanelTabsTrigger,
  ScrollArea,
  Separator,
  Text,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import { AlertIcon, CheckCircleIcon } from "@webstudio-is/icons";
import {
  findPageAndSelectorByInstanceId,
  runPrePublishAudit,
  type PrePublishAuditFinding,
} from "@webstudio-is/project-build/runtime";
import {
  $planFeatures,
  $registeredComponentMetas,
  $selectedPageId,
  selectInstance,
} from "~/shared/nano-states";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $props,
  $resources,
  $project,
  $styleSourceSelections,
  $styles,
} from "~/shared/sync/data-stores";
import { nativeClient } from "~/shared/trpc/trpc-client";

type Filter = "all" | "error" | "warning";

type ActivityItem = {
  id: string;
  buildId?: string;
  status?: string;
  summary?: string;
  domains: string[];
  createdAt: string;
  completedAt?: string;
  reportAvailability?: string;
};

const Activity = ({
  label,
  fallback,
  latestBuildId,
  onClose,
}: {
  label: string;
  fallback: ReactNode;
  latestBuildId?: string;
  onClose: () => void;
}) => {
  const project = useStore($project);
  const pages = useStore($pages);
  const instances = useStore($instances);
  const { allowAdvancedPublishDiagnostics = false } = useStore($planFeatures);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [report, setReport] = useState<unknown>();
  const [selectedId, setSelectedId] = useState<string>();
  const [reportFilter, setReportFilter] = useState<Filter>("all");

  const reportData =
    typeof report === "object" && report !== null && "report" in report
      ? (report.report as {
          actorLabel?: string;
          stages?: { name: string; status: string }[];
          diagnostics?: { severity: string; stage: string; message: string }[];
          auditSnapshot?: {
            severity: string;
            ruleId: string;
            message: string;
            location?: { instanceId?: string };
          }[];
        })
      : undefined;
  const diagnostics = (reportData?.diagnostics ?? []).filter(
    (item) => reportFilter === "all" || item.severity === reportFilter
  );

  useEffect(() => {
    if (project == null) {
      return;
    }
    nativeClient.domain.publishActivity
      .query({ projectId: project.id })
      .then((result) => {
        if (result.success) {
          setItems(
            result.publishes.filter(
              (item) =>
                item.domains.includes(label) ||
                (label === "Static export" && item.target === "static")
            ) as ActivityItem[]
          );
        }
      });
  }, [label, project]);

  if (selectedId !== undefined) {
    return (
      <Flex direction="column" gap="3" css={{ padding: theme.spacing[5] }}>
        <Button
          color="neutral"
          onClick={() => {
            setSelectedId(undefined);
            setReport(undefined);
          }}
        >
          Back
        </Button>
        <Text variant="titles">Publish report</Text>
        {report === undefined ? (
          <Text color="subtle">Loading report…</Text>
        ) : reportData === undefined ? (
          <Text color="subtle">This detailed report is unavailable.</Text>
        ) : (
          <Flex direction="column" gap="3">
            {reportData.actorLabel !== undefined && (
              <Text color="subtle">Published by {reportData.actorLabel}</Text>
            )}
            <Text variant="titles">Audit at publish time</Text>
            {(reportData.auditSnapshot ?? []).length === 0 ? (
              <Text color="subtle">No audit issues were reported.</Text>
            ) : (
              (reportData.auditSnapshot ?? []).map((item, index) => (
                <Flex
                  key={`${item.ruleId}-${index}`}
                  direction="column"
                  gap="1"
                >
                  <Text variant="labels">
                    {item.severity} · {item.ruleId}
                  </Text>
                  <Text>{item.message}</Text>
                  {item.location?.instanceId !== undefined &&
                    pages !== undefined &&
                    instances.has(item.location.instanceId) && (
                      <Button
                        color="neutral"
                        onClick={() => {
                          const location = findPageAndSelectorByInstanceId(
                            pages,
                            instances,
                            item.location!.instanceId!
                          );
                          $selectedPageId.set(location.pageId);
                          selectInstance(location.instanceSelector);
                          onClose();
                        }}
                      >
                        Show element
                      </Button>
                    )}
                </Flex>
              ))
            )}
            <Text variant="titles">Build diagnostics</Text>
            <Flex gap="2">
              {(["all", "error", "warning"] as const).map((value) => (
                <Button
                  key={value}
                  color={reportFilter === value ? "primary" : "neutral"}
                  onClick={() => setReportFilter(value)}
                >
                  {value === "all"
                    ? "All"
                    : value === "error"
                    ? "Errors"
                    : "Warnings"}
                </Button>
              ))}
            </Flex>
            {diagnostics.length === 0 ? (
              <Text color="subtle">No diagnostics in this category.</Text>
            ) : (
              diagnostics.map((item, index) => (
                <Flex key={`${item.stage}-${index}`} direction="column" gap="1">
                  <Text variant="labels">
                    {item.severity} · {item.stage}
                  </Text>
                  <Text userSelect="text">{item.message}</Text>
                </Flex>
              ))
            )}
            {(reportData.stages ?? []).map((stage) => (
              <Text key={stage.name} color="subtle">
                {stage.name}: {stage.status}
              </Text>
            ))}
          </Flex>
        )}
      </Flex>
    );
  }

  if (items.length === 0) {
    return (
      <Flex direction="column" gap="3" css={{ padding: theme.spacing[5] }}>
        <Text variant="titles">Latest publish</Text>
        <Text>{fallback}</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="3" css={{ padding: theme.spacing[5] }}>
      {items.map((item) => (
        <Flex key={item.id} direction="column" gap="1">
          <Flex gap="2" align="center">
            <Text variant="titles">
              {item.summary ?? item.status ?? "Published"}
            </Text>
            {item.buildId !== undefined && item.buildId === latestBuildId && (
              <Text variant="labels">Latest</Text>
            )}
          </Flex>
          <Text color="subtle">
            {new Date(item.createdAt).toLocaleString()}
            {item.completedAt !== undefined &&
              ` · ${Math.max(
                0,
                Math.round(
                  (new Date(item.completedAt).getTime() -
                    new Date(item.createdAt).getTime()) /
                    1000
                )
              )}s`}
          </Text>
          {allowAdvancedPublishDiagnostics &&
            item.reportAvailability === "available" &&
            project !== undefined && (
              <Button
                color="neutral"
                onClick={async () => {
                  setSelectedId(item.id);
                  const result = await nativeClient.domain.publishReport.query({
                    projectId: project.id,
                    attemptId: item.id,
                  });
                  setReport(
                    result.success
                      ? result.result
                      : { availability: "unavailable" }
                  );
                }}
              >
                View detailed report
              </Button>
            )}
          {!allowAdvancedPublishDiagnostics &&
            item.reportAvailability !== undefined && (
              <Text color="subtle">
                Detailed reports are available on Pro plans.
              </Text>
            )}
          <Separator />
        </Flex>
      ))}
    </Flex>
  );
};

let cachedAuditInputs: unknown[] = [];
let cachedAuditFindings: PrePublishAuditFinding[] = [];

export const getCurrentPrePublishAudit = () => {
  const inputs = [
    $pages.get(),
    $instances.get(),
    $props.get(),
    $dataSources.get(),
    $resources.get(),
    $registeredComponentMetas.get(),
    $assets.get(),
    $breakpoints.get(),
    $styles.get(),
    $styleSourceSelections.get(),
  ];
  if (
    inputs.length === cachedAuditInputs.length &&
    inputs.every((input, index) => input === cachedAuditInputs[index])
  ) {
    return cachedAuditFindings;
  }
  cachedAuditInputs = inputs;
  cachedAuditFindings = runPrePublishAudit({
    pages: inputs[0] as ReturnType<typeof $pages.get>,
    instances: inputs[1] as ReturnType<typeof $instances.get>,
    props: inputs[2] as ReturnType<typeof $props.get>,
    dataSources: inputs[3] as ReturnType<typeof $dataSources.get>,
    resources: inputs[4] as ReturnType<typeof $resources.get>,
    metas: inputs[5] as ReturnType<typeof $registeredComponentMetas.get>,
    assets: inputs[6] as ReturnType<typeof $assets.get>,
    breakpoints: inputs[7] as ReturnType<typeof $breakpoints.get>,
    styles: inputs[8] as ReturnType<typeof $styles.get>,
    styleSourceSelections: inputs[9] as ReturnType<
      typeof $styleSourceSelections.get
    >,
  });
  return cachedAuditFindings;
};

const Findings = ({
  findings,
  onClose,
}: {
  findings: PrePublishAuditFinding[];
  onClose: () => void;
}) => {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<PrePublishAuditFinding>();
  const { allowAdvancedPublishDiagnostics = false } = useStore($planFeatures);
  const pages = useStore($pages);
  const instances = useStore($instances);
  const visible = findings.filter(
    (finding) => filter === "all" || finding.severity === filter
  );

  if (selected !== undefined) {
    return (
      <Flex direction="column" gap="3" css={{ padding: theme.spacing[5] }}>
        <Button color="neutral" onClick={() => setSelected(undefined)}>
          Back
        </Button>
        <Text variant="titles">{selected.ruleId}</Text>
        <Text>{selected.message}</Text>
        {selected.location.pagePath !== undefined && (
          <Text color="subtle">Page: {selected.location.pagePath}</Text>
        )}
        {selected.location.instanceId !== undefined &&
          (allowAdvancedPublishDiagnostics ? (
            <Button
              color="neutral"
              onClick={() => {
                if (
                  pages === undefined ||
                  instances.has(selected.location.instanceId!) === false
                ) {
                  return;
                }
                const location = findPageAndSelectorByInstanceId(
                  pages,
                  instances,
                  selected.location.instanceId!
                );
                $selectedPageId.set(location.pageId);
                selectInstance(location.instanceSelector);
                onClose();
              }}
            >
              Show element
            </Button>
          ) : (
            <Text color="subtle">
              Upgrade to Pro to locate the affected element.
            </Text>
          ))}
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="3" css={{ padding: theme.spacing[5] }}>
      <Flex gap="2">
        {(["all", "error", "warning"] as const).map((value) => (
          <Button
            key={value}
            color={filter === value ? "primary" : "neutral"}
            onClick={() => setFilter(value)}
          >
            {value === "all"
              ? "All"
              : value === "error"
              ? "Errors"
              : "Warnings"}
          </Button>
        ))}
      </Flex>
      {allowAdvancedPublishDiagnostics === false && findings.length > 0 && (
        <Text color="subtle">
          Upgrade to Pro for full details and element navigation.
        </Text>
      )}
      {visible.length === 0 ? (
        <Text color="subtle">No issues in this category.</Text>
      ) : (
        visible.map((finding, index) => (
          <Button
            key={`${finding.ruleId}-${index}`}
            color="neutral"
            onClick={() => setSelected(finding)}
            disabled={allowAdvancedPublishDiagnostics === false}
            css={{ justifyContent: "start", height: "auto" }}
          >
            <Flex direction="column" align="start" gap="1">
              <Text variant="labels">
                {finding.severity === "error" ? "Error" : "Warning"} ·{" "}
                {finding.ruleId}
              </Text>
              <Text css={{ textAlign: "left" }}>
                {finding.message.length <= 160
                  ? finding.message
                  : `${finding.message.slice(0, 157)}…`}
              </Text>
              {finding.location.pagePath !== undefined && (
                <Text color="subtle">{finding.location.pagePath}</Text>
              )}
            </Flex>
          </Button>
        ))
      )}
    </Flex>
  );
};

export const PublishStatusButton = ({
  label,
  activity,
  status,
  latestBuildId,
}: {
  label: string;
  activity: ReactNode;
  status: "success" | "warning" | "error" | "pending";
  latestBuildId?: string;
}) => {
  const [open, setOpen] = useState(false);
  const findings = getCurrentPrePublishAudit();
  const hasAuditErrors = findings.some(({ severity }) => severity === "error");
  const hasAuditWarnings = findings.some(
    ({ severity }) => severity === "warning"
  );
  const displayedStatus = hasAuditErrors
    ? "error"
    : status === "pending"
    ? status
    : hasAuditWarnings && status === "success"
    ? "warning"
    : status;
  const Icon = displayedStatus === "success" ? CheckCircleIcon : AlertIcon;
  const color =
    displayedStatus === "success"
      ? theme.colors.foregroundSuccessText
      : displayedStatus === "warning"
      ? theme.colors.borderAlert
      : displayedStatus === "pending"
      ? theme.colors.foregroundDisabled
      : theme.colors.foregroundDestructive;

  return (
    <>
      <Tooltip content={`Open publish details for ${label}`}>
        <IconButton
          type="button"
          aria-label={`Open publish details for ${label}`}
          onClick={() => setOpen(true)}
          css={{ color }}
        >
          <Icon />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent width={560} height={560}>
          <DialogTitle
            suffix={
              <DialogTitleActions>
                <DialogClose />
              </DialogTitleActions>
            }
          >
            Publish details · {label}
          </DialogTitle>
          <PanelTabs defaultValue="activity">
            <PanelTabsList>
              <PanelTabsTrigger value="activity">Activity</PanelTabsTrigger>
              <PanelTabsTrigger value="audit">Audit</PanelTabsTrigger>
            </PanelTabsList>
            <Separator />
            <ScrollArea css={{ height: 480 }}>
              <PanelTabsContent value="activity">
                <Activity
                  label={label}
                  fallback={activity}
                  latestBuildId={latestBuildId}
                  onClose={() => setOpen(false)}
                />
              </PanelTabsContent>
              <PanelTabsContent value="audit">
                <Findings findings={findings} onClose={() => setOpen(false)} />
              </PanelTabsContent>
            </ScrollArea>
          </PanelTabs>
        </DialogContent>
      </Dialog>
    </>
  );
};
