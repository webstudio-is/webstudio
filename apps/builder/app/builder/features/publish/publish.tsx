import stripIndent from "strip-indent";
import { computed } from "nanostores";
import {
  useEffect,
  useState,
  useOptimistic,
  useTransition,
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
  selectInstance,
} from "~/shared/nano-states";
import { $selectedPageId } from "~/shared/nano-states";
import {
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
  AlertIcon,
  CopyIcon,
  GearIcon,
  UpgradeIcon,
  HelpIcon,
  InfoCircleIcon,
  EllipsesIcon,
  PlusIcon,
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
  type PrePublishAuditFinding,
} from "@webstudio-is/project-build/runtime";
import { getContentDatabasePublishFindings } from "./content-database-publish-warning";
import {
  PublishValidationResults,
  type PublishValidationFinding,
} from "./publish-validation-results";
import {
  PublishActions,
  usePublishValidationState,
  type PublishValidationState,
} from "./publish-actions";
import { flushExternalContentProject } from "~/shared/external-content-roots";
import {
  getPublishResponseTransformDiagnostics,
  getPublishValidationErrorMessage,
} from "./publish-error";
import { runPublishAfterBestEffortChecks } from "./publish-preflight";

const PrePublishAuditMessage = ({
  finding,
}: {
  finding: PrePublishAuditFinding;
}) => {
  const message = formatPrePublishAuditFinding(finding);
  const instanceId = finding.location.instanceId;
  if (instanceId === undefined) {
    return message;
  }
  return (
    <>
      {message}{" "}
      <PrePublishInstanceLink instanceId={instanceId}>
        Show element
      </PrePublishInstanceLink>
    </>
  );
};

const getPrePublishInstanceTarget = (instanceId: string) => {
  const pages = $pages.get();
  const instances = $instances.get();
  if (pages === undefined || instances.has(instanceId) === false) {
    return;
  }
  const { pageId, instanceSelector } = findPageAndSelectorByInstanceId(
    pages,
    instances,
    instanceId
  );
  const href = getInstanceLink(instanceSelector);
  if (href === undefined) {
    return;
  }
  return { pageId, instanceSelector, href };
};

const PrePublishInstanceLink = ({
  instanceId,
  children,
}: {
  instanceId: string;
  children: ReactNode;
}) => {
  const target = getPrePublishInstanceTarget(instanceId);
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
      .filter(([, value]) => value !== undefined)
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
        title: <PrePublishAuditMessage finding={finding} />,
        details: context.length === 0 ? undefined : context.join(" · "),
        reportText,
      },
    ];
  });
};

const blockPublishOnLocalErrors = (
  setFindings: (findings: PublishValidationFinding[]) => void
) => {
  const findings = getPrePublishAuditFindings();
  setFindings(findings);
  return findings.some(({ severity }) => severity === "error");
};

const runPublishDiagnostics = async (
  projectId: Project["id"],
  domains?: string[]
) => {
  const auditFindings = getPrePublishAuditFindings();
  const diagnostics =
    domains === undefined
      ? await nativeClient.build.contentDatabasePublishDiagnostics.query({
          projectId,
        })
      : (
          await nativeClient.api.publish.validate.query({
            projectId,
            target: "staging",
            domains,
          })
        ).diagnostics;
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
  const findings = [...auditFindings, ...contentFindings];
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
  const responseDiagnostics = getPublishResponseTransformDiagnostics(error);
  if (responseDiagnostics !== undefined) {
    console.error(
      "Publish validation response transform failed",
      responseDiagnostics
    );
  }
  const diagnosticMessage = getPublishValidationErrorMessage(error, {
    assets: $assets.get(),
    assetFolders: $assetFolders.get(),
  });
  const message = publishingContinues
    ? `${diagnosticMessage}\n\nThe publish request was sent without waiting for these diagnostics.`
    : diagnosticMessage;
  if ($publishDialog.get() === "none") {
    toast.error(message);
    return;
  }
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
      details,
      reportText: `ERROR: Unable to complete publish validation\n${message}`,
    },
  ]);
};

