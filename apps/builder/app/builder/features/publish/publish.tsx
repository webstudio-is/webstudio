import stripIndent from "strip-indent";
import { computed } from "nanostores";
import {
  useCallback,
  useEffect,
  useState,
  useOptimistic,
  startTransition,
  useRef,
  useId,
  type ReactNode,
} from "react";
import { useStore } from "@nanostores/react";
import {
  PanelContent,
  Button,
  cssVar,
  Tooltip,
  InfoTooltip,
  IconButton,
  Grid,
  Flex,
  Label,
  Text,
  InputField,
  Separator,
  ScrollArea,
  rawTheme,
  Select,
  theme,
  TextArea,
  Link,
  LinkButton,
  PanelBanner,
  toast,
  RadioGroup,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
  PopoverClose,
  PopoverTitleActions,
  css,
  textVariants,
  SmallIconButton,
} from "@webstudio-is/design-system";
import { validateProjectDomain, type Project } from "@webstudio-is/project";
import {
  $registeredComponentMetas,
  $planFeatures,
  $selectedPageId,
  selectInstance,
  $authTokenPermissions,
  $editingPageId,
  $permissions,
  $stagingUsername,
  $stagingPassword,
} from "~/shared/nano-states";
import {
  $assetFolders,
  $assets,
  $publisherHost,
} from "~/shared/sync/data-stores";
import {
  $publishDialog,
  setActiveSidebarPanel,
} from "../../shared/nano-states";
import { $project } from "~/shared/sync/data-stores";
import { Domains, PENDING_TIMEOUT, getPublishStatusAndText } from "./domains";
import { CollapsibleDomainSection } from "./collapsible-domain-section";
import {
  ActivityIcon,
  AlertIcon,
  CheckCircleIcon,
  CopyIcon,
  GearIcon,
  UpgradeIcon,
  HelpIcon,
  InfoCircleIcon,
  EllipsesIcon,
  PlusIcon,
  SpinnerIcon,
  TerminalIcon,
} from "@webstudio-is/icons";
import { AddDomain } from "./add-domain";
import { humanizeString } from "~/shared/string-utils";
import { trpcClient, nativeClient } from "~/shared/trpc/trpc-client";
import {
  publishedDeploymentDestination,
  type Templates,
} from "@webstudio-is/sdk";
import { DomainCheckbox, domainToPublishName } from "./domain-checkbox";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import { $openProjectSettings } from "~/shared/nano-states/project-settings";
import {
  $dataSources,
  $instances,
  $pages,
  $projectSettings,
  $props,
  $resources,
} from "~/shared/sync/data-stores";
import { RelativeTime } from "~/builder/shared/relative-time";
import cmsUpgradeBanner from "~/shared/cms-upgrade-banner.svg?url";
import { $currentSystem } from "~/shared/system";
import { getPublishUrl } from "./publish-url";
import { getInstanceLink } from "~/shared/instance-utils/link";
import {
  getRestrictedFeatures,
  type RestrictedFeature,
} from "./restricted-features";
import {
  findPageAndSelectorByInstanceId,
  formatPrePublishAuditFinding,
  runPrePublishAudit,
} from "@webstudio-is/project-build/runtime";
import { getContentDatabasePublishFindings } from "./content-database-publish-warning";
import {
  PublishDiagnosticsDialog,
  PublishValidationBanner,
  type PublishValidationFinding,
} from "./diagnostics";
import {
  selectPublishLogs,
  usePublishLogs,
  type PublishLog,
} from "./use-publish-logs";
import { PublishActions, usePublishValidationState } from "./publish-actions";
import { flushExternalContentProject } from "~/shared/external-content-roots";
import { getPublishValidationErrorMessage } from "./publish-error";
import { runPublishAfterBestEffortChecks } from "./publish-preflight";
import { publishLogStatus } from "./constants";

const getPrePublishInstanceTarget = (
  instanceId: string,
  pageId?: string,
  instanceSelector?: string[]
) => {
  const pages = $pages.get();
  const instances = $instances.get();
  if (pages === undefined || instances.has(instanceId) === false) {
    return;
  }
  const target =
    pageId === undefined || instanceSelector === undefined
      ? findPageAndSelectorByInstanceId(pages, instances, instanceId)
      : { pageId, instanceSelector };
  const href = getInstanceLink(target.instanceSelector);
  if (href === undefined) {
    return;
  }
  return { ...target, href };
};

const PrePublishInstanceLink = ({
  instanceId,
  pageId,
  instanceSelector,
  children,
}: {
  instanceId: string;
  pageId?: string;
  instanceSelector?: string[];
  children: ReactNode;
}) => {
  const target = getPrePublishInstanceTarget(
    instanceId,
    pageId,
    instanceSelector
  );
  if (target === undefined) {
    return null;
  }
  return (
    <Link
      href={target.href}
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
        event.preventDefault();
        $selectedPageId.set(target.pageId);
        selectInstance(target.instanceSelector);
        $publishDialog.set("none");
      }}
    >
      {children}
    </Link>
  );
};

const getPrePublishAuditFindings = (): PublishValidationFinding[] => {
  const findings = runPrePublishAudit({
    pages: $pages.get(),
    instances: $instances.get(),
    props: $props.get(),
    dataSources: $dataSources.get(),
    resources: $resources.get(),
    assets: $assets.get(),
    metas: $registeredComponentMetas.get(),
  });
  return findings.flatMap((finding) => {
    if (finding.severity !== "error" && finding.severity !== "warning") {
      return [];
    }
    const context = Object.entries(finding.location)
      .filter(
        ([key, value]) => key !== "instanceSelector" && value !== undefined
      )
      .map(([key, value]) => `${key}: ${value}`);
    const reportText = [
      `${finding.severity.toUpperCase()}: ${formatPrePublishAuditFinding(
        finding
      )}`,
      `Rule: ${finding.ruleId}`,
      ...context,
    ].join("\n");
    return [
      {
        severity: finding.severity,
        title: formatPrePublishAuditFinding(finding),
        summary: formatPrePublishAuditFinding(finding).slice(0, 160),
        link:
          finding.location.instanceId === undefined ? undefined : (
            <PrePublishInstanceLink
              instanceId={finding.location.instanceId}
              pageId={finding.location.pageId}
              instanceSelector={finding.location.instanceSelector}
            >
              Show element
            </PrePublishInstanceLink>
          ),
        details: context.length === 0 ? undefined : context.join(" · "),
        reportText,
      },
    ];
  });
};

const runPublishDiagnostics = async (
  projectId: Project["id"],
  domains?: string[]
) => {
  const cssBuildWarningText =
    "Some project styles cannot be processed for publishing. Publishing can continue using base and font styles.";
  const auditFindings = getPrePublishAuditFindings();
  const validation =
    domains === undefined
      ? undefined
      : await nativeClient.api.publish.validate.query({
          projectId,
          target: "staging",
          domains,
        });
  const diagnostics =
    validation?.diagnostics ??
    (await nativeClient.build.contentDatabasePublishDiagnostics.query({
      projectId,
    }));
  const contentFindings = getContentDatabasePublishFindings(diagnostics).map(
    (finding) => ({
      ...finding,
      link:
        finding.relatedInstanceId === undefined ? undefined : (
          <PrePublishInstanceLink instanceId={finding.relatedInstanceId}>
            Open Content Block
          </PrePublishInstanceLink>
        ),
    })
  );
  const cssWarning =
    validation?.cssValid === false
      ? [
          {
            severity: "warning" as const,
            title: cssBuildWarningText,
            reportText: cssBuildWarningText,
          },
        ]
      : [];
  const findings = [...auditFindings, ...contentFindings, ...cssWarning];
  return {
    passed: findings.every(({ severity }) => severity !== "error"),
    findings,
  };
};

const runPublishValidation = async (
  projectId: Project["id"],
  domains: string[]
) => {
  await flushExternalContentProject({ projectId });
  return runPublishDiagnostics(projectId, domains);
};

const reportPublishValidationFailure = (
  error: unknown,
  setFindings: (findings: PublishValidationFinding[]) => void,
  publishingContinues = false
) => {
  const diagnosticMessage = getPublishValidationErrorMessage(error, {
    assets: $assets.get(),
    assetFolders: $assetFolders.get(),
  });
  const message = publishingContinues
    ? `${diagnosticMessage}\n\nThe publish request was sent without waiting for these diagnostics.`
    : diagnosticMessage;
  toast.error(message.slice(0, 200));
  const mcpUrl = "https://wstd.us/mcp";
  const mcpUrlIndex = message.indexOf(mcpUrl);
  const details =
    mcpUrlIndex === -1 ? (
      message
    ) : (
      <>
        {message.slice(0, mcpUrlIndex)}
        <Link href={mcpUrl} target="_blank" rel="noreferrer">
          Webstudio MCP
        </Link>
        {message.slice(mcpUrlIndex + mcpUrl.length)}
      </>
    );
  setFindings([
    {
      severity: "error",
      title: publishingContinues
        ? "Publish checks couldn’t complete"
        : "Unable to complete publish validation",
      summary: message.slice(0, 160),
      details,
      reportText: `ERROR: Unable to complete publish validation\n${message}`,
    },
  ]);
};