type ChangeProjectDomainProps = {
  project: Project;
  projectState: "idle" | "submitting";
  refresh: () => Promise<void>;
};

const ChangeProjectDomain = ({
  project,
  refresh,
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

  const isPublished = latestProjectDomainBuild != null;

  return (
    <CollapsibleDomainSection
      title={pageUrl.host}
      prefix={
        <DomainCheckbox
          defaultChecked={latestProjectDomainBuild?.domain === domain}
          buildId={latestProjectDomainBuild?.buildId}
          domain={domain}
        />
      }
      suffix={
        <Grid flow="column" align="center">
          <Tooltip
            content={error !== undefined ? error : <Text>{statusText}</Text>}
          >
            <Flex
              align="center"
              justify="center"
              css={{
                cursor: "pointer",
                width: theme.sizes.controlHeight,
                height: theme.sizes.controlHeight,
                color:
                  error !== undefined ? cssVar("--foreground-negative") : color,
              }}
            >
              {error !== undefined ? <AlertIcon /> : <Icon />}
            </Flex>
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
            <Tooltip
              content="Domain can't be renamed once published. Unpublish to enable renaming."
              variant="wrapped"
            >
              <InfoCircleIcon
                tabIndex={0}
                style={{ flexShrink: 0 }}
                color={cssVar("--foreground-secondary")}
              />
            </Tooltip>
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
              <Tooltip
                content="This password is read-only and cannot be changed. It is the same for every user. This prevents phishing attacks."
                variant="wrapped"
              >
                <InfoCircleIcon
                  tabIndex={0}
                  style={{ flexShrink: 0 }}
                  color={cssVar("--foreground-secondary")}
                />
              </Tooltip>
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

const usePublishCountdown = (isPublishing: boolean) => {
  const [countdown, setCountdown] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (isPublishing === false) {
      setCountdown(undefined);
      return;
    }

    setCountdown(60);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === undefined || prev <= 0) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isPublishing]);

  return countdown;
};

const Publish = ({
  project,
  timesLeft,
  disabled,
  refresh,
  restrictedFeatures,
  validationState,
  onValidationStateChange,
  isPublishing,
  setIsPublishing,
}: {
  project: Project;
  timesLeft: number;
  disabled: boolean;
  refresh: () => Promise<void>;
  restrictedFeatures: Map<string, RestrictedFeature>;
  validationState: PublishValidationState;
  onValidationStateChange: (state: PublishValidationState) => void;
  isPublishing: boolean;
  setIsPublishing: (isPublishing: boolean) => void;
}) => {
  const { userPublishCount, maxDailyPublishesPerUser } = useUserPublishCount();
  const [publishError, setPublishError] = useState<
    undefined | JSX.Element | string
  >();
  const [publishFindings, setPublishFindings] = useState<
    PublishValidationFinding[]
  >([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [hasSelectedDomains, setHasSelectedDomains] = useState(false);
  const [hasCustomDomainsSelected, setHasCustomDomainsSelected] =
    useState(false);
  const previousDomainsKey = useRef<string>();
  const hasPendingState = project.latestBuildVirtual
    ? getPublishStatusAndText(project.latestBuildVirtual).status === "PENDING"
    : false;
  const isPublishInProgress = isPublishing || hasPendingState;
  const countdown = usePublishCountdown(isPublishInProgress);

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

    handleFormInput();

    return () => {
      observer.disconnect();
    };
  }, [onValidationStateChange, project.domain]);

  const publish = async (domains: string[]) => {
    const publishResult = await nativeClient.domain.publish.mutate({
      projectId: project.id,
      domains,
      destination: publishedDeploymentDestination,
    });

    if (publishResult.success === false) {
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
      setPublishError(error);
      if (publishResult.error === "NOT_IMPLEMENTED") {
        toast.info(error);
      } else {
        toast.error(error);
      }

      if (process.env.NODE_ENV === "development") {
        // Refresh locally as it's always an error
        await refresh();
      }

      return;
    }

    let sleepTime = 15000;
    const timeToFinish = Date.now() + PENDING_TIMEOUT + 2 * sleepTime;

    // Wait until project is published or failed
    while (Date.now() < timeToFinish) {
      await refresh();

      const project = $project.get();

      if (project == null) {
        throw new Error("Project not found");
      }

      const { statusText, status } =
        project.latestBuildVirtual != null
          ? getPublishStatusAndText(project.latestBuildVirtual)
          : {
              statusText: "Not published",
              status: "PENDING" as const,
            };

      if (status === "PUBLISHED") {
        toast.success(
          <>
            The project has been successfully published.{" "}
            {timesLeft > 0 && timesLeft <= 10 && (
              <div>
                You have {timesLeft} out of {maxDailyPublishesPerUser} daily
                publications remaining. The counter resets tomorrow.
              </div>
            )}
          </>,
          { duration: 10000 }
        );
        break;
      }

      if (status === "FAILED") {
        toast.error(statusText);
        setPublishError(statusText);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, sleepTime));

      sleepTime = Math.max(5000, sleepTime - 5000);
    }
  };

  const getDomainsFromForm = (formData: FormData) =>
    formData
      .getAll(domainToPublishName)
      .map((domainEntry) => domainEntry.toString());

  const handleValidate = async (formData: FormData) => {
    setPublishError(undefined);
    setPublishFindings([]);
    const domains = getDomainsFromForm(formData);
    if (domains.length === 0) {
      toast.error("Please select at least one domain to publish");
      return;
    }

    try {
      const checks = await runPublishValidation(project.id, domains);
      setPublishFindings(checks.findings);
      if (checks.passed === false) {
        onValidationStateChange("idle");
        return;
      }
      onValidationStateChange("passed");
      toast.success("Validation passed. Ready to publish.", {
        duration: Number.POSITIVE_INFINITY,
      });
    } catch (error) {
      onValidationStateChange("idle");
      reportPublishValidationFailure(error, setPublishFindings);
    }
  };

  const handlePublish = (formData: FormData) => {
    setPublishError(undefined);
    setPublishFindings([]);

    // Custom domain checkboxes are disabled on free plan so they are never
    // submitted — only the staging (wstd.io) domain can appear in formData.
    const domains = getDomainsFromForm(formData);

    if (domains.length === 0) {
      toast.error("Please select at least one domain to publish");
      return;
    }

    if (blockPublishOnLocalErrors(setPublishFindings)) {
      onValidationStateChange("idle");
      return;
    }

    startTransition(async () => {
      setIsPublishing(true);
      await runPublishAfterBestEffortChecks({
        checks: async () => {
          const checks = await runPublishDiagnostics(project.id);
          setPublishFindings(checks.findings);
        },
        onCheckFailure: (error) =>
          reportPublishValidationFailure(error, setPublishFindings, true),
        publish: () => publish(domains),
      });
    });
  };

  const getForm = () => buttonRef.current?.closest("form");

  return (
    <Flex gap={2} shrink={false} direction={"column"}>
      <PublishValidationResults findings={publishFindings} />
      {publishError && <Text color="destructive">{publishError}</Text>}
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
}: {
  projectId: Project["id"];
  templates: readonly Templates[];
}) => {
  const project = useStore($project);
  const [_, startTransition] = useTransition();
  const [publishError, setPublishError] = useState<JSX.Element | string>();
  const [publishFindings, setPublishFindings] = useState<
    PublishValidationFinding[]
  >([]);

  if (project == null) {
    throw new Error("Project not found");
  }

  const { status, statusText } =
    project.latestStaticBuild == null
      ? { status: "LOADED" as const, statusText: "Not published" }
      : getStaticPublishStatusAndText(project.latestStaticBuild);

  const [isPending, setIsPendingOptimistic] = useOptimistic(false);

  const isPublishInProgress = status === "PENDING" || isPending;

  return (
    <Flex gap={2} shrink={false} direction={"column"}>
      <PublishValidationResults findings={publishFindings} />
      {publishError && <Text color="destructive">{publishError}</Text>}
      {status === "FAILED" && <Text color="destructive">{statusText}</Text>}

      <Tooltip
        content={isPublishInProgress ? "Preparing static site" : undefined}
      >
        <Button
          type="button"
          color="primary"
          state={isPublishInProgress ? "pending" : undefined}
          onClick={() => {
            setPublishError(undefined);
            setPublishFindings([]);

            if (blockPublishOnLocalErrors(setPublishFindings)) {
              return;
            }

            startTransition(async () => {
              try {
                setIsPendingOptimistic(true);
                const result = await runPublishAfterBestEffortChecks({
                  checks: async () => {
                    const checks = await runPublishDiagnostics(projectId);
                    setPublishFindings(checks.findings);
                  },
                  onCheckFailure: (error) =>
                    reportPublishValidationFailure(
                      error,
                      setPublishFindings,
                      true
                    ),
                  publish: () =>
                    nativeClient.domain.publish.mutate({
                      projectId,
                      destination: "static",
                      templates: [...templates],
                    }),
                });

                if (result.success === false) {
                  toast.error(result.error);
                  return;
                }

                const name = "name" in result ? result.name : undefined;

                if (name == null) {
                  toast.error('File name must be defined in "result"');
                  return;
                }

                const timeout = 10000;

                // Repeat few more times than timeout
                const repeat = PENDING_TIMEOUT / timeout + 5;

                for (let i = 0; i !== repeat; i++) {
                  await new Promise((resolve) => setTimeout(resolve, timeout));

                  await refreshProject();

                  const latestStaticBuild = $project.get()?.latestStaticBuild;

                  if (latestStaticBuild == null) {
                    continue;
                  }

                  const { status } =
                    getStaticPublishStatusAndText(latestStaticBuild);

                  if (status !== "PENDING") {
                    break;
                  }
                }

                const latestStaticBuild = $project.get()?.latestStaticBuild;

                if (latestStaticBuild == null) {
                  throw new Error("Static build not found");
                }

                const { status, statusText } =
                  getStaticPublishStatusAndText(latestStaticBuild);

                if (status === "FAILED") {
                  // Report if Export failed
                  toast.error(statusText);
                }

                if (status === "PUBLISHED") {
                  window.location.href = `/cgi/static/ssg/${name}`;
                }
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Unknown error"
                );
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

const refreshProject = async () => {
  const result = await nativeClient.domain.project.query(
    {
      projectId: $project.get()!.id,
    }
    // Pass abort signal
    // { signal: undefined }
  );

  if (result.success) {
    $project.set(result.project);
    return;
  }

  toast.error(result.error);
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
  validationState: PublishValidationState;
  onValidationStateChange: (state: PublishValidationState) => void;
  isPublishing: boolean;
  setIsPublishing: (isPublishing: boolean) => void;
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
            />

            <Domains
              newDomains={newDomains}
              domains={project.domainsVirtual}
              refresh={refreshProject}
              project={project}
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
            validationState={props.validationState}
            onValidationStateChange={props.onValidationStateChange}
            isPublishing={props.isPublishing}
            setIsPublishing={props.setIsPublishing}
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

const ExportContent = (props: { projectId: Project["id"] }) => {
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
  const { validationState, update, reset } = usePublishValidationState(
    publishDialog === "publish"
  );
  const [isPublishing, setIsPublishing] = useOptimistic(false);
  const { canPublishToStagingOnly } = useStore($permissions);
  const isPublishEnabled =
    authTokenPermissions.canPublish || canPublishToStagingOnly;
  const tooltipContent = isPublishEnabled
    ? undefined
    : "Only the owner, an admin, or content editors with publish permissions can publish projects";

  const handleExportClick = () => {
    reset();
    $publishDialog.set("export");
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen === false) {
      reset();
    }
    $publishDialog.set(isOpen ? "publish" : "none");
  };

  return (
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
            <ExportContent projectId={projectId} />
          </>
        )}

        {publishDialog === "publish" && (
          <Content
            projectId={projectId}
            onExportClick={handleExportClick}
            validationState={validationState}
            onValidationStateChange={update}
            isPublishing={isPublishing}
            setIsPublishing={setIsPublishing}
          />
        )}
      </PopoverContent>
    </Popover>
  );
};

undefined;