const getServerPublishFindings = (
  findings: readonly {
    severity: "error" | "warning" | "info";
    message: string;
  }[]
): PublishValidationFinding[] =>
  findings.flatMap((finding) =>
    finding.severity === "info"
      ? []
      : [
          {
            severity: finding.severity,
            title: finding.message,
            summary: finding.message,
            reportText: `${finding.severity.toUpperCase()}: ${finding.message}`,
          },
        ]
  );

type ChangeProjectDomainProps = {
  project: Project;
  projectState: "idle" | "submitting";
  refresh: () => Promise<void>;
  validatedDomains?: readonly string[];
  onOpenReport: (domain: string) => void;
  latestLog?: PublishLog;
};

const ChangeProjectDomain = ({
  project,
  refresh,
  validatedDomains,
  onOpenReport,
  latestLog,
}: ChangeProjectDomainProps) => {
  const id = useId();
  const currentSystem = useStore($currentSystem);
  const stagingUsername = useStore($stagingUsername);
  const stagingPassword = useStore($stagingPassword);
  const publisherHost = useStore($publisherHost);

  const [domain, setDomain] = useState(project.domain);
  const [error, setError] = useState<string>();
  const [isUpdateInProgress, setIsUpdateInProgress] = useOptimistic(false);
  const [isUnpublishing, setIsUnpublishing] = useOptimistic(false);

  const pageUrl = getPublishUrl({
    domain: `${project.domain}.${publisherHost}`,
    pathname: currentSystem.pathname,
    username: stagingUsername,
    password: stagingPassword,
  });

  const updateProjectDomain = async () => {
    setIsUpdateInProgress(true);
    const validationResult = validateProjectDomain(domain);

    if (validationResult.success === false) {
      setError(validationResult.error);
      return;
    }

    const updateResult = await nativeClient.domain.updateProjectDomain.mutate({
      domain,
      projectId: project.id,
    });

    if (updateResult.success === false) {
      setError(updateResult.error);
      return;
    }

    await refresh();
  };

  const handleUpdateProjectDomain = () => {
    startTransition(async () => {
      await updateProjectDomain();
    });
  };

  const handleUnpublish = async () => {
    setIsUnpublishing(true);
    const result = await nativeClient.domain.unpublish.mutate({
      projectId: project.id,
      domain: `${project.domain}.${publisherHost}`,
    });
    if (result.success === false) {
      toast.error(result.message);
      return;
    }
    await refresh();
    toast.success(result.message);
  };

  const latestProjectDomainBuild =
    project.latestBuildVirtual?.domain === project.domain
      ? project.latestBuildVirtual
      : undefined;

  const { statusText, color, Icon } =
    latestProjectDomainBuild != null
      ? getPublishStatusAndText(latestProjectDomainBuild)
      : {
          statusText: "Not published",
          color: cssVar("--foreground-secondary"),
          Icon: InfoCircleIcon,
        };
  const currentLog =
    latestLog?.buildId === latestProjectDomainBuild?.buildId
      ? latestLog
      : undefined;
  const {
    Icon: LogIcon,
    color: logColor,
    text: logStatusText,
  } = currentLog === undefined
    ? { Icon, color, text: statusText }
    : publishLogStatus[currentLog.status];

  const isPublished = latestProjectDomainBuild != null;

  return (
    <CollapsibleDomainSection
      title={pageUrl.host}
      prefix={
        <DomainCheckbox
          defaultChecked={latestProjectDomainBuild?.domain === domain}
          validatedDomains={validatedDomains}
          buildId={latestProjectDomainBuild?.buildId}
          domain={domain}
        />
      }
      suffix={
        <Grid flow="column" align="center">
          <Tooltip
            content={error !== undefined ? error : <Text>{logStatusText}</Text>}
          >
            <IconButton
              type="button"
              aria-label={`Publish log: ${pageUrl.host}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onOpenReport(project.domain);
              }}
              css={{
                color:
                  error !== undefined
                    ? cssVar("--foreground-negative")
                    : logColor,
              }}
            >
              {error !== undefined ? <AlertIcon /> : <LogIcon />}
            </IconButton>
          </Tooltip>

          <CopyToClipboard
            text={pageUrl.toString()}
            copyText={`Copy link: ${pageUrl.toString()}`}
          >
            <IconButton type="button" tabIndex={-1}>
              <CopyIcon />
            </IconButton>
          </CopyToClipboard>
        </Grid>
      }
    >
      <Grid gap={2}>
        <Grid flow="column" align="center" gap={2}>
          <Flex align="center" gap={1} css={{ width: theme.spacing[20] }}>
            <Label htmlFor={id}>Domain:</Label>
            <InfoTooltip
              label="About domain name"
              content="Domain can't be renamed once published. Unpublish to enable renaming."
            />
          </Flex>
          <InputField
            text="mono"
            id={id}
            placeholder="Domain"
            value={domain}
            disabled={isUpdateInProgress || isPublished}
            onChange={(event) => {
              setError(undefined);
              setDomain(event.target.value);
            }}
            onBlur={handleUpdateProjectDomain}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleUpdateProjectDomain();
              }

              if (event.key === "Escape") {
                if (project.domain !== domain) {
                  setDomain(project.domain);
                  event.preventDefault();
                }
              }
            }}
            color={error !== undefined ? "error" : undefined}
          />
          {error !== undefined && <Text color="destructive">{error}</Text>}
        </Grid>
        {stagingUsername && (
          <Grid flow="column" align="center" gap={2}>
            <Label
              htmlFor={`${id}-username`}
              css={{ width: theme.spacing[20] }}
            >
              Username:
            </Label>
            <InputField
              text="mono"
              id={`${id}-username`}
              type="text"
              value={stagingUsername}
              readOnly
            />
          </Grid>
        )}
        {stagingPassword && (
          <Grid flow="column" align="center" gap={2}>
            <Flex align="center" gap={1} css={{ width: theme.spacing[20] }}>
              <Label htmlFor={`${id}-password`}>Password:</Label>
              <InfoTooltip
                label="About staging password"
                content="This password is read-only and cannot be changed. It is the same for every user. This prevents phishing attacks."
              />
            </Flex>
            <InputField
              text="mono"
              id={`${id}-password`}
              type="text"
              value={stagingPassword}
              readOnly
            />
          </Grid>
        )}
        {isPublished && (
          <Tooltip content="Unpublish to enable domain renaming">
            <Button
              formAction={handleUnpublish}
              color="destructive"
              state={isUnpublishing ? "pending" : undefined}
              css={{ width: "100%" }}
            >
              Unpublish
            </Button>
          </Tooltip>
        )}
      </Grid>
    </CollapsibleDomainSection>
  );
};

const $restrictedFeatures = computed(
  [
    $pages,
    $projectSettings,
    $dataSources,
    $resources,
    $instances,
    $permissions,
  ],
  (pages, projectSettings, dataSources, resources, instances, permissions) =>
    getRestrictedFeatures({
      pages,
      projectSettings,
      dataSources,
      resources,
      instances,
      permissions,
    })
);

const COUNTDOWN_DURATION = 60_000;
const STATUS_REFRESH_RETRY_DELAY = 5_000;
const STATUS_REFRESH_MAX_ATTEMPTS = 3;
type PublishExecution = {
  projectId: string;
  buildId: string;
  logHandle?: string;
  target?: "site" | "static";
};

const usePublishProgress = (projectId: Project["id"]) => {
  const projectScope = useRef({ projectId, token: 0 });
  if (projectScope.current.projectId !== projectId) {
    projectScope.current = { projectId, token: projectScope.current.token + 1 };
  }
  const scopeToken = projectScope.current.token;
  const manualValidationFindings = useManualValidationFindings();
  const invalidateManualFindings = manualValidationFindings.invalidate;
  const [startedAt, setStartedAt] = useState<number>();
  const [showCountdown, setShowCountdown] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishFindings, setPublishFindings] = useState<
    PublishValidationFinding[]
  >([]);
  const [publishDiagnosticsDomains, setPublishDiagnosticsDomains] = useState<
    string[]
  >([]);
  const publishDiagnosticsSession = useRef(0);
  const [publishErrorState, setPublishErrorState] = useState<{
    value: JSX.Element | string;
    source: "request" | "transport" | "status";
    domains?: string[];
  }>();
  const [now, setNow] = useState(Date.now);
  const isMounted = useRef(false);
  const requestBaselineBuildId = useRef<string>();
  const hasStartedPublishRequest = useRef(false);
  const refreshGeneration = useRef(0);
  const recoveredPoll = useRef<{
    generation: number;
    promise: Promise<void>;
  }>();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    publishDiagnosticsSession.current += 1;
    setPublishFindings([]);
    setPublishDiagnosticsDomains([]);
    setPublishErrorState(undefined);
    setIsPublishing(false);
    invalidateManualFindings();
  }, [projectId, invalidateManualFindings]);

  const isCurrentProject = useCallback(
    () =>
      isMounted.current &&
      $project.get()?.id === projectId &&
      projectScope.current.token === scopeToken,
    [projectId, scopeToken]
  );

  const beginPopoverRefresh = useCallback(() => {
    refreshGeneration.current += 1;
    return refreshGeneration.current;
  }, []);

  const isRefreshCurrent = useCallback(
    (generation: number) =>
      isCurrentProject() && refreshGeneration.current === generation,
    [isCurrentProject]
  );

  const setPublishError = (
    value: JSX.Element | string | undefined,
    domains?: string[]
  ) => {
    setPublishErrorState(
      value === undefined ? undefined : { value, source: "request", domains }
    );
  };

  const setPublishStatusError = useCallback((value: JSX.Element | string) => {
    setPublishErrorState({ value, source: "status" });
  }, []);

  const clearErrors = useCallback(() => {
    setPublishErrorState(undefined);
  }, []);

  const beginPublishDiagnostics = useCallback((domains: string[] = []) => {
    const session = ++publishDiagnosticsSession.current;
    setPublishFindings([]);
    setPublishDiagnosticsDomains(domains);
    return {
      isCurrent: () => publishDiagnosticsSession.current === session,
      setFindings: (findings: PublishValidationFinding[]) => {
        if (publishDiagnosticsSession.current === session) {
          setPublishFindings(findings);
        }
      },
    };
  }, []);

  const reconcileRefreshedProject = useCallback((project: Project) => {
    const build = project.latestBuildVirtual;
    if (build == null) {
      setPublishErrorState((current) =>
        current?.source === "status" ? undefined : current
      );
      return;
    }
    const { status, statusText } = getPublishStatusAndText(build);
    const isNewBuild =
      build.buildId !== undefined &&
      build.buildId !== requestBaselineBuildId.current;
    if (status === "FAILED") {
      if (hasStartedPublishRequest.current && isNewBuild) {
        setPublishErrorState({ value: statusText, source: "status" });
      }
    } else {
      setPublishErrorState((current) =>
        current?.source === "status" ||
        (isNewBuild && current?.source === "transport")
          ? undefined
          : current
      );
    }
  }, []);

  const watchPendingPublish = useCallback(
    (
      refresh: () => Promise<Project | undefined>,
      generation = refreshGeneration.current,
      execution?: PublishExecution,
      onResult?: (
        result: Awaited<ReturnType<typeof waitForPublishStatus>>
      ) => void
    ) => {
      if (recoveredPoll.current?.generation === generation) {
        return recoveredPoll.current.promise;
      }
      const polling = waitForPublishStatus(
        refresh,
        () => isRefreshCurrent(generation),
        undefined,
        execution
      )
        .then((result) => {
          if (isRefreshCurrent(generation) === false) {
            return;
          }
          if (execution?.target !== "static") {
            reportPublishResult({
              result,
              setPublishError: setPublishStatusError,
              isCurrentProject,
            });
          } else if (result?.status === "FAILED") {
            toast.error(result.statusText);
          }
          onResult?.(result);
        })
        .finally(() => {
          if (recoveredPoll.current?.promise === polling) {
            recoveredPoll.current = undefined;
          }
        });
      recoveredPoll.current = { generation, promise: polling };
      return polling;
    },
    [isCurrentProject, isRefreshCurrent, setPublishStatusError]
  );

  useEffect(() => {
    if (isPublishing === false || showCountdown === false) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isPublishing, showCountdown]);

  const countdown =
    isPublishing && showCountdown && startedAt !== undefined
      ? Math.max(0, Math.ceil((COUNTDOWN_DURATION - (now - startedAt)) / 1000))
      : undefined;

  const dismissCountdown = useCallback(() => setShowCountdown(false), []);

  const start = (publish: () => Promise<void>) => {
    const startedAt = Date.now();
    hasStartedPublishRequest.current = true;
    requestBaselineBuildId.current =
      $project.get()?.latestBuildVirtual?.buildId;
    setStartedAt(startedAt);
    setNow(startedAt);
    setShowCountdown(true);
    setIsPublishing(true);
    setPublishErrorState(undefined);
    publish()
      .catch((error) => {
        console.error(error);
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (isCurrentProject()) {
          setPublishErrorState({ value: message, source: "transport" });
        }
        if (isCurrentProject()) {
          toast.error(message);
        }
      })
      .finally(() => {
        if (isCurrentProject()) {
          setIsPublishing(false);
        }
      });
  };

  return {
    manualValidationFindings,
    isPublishing,
    publishFindings,
    publishDiagnosticsDomains,
    setPublishFindings,
    beginPublishDiagnostics,
    publishError: publishErrorState?.value,
    publishErrorSource: publishErrorState?.source,
    publishErrorDomains: publishErrorState?.domains,
    setPublishError,
    setPublishStatusError,
    clearErrors,
    isCurrentProject,
    beginPopoverRefresh,
    isRefreshCurrent,
    reconcileRefreshedProject,
    watchPendingPublish,
    countdown,
    start,
    dismissCountdown,
  };
};

const waitForPublishStatus = async (
  refresh: () => Promise<Project | undefined>,
  isCurrentProject: () => boolean,
  previousBuildId?: string,
  execution?: PublishExecution,
  getJob: (input: {
    projectId: string;
    jobId: string;
    logHandle: string;
  }) => Promise<{ status: string; code?: string }> = nativeClient.api.publish
    .getJob.query
) => {
  let sleepTime = 15000;
  const timeToFinish = Date.now() + PENDING_TIMEOUT + 2 * sleepTime;

  while (Date.now() < timeToFinish && isCurrentProject()) {
    try {
      let runnerPending = false;
      if (execution?.logHandle !== undefined) {
        try {
          const job = await getJob({
            projectId: execution.projectId,
            jobId: execution.buildId,
            logHandle: execution.logHandle,
          });
          if (isCurrentProject() === false) {
            return;
          }
          if (job.status === "failed") {
            return {
              status: "FAILED" as const,
              statusText: "Publish failed",
              code: job.code,
            };
          }
          runnerPending = job.status === "pending";
        } catch (error) {
          console.error("Could not refresh publish status", error);
        }
      }
      const refreshedProject = await refresh();
      if (isCurrentProject() === false) {
        return;
      }
      const buildId =
        execution?.target === "static"
          ? refreshedProject?.latestStaticBuild?.buildId
          : refreshedProject?.latestBuildVirtual?.buildId;
      if (
        refreshedProject !== undefined &&
        (previousBuildId === undefined || buildId !== previousBuildId) &&
        (execution === undefined || buildId === execution.buildId)
      ) {
        const { statusText, status } =
          execution?.target === "static" &&
          refreshedProject.latestStaticBuild != null
            ? getStaticPublishStatusAndText(refreshedProject.latestStaticBuild)
            : refreshedProject.latestBuildVirtual != null
              ? getPublishStatusAndText(refreshedProject.latestBuildVirtual)
              : {
                  statusText: "Not published",
                  status: "PENDING" as const,
                };

        if (!runnerPending && (status === "PUBLISHED" || status === "FAILED")) {
          return { status, statusText };
        }
      }
    } catch (error) {
      if (isCurrentProject() === false) {
        return;
      }
      // A failed status request should not stop watching an ongoing publish.
      console.error("Could not refresh publish status", error);
    }

    await new Promise((resolve) => setTimeout(resolve, sleepTime));
    sleepTime = Math.max(5000, sleepTime - 5000);
  }
};

const refreshUntilSuccess = async (
  refresh: (showError: boolean) => Promise<Project | undefined>,
  isOpen: () => boolean,
  onPending: (project: Project) => void = () => {},
  hasSessionPending: (project: Project) => boolean = () => false
) => {
  for (
    let attempt = 1;
    attempt <= STATUS_REFRESH_MAX_ATTEMPTS && isOpen();
    attempt++
  ) {
    const isLastAttempt = attempt === STATUS_REFRESH_MAX_ATTEMPTS;
    try {
      const refreshedProject = await refresh(isLastAttempt);
      if (refreshedProject !== undefined) {
        if (
          (refreshedProject.latestBuildVirtual != null &&
            getPublishStatusAndText(refreshedProject.latestBuildVirtual)
              .status === "PENDING") ||
          hasSessionPending(refreshedProject)
        ) {
          onPending(refreshedProject);
        }
        return;
      }
    } catch (error) {
      console.error("Could not refresh publish status", error);
      if (isLastAttempt && isOpen()) {
        toast.error(error instanceof Error ? error.message : "Unknown error");
      }
    }

    if (isLastAttempt === false && isOpen()) {
      await new Promise((resolve) =>
        setTimeout(resolve, STATUS_REFRESH_RETRY_DELAY)
      );
    }
  }
};

const reportPublishResult = ({
  result,
  timesLeft,
  maxDailyPublishesPerUser,
  setPublishError,
  isCurrentProject = () => true,
}: {
  result: Awaited<ReturnType<typeof waitForPublishStatus>>;
  timesLeft?: number;
  maxDailyPublishesPerUser?: number;
  setPublishError: (error: string | JSX.Element) => void;
  isCurrentProject?: () => boolean;
}) => {
  if (result?.status === "PUBLISHED") {
    if ($publishDialog.get() === "none") {
      toast.success(
        <>
          The project has been successfully published.{" "}
          {timesLeft !== undefined &&
            maxDailyPublishesPerUser !== undefined &&
            timesLeft > 0 &&
            timesLeft <= 10 && (
              <div>
                You have {timesLeft} out of {maxDailyPublishesPerUser} daily
                publications remaining. The counter resets tomorrow.
              </div>
            )}
        </>,
        { duration: 10000 }
      );
    }
    return;
  }

  if (result?.status === "FAILED") {
    if (isCurrentProject()) {
      toast.error(result.statusText);
    }
    if (isCurrentProject()) {
      setPublishError(result.statusText);
    }
  }
};

const useManualValidationFindings = () => {
  const [findings, setFindings] = useState<PublishValidationFinding[]>([]);
  const [domains, setDomains] = useState<string[]>();
  const session = useRef(0);
  const requestedDomains = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      session.current += 1;
    };
  }, []);

  const begin = useCallback((domains: string[] = []) => {
    session.current += 1;
    requestedDomains.current = domains;
    setFindings([]);
    setDomains(undefined);
    return session.current;
  }, []);

  const invalidate = useCallback(() => {
    session.current += 1;
    setFindings([]);
    setDomains(undefined);
  }, []);

  const isCurrent = useCallback((id: number) => session.current === id, []);

  const update = useCallback((id: number, next: PublishValidationFinding[]) => {
    if (session.current === id) {
      setFindings(next);
      setDomains(next.length > 0 ? requestedDomains.current : undefined);
    }
  }, []);

  return { findings, domains, begin, invalidate, isCurrent, update };
};

const matchesValidatedDomains = (form: HTMLFormElement, domains: string[]) => {
  const selected = new Set(domains);
  const current = new FormData(form)
    .getAll(domainToPublishName)
    .map((domain) => domain.toString());
  return (
    current.length === selected.size &&
    current.every((domain) => selected.has(domain))
  );
};

const Publish = ({
  project,
  timesLeft,
  disabled,
  refresh,
  restrictedFeatures,
  validation,
  progress,
  publishLogs,
  onOpenReport,
}: {
  project: Project;
  timesLeft: number;
  disabled: boolean;
  refresh: () => Promise<void>;
  restrictedFeatures: Map<string, RestrictedFeature>;
  validation: ReturnType<typeof usePublishValidationState>;
  progress: ReturnType<typeof usePublishProgress>;
  publishLogs: ReturnType<typeof usePublishLogs>;
  onOpenReport: (
    domain: string | undefined,
    tab: "warnings" | "errors" | "publish"
  ) => void;
}) => {
  const validationFindings = progress.manualValidationFindings;
  const { countdown, isCurrentProject } = progress;
  const { validationState, update: onValidationStateChange } = validation;
  const { userPublishCount, maxDailyPublishesPerUser } = useUserPublishCount();
  const { invalidate: invalidateValidationFindings } = validationFindings;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [hasSelectedDomains, setHasSelectedDomains] = useState(false);
  const [hasCustomDomainsSelected, setHasCustomDomainsSelected] =
    useState(false);
  const previousDomainsKey = useRef<string>();
  const hasPendingState = project.latestBuildVirtual
    ? getPublishStatusAndText(project.latestBuildVirtual).status === "PENDING"
    : false;
  const isPublishInProgress = progress.isPublishing || hasPendingState;

  useEffect(() => {
    const form = buttonRef.current?.closest("form");

    if (form == null) {
      return;
    }

    const handleFormInput = () => {
      const formData = new FormData(form);
      const domainsSelected = formData
        .getAll(domainToPublishName)
        .map((domain) => domain.toString());
      const domainsKey = domainsSelected.join("\u0000");

      if (
        previousDomainsKey.current !== undefined &&
        previousDomainsKey.current !== domainsKey
      ) {
        invalidateValidationFindings();
        onValidationStateChange("idle");
      }
      previousDomainsKey.current = domainsKey;

      setHasSelectedDomains(domainsSelected.length > 0);

      // Check if any custom domains are selected
      // Custom domains are those that are NOT the staging domain (project.domain)
      const hasCustom = domainsSelected.some(
        (domain) => domain !== project.domain
      );
      setHasCustomDomainsSelected(hasCustom);
    };

    const observer = new MutationObserver(() => {
      handleFormInput();
    });

    observer.observe(form, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["value", "checked"],
    });

    if (validationFindings.domains !== undefined) {
      if (matchesValidatedDomains(form, validationFindings.domains)) {
        previousDomainsKey.current = validationFindings.domains.join("\u0000");
      } else {
        invalidateValidationFindings();
      }
    }

    handleFormInput();

    return () => {
      observer.disconnect();
    };
  }, [
    invalidateValidationFindings,
    onValidationStateChange,
    project.domain,
    validationFindings.domains,
  ]);

  const publish = async (domains: string[]) => {
    const previousBuildId = $project.get()?.latestBuildVirtual?.buildId;
    const publishResult = await nativeClient.domain.publish.mutate({
      projectId: project.id,
      domains,
      destination: publishedDeploymentDestination,
    });
    if (isCurrentProject() === false) {
      return;
    }

    if (publishResult.success === false) {
      if ("auditFindings" in publishResult) {
        progress.setPublishFindings(
          getServerPublishFindings(publishResult.auditFindings)
        );
        return;
      }
      console.error(publishResult.error);

      let error: JSX.Element | string = publishResult.error;
      if (publishResult.error === "NOT_IMPLEMENTED") {
        error = (
          <>
            <Tooltip
              content={
                <Text userSelect="text">
                  {project.latestBuildVirtual?.buildId}
                </Text>
              }
            >
              <span>Build data</span>
            </Tooltip>{" "}
            for publishing has been successfully created. Use{" "}
            <Link href="https://docs.webstudio.is/university/self-hosting/cli">
              Webstudio&nbsp;CLI
            </Link>{" "}
            to generate the code.
          </>
        );
      }
      progress.setPublishError(error, domains);
      if (publishResult.error === "NOT_IMPLEMENTED") {
        toast.info(error);
      } else {
        toast.error(typeof error === "string" ? error.slice(0, 200) : error);
      }

      if (process.env.NODE_ENV === "development") {
        // Refresh locally as it's always an error
        await refresh();
      }

      return;
    }

    const accepted = publishLogs.record({
      buildId: publishResult.buildId,
      logHandle: publishResult.logHandle,
      target: "site",
      domains,
      findings: getServerPublishFindings(publishResult.findings),
    });

    const result = await waitForPublishStatus(
      () =>
        getRefreshedProject({
          projectId: project.id,
          isCurrent: isCurrentProject,
        }),
      isCurrentProject,
      previousBuildId,
      {
        projectId: project.id,
        buildId: publishResult.buildId,
        logHandle: publishResult.logHandle,
      }
    );
    if (result?.status === "PUBLISHED" || result?.status === "FAILED") {
      publishLogs.complete(
        publishResult.buildId,
        result.status === "PUBLISHED" ? "success" : "failed",
        result.code
      );
      if (accepted !== undefined) {
        publishLogs.loadLog({
          ...accepted,
          status: result.status === "PUBLISHED" ? "success" : "failed",
        });
      }
    }
    reportPublishResult({
      result,
      timesLeft,
      maxDailyPublishesPerUser,
      setPublishError: progress.setPublishStatusError,
      isCurrentProject,
    });
  };

  const getDomainsFromForm = (formData: FormData) =>
    formData
      .getAll(domainToPublishName)
      .map((domainEntry) => domainEntry.toString());

  const handleValidate = async (formData: FormData) => {
    const domains = getDomainsFromForm(formData);
    const session = validationFindings.begin(domains);
    progress.clearErrors();
    progress.beginPublishDiagnostics(domains);
    if (domains.length === 0) {
      toast.error("Please select at least one domain to publish");
      return;
    }

    try {
      const checks = await runPublishValidation(project.id, domains);
      if (validationFindings.isCurrent(session) === false) {
        return;
      }
      validationFindings.update(session, checks.findings);
      if (checks.passed === false) {
        onValidationStateChange("idle");
        return;
      }
      onValidationStateChange("passed");
    } catch (error) {
      if (validationFindings.isCurrent(session) === false) {
        return;
      }
      onValidationStateChange("idle");
      reportPublishValidationFailure(error, (findings) =>
        validationFindings.update(session, findings)
      );
    }
  };

  const handlePublish = (formData: FormData) => {
    validationFindings.invalidate();
    onValidationStateChange("idle");
    progress.clearErrors();
    const domains = getDomainsFromForm(formData);
    const diagnostics = progress.beginPublishDiagnostics(domains);
    // Custom domain checkboxes are disabled on free plan so they are never
    // submitted — only the staging (wstd.io) domain can appear in formData.
    if (domains.length === 0) {
      toast.error("Please select at least one domain to publish");
      return;
    }

    progress.start(() =>
      runPublishAfterBestEffortChecks({
        checks: async () => {
          const checks = await runPublishDiagnostics(project.id, domains);
          diagnostics.setFindings(checks.findings);
        },
        onCheckFailure: (error) => {
          if (diagnostics.isCurrent()) {
            reportPublishValidationFailure(
              error,
              diagnostics.setFindings,
              true
            );
          }
        },
        publish: () => publish(domains),
      })
    );
  };

  const getForm = () => buttonRef.current?.closest("form");
  const findings = [
    ...validationFindings.findings,
    ...progress.publishFindings,
  ];
  const hasSessionPublish = publishLogs.items.some(
    ({ target }) => target === "site"
  );

  return (
    <Flex gap={2} shrink={false} direction={"column"}>
      {progress.publishError !== undefined ? (
        <PanelBanner variant="error">
          <Flex align="center" justify="between" gap={2}>
            <Text css={{ flex: 1, minWidth: 0 }}>
              {typeof progress.publishError === "string"
                ? progress.publishError.slice(0, 160)
                : progress.publishError}
            </Text>
            <Button
              type="button"
              color="ghost"
              css={{ flexShrink: 0 }}
              onClick={() =>
                onOpenReport(
                  undefined,
                  progress.publishErrorSource === "status" && hasSessionPublish
                    ? "publish"
                    : "errors"
                )
              }
            >
              See issues
            </Button>
          </Flex>
        </PanelBanner>
      ) : (
        <PublishValidationBanner
          findings={findings}
          passed={validationState === "passed"}
          onOpen={() =>
            onOpenReport(
              undefined,
              findings.some(({ severity }) => severity === "error")
                ? "errors"
                : "warnings"
            )
          }
        />
      )}
      <PublishActions
        publishButtonRef={buttonRef}
        validationState={validationState}
        validateDisabled={disabled || isPublishInProgress}
        publishDisabled={
          hasSelectedDomains === false ||
          disabled ||
          (restrictedFeatures.size > 0 && hasCustomDomainsSelected) ||
          userPublishCount >= maxDailyPublishesPerUser
        }
        publishInProgress={isPublishInProgress}
        publishPending={
          isPublishInProgress && (countdown === undefined || countdown === 0)
        }
        hasSelectedDomains={hasSelectedDomains}
        publishLabel={
          countdown !== undefined && countdown > 0
            ? `Publishing (${countdown}s)`
            : "Publish"
        }
        onValidate={async () => {
          const form = getForm();
          if (form) {
            await handleValidate(new FormData(form));
          }
        }}
        onPublish={() => {
          const form = getForm();
          if (form) {
            handlePublish(new FormData(form));
          }
        }}
      />
    </Flex>
  );
};

const getStaticPublishStatusAndText = ({
  updatedAt,
  publishStatus,
}: {
  updatedAt: string;
  publishStatus: "PENDING" | "FAILED" | "PUBLISHED";
}) => {
  let status = publishStatus;

  const delta = Date.now() - new Date(updatedAt).getTime();
  // Assume build failed after 3 minutes

  if (publishStatus === "PENDING" && delta > PENDING_TIMEOUT) {
    status = "FAILED";
  }

  const textStart =
    status === "PUBLISHED"
      ? "Downloaded"
      : status === "FAILED"
        ? "Download failed"
        : "Download started";

  const statusText = (
    <>
      {textStart} <RelativeTime time={new Date(updatedAt)} />
    </>
  );

  return { statusText, status };
};

const PublishStatic = ({
  projectId,
  templates,
  publishLogs,
  progress,
  onOpenReport,
  onFindings,
  onDownload = (name: string) => {
    window.location.href = `/cgi/static/ssg/${name}`;
  },
}: {
  projectId: Project["id"];
  templates: readonly Templates[];
  publishLogs: ReturnType<typeof usePublishLogs>;
  progress: ReturnType<typeof usePublishProgress>;
  onOpenReport: (tab?: "warnings" | "errors" | "publish") => void;
  onFindings: (findings: PublishValidationFinding[]) => void;
  onDownload?: (name: string) => void;
}) => {
  const project = useStore($project);

  if (project == null) {
    throw new Error("Project not found");
  }

  const { status, statusText } =
    project.latestStaticBuild == null
      ? { status: "LOADED" as const, statusText: "Not published" }
      : getStaticPublishStatusAndText(project.latestStaticBuild);
  const latestLog = publishLogs.items.find(
    (item) =>
      item.target === "static" &&
      item.buildId === project.latestStaticBuild?.buildId
  );
  const logStatus =
    latestLog?.status === "pending"
      ? "PENDING"
      : latestLog?.status === "failed"
        ? "FAILED"
        : latestLog?.status === "success"
          ? "PUBLISHED"
          : status;

  const isPublishInProgress = status === "PENDING" || progress.isPublishing;

  return (
    <Flex gap={2} shrink={false} direction={"column"}>
      <Flex gap={2} align="center">
        <Tooltip
          content={
            latestLog?.status === "failed" ? "Publish failed" : statusText
          }
        >
          <IconButton
            type="button"
            aria-label="Publish log: Static export"
            onClick={() => onOpenReport()}
          >
            {logStatus === "FAILED" ? (
              <AlertIcon />
            ) : logStatus === "PUBLISHED" ? (
              <CheckCircleIcon />
            ) : logStatus === "PENDING" ? (
              <SpinnerIcon />
            ) : (
              <InfoCircleIcon />
            )}
          </IconButton>
        </Tooltip>
      </Flex>

      <Tooltip
        content={isPublishInProgress ? "Preparing static site" : undefined}
      >
        <Button
          type="button"
          color="primary"
          state={isPublishInProgress ? "pending" : undefined}
          onClick={() => {
            const isCurrent = publishLogs.isCurrent;
            if (isCurrent() === false) {
              return;
            }
            onFindings([]);

            progress.start(async () => {
              try {
                const result = await runPublishAfterBestEffortChecks({
                  checks: async () => {
                    const checks = await runPublishDiagnostics(projectId);
                    if (isCurrent()) {
                      onFindings(checks.findings);
                    }
                  },
                  onCheckFailure: (error) => {
                    if (isCurrent()) {
                      reportPublishValidationFailure(error, onFindings, true);
                    }
                  },
                  publish: () =>
                    nativeClient.domain.publish.mutate({
                      projectId,
                      destination: "static",
                      templates: [...templates],
                    }),
                });
                if (isCurrent() === false) {
                  return;
                }

                if (result.success === false) {
                  if ("auditFindings" in result) {
                    onFindings(getServerPublishFindings(result.auditFindings));
                    onOpenReport("errors");
                  } else {
                    toast.error(result.error.slice(0, 200));
                  }
                  return;
                }

                const accepted = publishLogs.record({
                  buildId: result.buildId,
                  logHandle: result.logHandle,
                  target: "static",
                  staticName: "name" in result ? result.name : undefined,
                  domains: [],
                  findings: getServerPublishFindings(result.findings),
                });
                if (accepted === undefined) {
                  return;
                }
                const name = "name" in result ? result.name : undefined;
                if (name == null) {
                  toast.error('File name must be defined in "result"');
                }

                const outcome = await waitForPublishStatus(
                  () => getRefreshedProject({ projectId, isCurrent }),
                  isCurrent,
                  undefined,
                  {
                    projectId,
                    buildId: result.buildId,
                    logHandle: result.logHandle,
                    target: "static",
                  }
                );
                if (isCurrent() === false) {
                  return;
                }
                if (outcome?.status === "FAILED") {
                  publishLogs.complete(result.buildId, "failed", outcome.code);
                  publishLogs.loadLog({ ...accepted, status: "failed" });
                  toast.error(outcome.statusText);
                }
                if (outcome?.status === "PUBLISHED") {
                  publishLogs.complete(result.buildId, "success");
                  publishLogs.loadLog({ ...accepted, status: "success" });
                  if (name != null) {
                    onDownload(name);
                  }
                }
              } catch (error) {
                if (isCurrent()) {
                  toast.error(
                    error instanceof Error
                      ? error.message.slice(0, 200)
                      : "Unknown error"
                  );
                }
              }
            });
          }}
        >
          Build and download static site
        </Button>
      </Tooltip>
    </Flex>
  );
};

const useCanAddDomain = () => {
  const { load, data } = trpcClient.domain.countTotalDomains.useQuery();
  const { maxDomainsAllowedPerUser } = useStore($permissions);
  const project = useStore($project);
  const activeDomainsCount = project?.domainsVirtual.filter(
    (domain) => domain.status === "ACTIVE" && domain.verified
  ).length;
  useEffect(() => {
    if (project?.id !== undefined) {
      load({ projectId: project.id });
    }
  }, [load, activeDomainsCount, project?.id]);
  const canAddDomain = data
    ? data.success && data.data < maxDomainsAllowedPerUser
    : true;
  return { canAddDomain, maxDomainsAllowedPerUser };
};

const useUserPublishCount = () => {
  const { load, data } = trpcClient.project.userPublishCount.useQuery();
  const { maxDailyPublishesPerUser } = useStore($permissions);
  const project = useStore($project);
  useEffect(() => {
    if (project?.id !== undefined) {
      load({ projectId: project.id });
    }
  }, [load, project?.id]);
  return {
    userPublishCount: data?.success ? data.data : 0,
    maxDailyPublishesPerUser:
      data?.success && "limit" in data ? data.limit : maxDailyPublishesPerUser,
  };
};

const getRefreshedProject = async ({
  projectId,
  showError = true,
  query = () => nativeClient.domain.project.query({ projectId }),
  isCurrent = () => true,
}: {
  projectId: Project["id"];
  showError?: boolean;
  query?: () => ReturnType<typeof nativeClient.domain.project.query>;
  isCurrent?: () => boolean;
}) => {
  if ($project.get()?.id !== projectId || !isCurrent()) {
    return;
  }

  const result = await query();
  if ($project.get()?.id !== projectId || !isCurrent()) {
    return;
  }

  if (result.success) {
    $project.set(result.project);
    return result.project;
  }

  if (showError) {
    toast.error(result.error);
  }
};

const refreshProject = async () => {
  await getRefreshedProject({ projectId: $project.get()!.id });
};

const buttonLinkClass = css({
  all: "unset",
  cursor: "pointer",
  ...textVariants.link,
}).toString();

const UpgradeBanner = ({ hasCustomDomains }: { hasCustomDomains: boolean }) => {
  const restrictedFeatures = useStore($restrictedFeatures);
  const { canAddDomain } = useCanAddDomain();
  const { userPublishCount, maxDailyPublishesPerUser } = useUserPublishCount();
  if (userPublishCount >= maxDailyPublishesPerUser) {
    return (
      <PanelBanner>
        <Text variant="regularBold">
          Upgrade to publish more than {maxDailyPublishesPerUser} times per day:
        </Text>
        <LinkButton
          color="primary"
          href="https://webstudio.is/pricing"
          target="_blank"
        >
          Upgrade
        </LinkButton>
      </PanelBanner>
    );
  }

  // Only show Pro feature upgrade banner if custom domains are available
  // Free tier users can still publish to staging domain with Pro features
  if (restrictedFeatures.size > 0 && hasCustomDomains) {
    return (
      <PanelBanner>
        <img
          src={cmsUpgradeBanner}
          alt="Upgrade for CMS"
          width={rawTheme.spacing[28]}
          style={{ aspectRatio: "4.1" }}
        />
        <Text variant="regularBold">Following Pro features are used:</Text>
        <Text as="ul" color="destructive" css={{ paddingLeft: "1em" }}>
          {Array.from(restrictedFeatures).map(
            ([message, { navigate, view, info } = {}], index) => (
              <li key={index}>
                <Flex align="center" gap="1">
                  {navigate ? (
                    <button
                      className={buttonLinkClass}
                      type="button"
                      onClick={() => {
                        $selectedPageId.set(navigate.pageId);
                        selectInstance(navigate.instanceSelector);
                        if (view === "pageSettings") {
                          setActiveSidebarPanel("pages");
                          $editingPageId.set(navigate.pageId);
                        }
                      }}
                    >
                      {message}
                    </button>
                  ) : (
                    message
                  )}
                  {info && (
                    <Tooltip variant="wrapped" content={info}>
                      <SmallIconButton icon={<HelpIcon />} />
                    </Tooltip>
                  )}
                </Flex>
              </li>
            )
          )}
        </Text>
        <Text>
          You can delete these features or upgrade to publish to custom domains.
        </Text>
        <Flex align="center" gap={1}>
          <UpgradeIcon />
          <Link
            color="inherit"
            target="_blank"
            href="https://webstudio.is/pricing"
          >
            Upgrade to Pro
          </Link>
        </Flex>
      </PanelBanner>
    );
  }
  if (canAddDomain === false) {
    return (
      <PanelBanner>
        <Text variant="regular">
          <Text variant="regularBold" inline>
            Upgrade to a Pro account
          </Text>{" "}
          to add unlimited domains and publish to each domain individually.
        </Text>
        <Flex align="center" gap={1}>
          <UpgradeIcon />
          <Link
            color="inherit"
            target="_blank"
            href="https://webstudio.is/pricing"
          >
            Upgrade to Pro
          </Link>
        </Flex>
      </PanelBanner>
    );
  }
};

const Content = (props: {
  projectId: Project["id"];
  onExportClick: () => void;
  validation: ReturnType<typeof usePublishValidationState>;
  progress: ReturnType<typeof usePublishProgress>;
  publishLogs: ReturnType<typeof usePublishLogs>;
  onOpenReport: (
    domain: string | undefined,
    tab: "warnings" | "errors" | "publish"
  ) => void;
}) => {
  const restrictedFeatures = useStore($restrictedFeatures);
  const [newDomains, setNewDomains] = useState(new Set<string>());
  const [isAddingDomain, setIsAddingDomain] = useState(false);

  const project = useStore($project);

  if (project == null) {
    throw new Error("Project not found");
  }
  const projectState = "idle";

  const { userPublishCount, maxDailyPublishesPerUser } = useUserPublishCount();

  const hasUnpublishedDomains = project.domainsVirtual.some(
    (domain) =>
      domain.verified &&
      domain.status === "ACTIVE" &&
      domain.latestBuildVirtual == null
  );

  // Check if any custom domains exist (active and verified)
  const hasCustomDomains = project.domainsVirtual.some(
    (domain) => domain.status === "ACTIVE" && domain.verified
  );
  const hasSitePublish = props.publishLogs.items.some(
    ({ target }) => target === "site"
  );
  const diagnosticFindings = [
    ...props.progress.manualValidationFindings.findings,
    ...props.progress.publishFindings,
  ];
  const hasDiagnostics =
    hasSitePublish ||
    diagnosticFindings.length > 0 ||
    props.progress.publishError !== undefined;

  return (
    <>
      <PopoverTitle
        suffix={
          <PopoverTitleActions>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton type="button" aria-label="Publish options">
                  <EllipsesIcon />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  icon={<PlusIcon />}
                  onSelect={() => setIsAddingDomain(true)}
                >
                  Add new domain
                </DropdownMenuItem>
                <DropdownMenuItem
                  icon={<TerminalIcon />}
                  onSelect={props.onExportClick}
                >
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem
                  icon={<ActivityIcon />}
                  disabled={!hasDiagnostics}
                  onSelect={() =>
                    props.onOpenReport(
                      undefined,
                      hasSitePublish
                        ? "publish"
                        : props.progress.publishError !== undefined ||
                            diagnosticFindings.some(
                              ({ severity }) => severity === "error"
                            )
                          ? "errors"
                          : "warnings"
                    )
                  }
                >
                  Diagnostics
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  icon={<GearIcon />}
                  onSelect={() => $openProjectSettings.set("publish")}
                >
                  Publish settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <PopoverClose />
          </PopoverTitleActions>
        }
      >
        Publish
      </PopoverTitle>
      <form>
        <ScrollArea>
          <RadioGroup name="publishDomain">
            <ChangeProjectDomain
              refresh={refreshProject}
              projectState={projectState}
              project={project}
              validatedDomains={props.progress.manualValidationFindings.domains}
              onOpenReport={(domain) => props.onOpenReport(domain, "publish")}
              latestLog={props.publishLogs.items.find(
                (item) =>
                  item.target === "site" &&
                  item.domains.includes(project.domain)
              )}
            />

            <Domains
              newDomains={newDomains}
              domains={project.domainsVirtual}
              refresh={refreshProject}
              project={project}
              validatedDomains={props.progress.manualValidationFindings.domains}
              onOpenReport={(domain) => props.onOpenReport(domain, "publish")}
              publishLogs={props.publishLogs.items}
            />
          </RadioGroup>
        </ScrollArea>
        <Flex direction="column" justify="end" css={{ height: 0 }}>
          <Separator />
        </Flex>
        <PanelContent as={Flex} direction="column" gap="2">
          <AddDomain
            projectId={props.projectId}
            isOpen={isAddingDomain}
            onOpenChange={setIsAddingDomain}
            refresh={refreshProject}
            onCreate={(domain) => {
              setNewDomains((prev) => new Set([...prev, domain]));
            }}
          />
          {isAddingDomain && <Separator />}
          <UpgradeBanner hasCustomDomains={hasCustomDomains} />
          {hasUnpublishedDomains && (
            <PanelBanner>
              <Flex align="center" gap="1">
                <InfoCircleIcon color={cssVar("--foreground-primary")} />
                <Text variant="regularBold">Don't forget to publish</Text>
              </Flex>
              <Text>
                You have a custom domain that hasn't been published yet. Hit
                publish to make it live.
              </Text>
            </PanelBanner>
          )}
          <Publish
            project={project}
            refresh={refreshProject}
            timesLeft={maxDailyPublishesPerUser - userPublishCount}
            disabled={false}
            restrictedFeatures={restrictedFeatures}
            validation={props.validation}
            progress={props.progress}
            publishLogs={props.publishLogs}
            onOpenReport={props.onOpenReport}
          />
        </PanelContent>
      </form>
    </>
  );
};

type DeployTarget = {
  docs?: string;
  command?: string;
  ssgTemplates?: Templates[];
};

const deployTargets: Record<string, DeployTarget> = {
  docker: {
    docs: "https://docs.docker.com",
    command: `
      docker build -t my-image .
      docker run my-image
    `,
  },
  static: {
    ssgTemplates: ["ssg"],
  },
  vercel: {
    docs: "https://vercel.com/docs/cli",
    command: "npx vercel@latest",
    ssgTemplates: ["ssg-vercel"],
  },
  netlify: {
    docs: "https://docs.netlify.com/cli/get-started/",
    command: `
npx netlify-cli@latest login
npx netlify-cli sites:create
npx netlify-cli build
npx netlify-cli deploy`,
    ssgTemplates: ["ssg-netlify"],
  },
};

type DeployTargets = keyof typeof deployTargets;

const isDeployTargets = (value: string): value is DeployTargets =>
  Object.keys(deployTargets).includes(value);

const ExportContent = (props: {
  projectId: Project["id"];
  publishLogs: ReturnType<typeof usePublishLogs>;
  progress: ReturnType<typeof usePublishProgress>;
  onOpenReport: (tab?: "warnings" | "errors" | "publish") => void;
  onFindings: (findings: PublishValidationFinding[]) => void;
}) => {
  const npxCommand = "npx webstudio@latest";
  const [deployTarget, setDeployTarget] = useState<DeployTargets>("docker");

  return (
    <PanelContent as={Grid} columns={1} gap={3}>
      <Grid columns={1} gap={2}>
        <div />
        <Grid columns={2} gap={2} align={"center"}>
          <Text color="main" variant="labels">
            Destination
          </Text>

          <Select
            fullWidth
            value={deployTarget}
            options={Object.keys(deployTargets)}
            getLabel={(value) => humanizeString(value)}
            onChange={(value) => {
              if (isDeployTargets(value)) {
                setDeployTarget(value);
              }
            }}
          />
        </Grid>
      </Grid>

      {deployTargets[deployTarget].ssgTemplates && (
        <Grid columns={1} gap={1}>
          <PublishStatic
            projectId={props.projectId}
            templates={deployTargets[deployTarget].ssgTemplates}
            publishLogs={props.publishLogs}
            progress={props.progress}
            onOpenReport={props.onOpenReport}
            onFindings={props.onFindings}
          />
          <div />
          <Text color="subtle">
            Learn about deploying static sites{" "}
            <Link
              variant="inherit"
              color="inherit"
              href="https://wstd.us/ssg"
              target="_blank"
              rel="noreferrer"
            >
              here
            </Link>
          </Text>
        </Grid>
      )}

      {deployTargets[deployTarget].command && (
        <Grid columns={1} gap={2}>
          <Grid
            gap={2}
            align={"center"}
            css={{
              gridTemplateColumns: `1fr auto 1fr`,
            }}
          >
            <Separator css={{ alignSelf: "unset" }} />
            <Text color="main">CLI</Text>
            <Separator css={{ alignSelf: "unset" }} />
          </Grid>
          <Grid columns={1} gap={1}>
            <Text color="main" variant="labels">
              Step 1
            </Text>
            <Text color="subtle">
              Download and install Node v20+ from{" "}
              <Link
                variant="inherit"
                color="inherit"
                href="https://nodejs.org/"
                target="_blank"
                rel="noreferrer"
              >
                nodejs.org
              </Link>{" "}
              or with{" "}
              <Link
                variant="inherit"
                color="inherit"
                href="https://nodejs.org/en/download/package-manager"
                target="_blank"
                rel="noreferrer"
              >
                a package manager
              </Link>
              .
            </Text>
          </Grid>

          <Grid columns={1} gap={2}>
            <Grid columns={1} gap={1}>
              <Text color="main" variant="labels">
                Step 2
              </Text>
              <Text color="subtle">
                Run this command in your Terminal to install Webstudio CLI and
                sync your project.
              </Text>
            </Grid>
            <Flex gap={2}>
              <InputField
                css={{ flex: 1 }}
                text="mono"
                readOnly
                value={npxCommand}
              />
              <CopyToClipboard text={npxCommand}>
                <Button type="button" prefix={<CopyIcon />}>
                  Copy
                </Button>
              </CopyToClipboard>
            </Flex>
          </Grid>

          <Grid columns={1} gap={2}>
            <Grid columns={1} gap={1}>
              <Text color="main" variant="labels">
                Step 3
              </Text>
              <Text color="subtle">
                Run this command to publish to{" "}
                <Link
                  variant="inherit"
                  color="inherit"
                  href={deployTargets[deployTarget].docs}
                  target="_blank"
                  rel="noreferrer"
                >
                  {humanizeString(deployTarget)}
                </Link>{" "}
              </Text>
            </Grid>
            <Flex gap={2} align="end">
              <TextArea
                css={{ flex: 1 }}
                variant="mono"
                readOnly
                value={stripIndent(deployTargets[deployTarget].command)
                  .trimStart()
                  .replace(/ +$/, "")}
              />
              <CopyToClipboard text={deployTargets[deployTarget].command}>
                <Button
                  type="button"
                  css={{ flexShrink: 0 }}
                  prefix={<CopyIcon />}
                >
                  Copy
                </Button>
              </CopyToClipboard>
            </Flex>
          </Grid>

          <Grid columns={1} gap={1}>
            <Text color="subtle">
              Read the detailed documentation{" "}
              <Link
                variant="inherit"
                color="inherit"
                href="https://wstd.us/cli"
                target="_blank"
                rel="noreferrer"
              >
                here
              </Link>
            </Text>
          </Grid>
        </Grid>
      )}
    </PanelContent>
  );
};

type PublishProps = {
  projectId: Project["id"];
};

export const PublishButton = ({ projectId }: PublishProps) => {
  const publishDialog = useStore($publishDialog);
  const authTokenPermissions = useStore($authTokenPermissions);
  const { allowPublishLogs = false } = useStore($planFeatures);
  const publishLogs = usePublishLogs(projectId, allowPublishLogs);
  const pendingLogs = useRef(publishLogs.items);
  pendingLogs.current = publishLogs.items;
  const { complete: completePublishLog, loadLog: loadPublishLog } = publishLogs;
  const [staticFindings, setStaticFindings] = useState<
    PublishValidationFinding[]
  >([]);
  const [selectedReport, setSelectedReport] = useState<{
    target: "static" | "site";
    domain?: string;
    tab: "warnings" | "errors" | "publish";
  }>();
  useEffect(() => {
    setSelectedReport(undefined);
    setStaticFindings([]);
  }, [projectId]);
  const validation = usePublishValidationState(publishDialog);
  const publishProgress = usePublishProgress(projectId);
  const {
    dismissCountdown,
    reconcileRefreshedProject,
    watchPendingPublish,
    beginPopoverRefresh,
    isRefreshCurrent,
  } = publishProgress;
  useEffect(() => {
    if (publishDialog !== "publish") {
      dismissCountdown();
    }
  }, [publishDialog, dismissCountdown]);
  useEffect(() => {
    // Refresh a build that finished while the popover was closed, including
    // after a publish status request failed.
    if (publishDialog !== "none" && publishProgress.isPublishing === false) {
      let isOpen = true;
      const generation = beginPopoverRefresh();
      void refreshUntilSuccess(
        async (showError) => {
          const refreshedProject = await getRefreshedProject({
            projectId,
            showError,
            isCurrent: () => isOpen && isRefreshCurrent(generation),
          });
          if (
            isOpen &&
            isRefreshCurrent(generation) &&
            refreshedProject !== undefined
          ) {
            reconcileRefreshedProject(refreshedProject);
          }
          return refreshedProject;
        },
        () => isOpen,
        () => {
          const target = publishDialog === "export" ? "static" : "site";
          const pending = pendingLogs.current.find(
            (item) => item.target === target && item.status === "pending"
          );
          if (target === "static" && pending === undefined) {
            return;
          }
          void watchPendingPublish(
            () =>
              getRefreshedProject({
                projectId,
                showError: false,
                isCurrent: () => isRefreshCurrent(generation),
              }),
            generation,
            pending === undefined
              ? undefined
              : {
                  projectId,
                  buildId: pending.buildId,
                  logHandle: pending.logHandle,
                  target,
                },
            (result) => {
              if (
                pending !== undefined &&
                (result?.status === "PUBLISHED" || result?.status === "FAILED")
              ) {
                const status =
                  result.status === "PUBLISHED" ? "success" : "failed";
                completePublishLog(pending.buildId, status, result.code);
                loadPublishLog({ ...pending, status });
                if (
                  pending.target === "static" &&
                  status === "success" &&
                  pending.staticName !== undefined
                ) {
                  window.location.href = `/cgi/static/ssg/${pending.staticName}`;
                }
              }
            }
          );
        },
        () =>
          pendingLogs.current.some(
            (item) =>
              item.target ===
                (publishDialog === "export" ? "static" : "site") &&
              item.status === "pending"
          )
      );
      return () => {
        isOpen = false;
      };
    }
  }, [
    projectId,
    publishDialog,
    publishProgress.isPublishing,
    reconcileRefreshedProject,
    watchPendingPublish,
    beginPopoverRefresh,
    isRefreshCurrent,
    completePublishLog,
    loadPublishLog,
  ]);
  const { canPublishToStagingOnly } = useStore($permissions);
  const isPublishEnabled =
    authTokenPermissions.canPublish || canPublishToStagingOnly;
  const tooltipContent = isPublishEnabled
    ? undefined
    : "Only the owner, an admin, or content editors with publish permissions can publish projects";

  const handleExportClick = () => {
    validation.reset();
    publishProgress.dismissCountdown();
    $publishDialog.set("export");
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen === false) {
      validation.reset();
      publishProgress.dismissCountdown();
    }
    $publishDialog.set(isOpen ? "publish" : "none");
  };

  const openSiteReport = (
    domain: string | undefined,
    tab: "warnings" | "errors" | "publish"
  ) => {
    $publishDialog.set("none");
    setSelectedReport({ target: "site", domain, tab });
  };
  const openStaticReport = (
    tab: "warnings" | "errors" | "publish" = "publish"
  ) => {
    $publishDialog.set("none");
    setSelectedReport({ target: "static", tab });
  };
  const reportItems = selectPublishLogs(
    publishLogs.items,
    selectedReport?.target ?? "site",
    selectedReport?.domain
  );
  const latestReportItem = reportItems[0];
  const domain = selectedReport?.domain;
  const showingPublish = selectedReport?.tab === "publish";
  const candidateFindings: PublishValidationFinding[] = [
    ...(selectedReport?.target === "static"
      ? showingPublish
        ? []
        : staticFindings
      : [
          ...(!showingPublish &&
          (domain === undefined ||
            publishProgress.manualValidationFindings.domains?.includes(domain))
            ? publishProgress.manualValidationFindings.findings
            : []),
          ...(!showingPublish &&
          (domain === undefined ||
            publishProgress.publishDiagnosticsDomains.includes(domain))
            ? publishProgress.publishFindings
            : []),
          ...(publishProgress.publishError === undefined ||
          (domain !== undefined &&
            publishProgress.publishErrorDomains !== undefined &&
            !publishProgress.publishErrorDomains.includes(domain))
            ? []
            : [
                {
                  severity: "error" as const,
                  source: "publish" as const,
                  title: publishProgress.publishError,
                  summary:
                    typeof publishProgress.publishError === "string"
                      ? publishProgress.publishError.slice(0, 160)
                      : "Publish failed",
                  reportText:
                    typeof publishProgress.publishError === "string"
                      ? publishProgress.publishError
                      : "Publish failed",
                },
              ]),
        ]),
    ...(showingPublish ? (latestReportItem?.findings ?? []) : []),
    ...(showingPublish && allowPublishLogs
      ? (latestReportItem?.issues?.map((issue) => ({
          severity: issue.severity,
          title: issue.message,
          summary: issue.message,
          source: "build" as const,
          reportText: `${issue.severity.toUpperCase()}: ${issue.message}`,
        })) ?? [])
      : []),
  ];
  const reportFindings = candidateFindings.filter(
    (finding, index, all) =>
      all.findIndex(
        (other) =>
          other.reportText === finding.reportText &&
          other.source === finding.source
      ) === index
  );

  return (
    <>
      <Popover
        modal
        open={publishDialog !== "none"}
        onOpenChange={handleOpenChange}
      >
        <Tooltip
          side="bottom"
          content={tooltipContent ?? "Publish to Webstudio Cloud"}
          sideOffset={Number.parseFloat(rawTheme.spacing[5])}
        >
          <PopoverTrigger asChild>
            <Button type="button" disabled={isPublishEnabled === false}>
              Publish
            </Button>
          </PopoverTrigger>
        </Tooltip>

        <PopoverContent
          css={{
            width: theme.spacing[33],
            maxWidth: theme.spacing[33],
            marginRight: theme.spacing[3],
          }}
        >
          {publishDialog === "export" && (
            <>
              <PopoverTitle>Export</PopoverTitle>
              <ExportContent
                projectId={projectId}
                publishLogs={publishLogs}
                progress={publishProgress}
                onOpenReport={openStaticReport}
                onFindings={(findings) => {
                  if (publishLogs.isCurrent()) {
                    setStaticFindings(findings);
                  }
                }}
              />
            </>
          )}

          {publishDialog === "publish" && (
            <Content
              projectId={projectId}
              onExportClick={handleExportClick}
              validation={validation}
              progress={publishProgress}
              publishLogs={publishLogs}
              onOpenReport={openSiteReport}
            />
          )}
        </PopoverContent>
      </Popover>
      <PublishDiagnosticsDialog
        findings={reportFindings}
        open={selectedReport !== undefined}
        onOpenChange={(open) => {
          if (open === false) {
            setSelectedReport(undefined);
          }
        }}
        target={
          selectedReport?.target === "static"
            ? "Static export"
            : selectedReport?.domain
        }
        initialTab={selectedReport?.tab}
        items={reportItems}
        canViewPublishLogs={allowPublishLogs}
        onLoadLog={publishLogs.loadLog}
      />
    </>
  );
};

export const __testing__ = {
  usePublishProgress,
  useManualValidationFindings,
  waitForPublishStatus,
  refreshUntilSuccess,
  getRefreshedProject,
  reportPublishResult,
  PublishStatic,
};
