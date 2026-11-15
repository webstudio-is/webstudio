import stripIndent from "strip-indent";
import { computed } from "nanostores";
import {
  useEffect,
  useState,
  useOptimistic,
  startTransition,
  useRef,
  useId,
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
  PopoverTitle,
  PopoverClose,
  PopoverTitleActions,
  css,
  textVariants,
  SmallIconButton,
} from "@webstudio-is/design-system";
import { validateProjectDomain, type Project } from "@webstudio-is/project";
import {
  $selectedPageId,
  selectInstance,
  $editingPageId,
  $permissions,
  $stagingUsername,
  $stagingPassword,
} from "~/shared/nano-states";
import {
  $publisherHost,
  $project,
  $dataSources,
  $instances,
  $pages,
  $projectSettings,
  $resources,
} from "~/shared/sync/data-stores";
import { setActiveSidebarPanel } from "../../shared/nano-states";
import { Domains } from "./domains";
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
import type { Templates } from "@webstudio-is/sdk";
import { DomainCheckbox, domainToPublishName } from "./domain-checkbox";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import { $openProjectSettings } from "~/shared/nano-states/project-settings";
import cmsUpgradeBanner from "~/shared/cms-upgrade-banner.svg?url";
import { $currentSystem } from "~/shared/system";
import { getPublishUrl } from "./publish-url";
import {
  getRestrictedFeatures,
  type RestrictedFeature,
} from "./restricted-features";
import { PublishValidationBanner, type DiagnosticFinding } from "./diagnostics";
import type { SessionPublish } from "./session-publishes";
import { PublishActions, type PublishValidationState } from "./publish-actions";
import { fetchAndStoreProject } from "./publish-progress";
import {
  getPublishStatusDisplay,
  getStaticPublishStatusDisplay,
} from "./publish-status";
import { DomainStatusButton } from "./domain-status-button";

type PublishUiState = {
  isPublishing: boolean;
  countdown?: number;
  validationState: PublishValidationState;
  validatedDomains?: string[];
  invalidateValidation: () => void;
  publishes: SessionPublish[];
  siteError?: string | JSX.Element;
  siteErrorSource?: "request" | "transport" | "status";
  siteFindings: DiagnosticFinding[];
  staticFailureFinding?: DiagnosticFinding;
  openSiteReport: (
    domain: string | undefined,
    tab: "warnings" | "errors" | "publish"
  ) => void;
  openStaticReport: (tab?: "warnings" | "errors" | "publish") => void;
  validate: (domains: string[]) => Promise<void>;
  publishSite: (
    domains: string[],
    timesLeft: number,
    maxDailyPublishesPerUser: number
  ) => void;
  exportStatic: (templates: readonly Templates[]) => void;
};

type StaticPublishUiState = Pick<
  PublishUiState,
  | "isPublishing"
  | "publishes"
  | "staticFailureFinding"
  | "openStaticReport"
  | "exportStatic"
>;

const PublishSuccessBanner = ({
  message,
  onOpen,
}: {
  message: string;
  onOpen: () => void;
}) => (
  <PanelBanner variant="success" role="status">
    <Flex align="center" justify="between" gap={2}>
      <Text css={{ flex: 1, minWidth: 0 }}>{message}</Text>
      <Button
        type="button"
        color="ghost"
        css={{ flexShrink: 0 }}
        onClick={onOpen}
      >
        See logs
      </Button>
    </Flex>
  </PanelBanner>
);

type ChangeProjectDomainProps = {
  project: Project;
  refresh: () => Promise<void>;
  validatedDomains?: readonly string[];
  onOpenReport: (domain: string) => void;
  latestPublish?: SessionPublish;
};

const ChangeProjectDomain = ({
  project,
  refresh,
  validatedDomains,
  onOpenReport,
  latestPublish,
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

  const { statusContent, color, Icon } =
    latestProjectDomainBuild != null
      ? getPublishStatusDisplay(latestProjectDomainBuild)
      : {
          statusContent: "Not published",
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
          validatedDomains={validatedDomains}
          buildId={latestProjectDomainBuild?.buildId}
          domain={domain}
        />
      }
      suffix={
        <Grid flow="column" align="center">
          <DomainStatusButton
            domain={pageUrl.host}
            buildId={latestProjectDomainBuild?.buildId}
            latestPublish={error === undefined ? latestPublish : undefined}
            fallback={{
              Icon: error === undefined ? Icon : AlertIcon,
              color:
                error === undefined ? color : cssVar("--foreground-negative"),
              text: error ?? <Text>{statusContent}</Text>,
            }}
            onOpenReport={() => onOpenReport(project.domain)}
          />

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
  quota,
  restrictedFeatures,
  flow,
}: {
  project: Project;
  quota: { userPublishCount: number; maxDailyPublishesPerUser: number };
  restrictedFeatures: Map<string, RestrictedFeature>;
  flow: PublishUiState;
}) => {
  const {
    isPublishing,
    countdown,
    validationState,
    validatedDomains,
    invalidateValidation,
    publishes,
    siteError,
    siteErrorSource,
    openSiteReport: onOpenReport,
  } = flow;
  const { userPublishCount, maxDailyPublishesPerUser } = quota;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [hasSelectedDomains, setHasSelectedDomains] = useState(false);
  const [hasCustomDomainsSelected, setHasCustomDomainsSelected] =
    useState(false);
  const previousDomainsKey = useRef<string>();
  const hasPendingState = project.latestBuildVirtual
    ? getPublishStatusDisplay(project.latestBuildVirtual).status === "PENDING"
    : false;
  const isPublishInProgress = isPublishing || hasPendingState;

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
        invalidateValidation();
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

    if (validatedDomains !== undefined) {
      if (matchesValidatedDomains(form, validatedDomains)) {
        previousDomainsKey.current = validatedDomains.join("\u0000");
      } else {
        invalidateValidation();
      }
    }

    handleFormInput();

    return () => {
      observer.disconnect();
    };
  }, [invalidateValidation, project.domain, validatedDomains]);

  const getDomainsFromForm = (formData: FormData) =>
    formData
      .getAll(domainToPublishName)
      .map((domainEntry) => domainEntry.toString());

  const getForm = () => buttonRef.current?.closest("form");
  const findings = flow.siteFindings;
  const latestSitePublish = publishes.find(({ target }) => target === "site");
  const hasSessionPublish = latestSitePublish !== undefined;

  return (
    <Flex gap={2} shrink={false} direction={"column"}>
      {siteError !== undefined ? (
        <PanelBanner variant="error">
          <Flex align="center" justify="between" gap={2}>
            <Text css={{ flex: 1, minWidth: 0 }}>
              {typeof siteError === "string"
                ? siteError.slice(0, 160)
                : siteError}
            </Text>
            <Button
              type="button"
              color="ghost"
              css={{ flexShrink: 0 }}
              onClick={() =>
                onOpenReport(
                  undefined,
                  siteErrorSource === "status" && hasSessionPublish
                    ? "publish"
                    : "errors"
                )
              }
            >
              See issues
            </Button>
          </Flex>
        </PanelBanner>
      ) : latestSitePublish?.status === "success" && !isPublishInProgress ? (
        <PublishSuccessBanner
          message="Published successfully."
          onOpen={() => onOpenReport(undefined, "publish")}
        />
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
        validateDisabled={isPublishInProgress}
        publishDisabled={
          hasSelectedDomains === false ||
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
            await flow.validate(getDomainsFromForm(new FormData(form)));
          }
        }}
        onPublish={() => {
          const form = getForm();
          if (form) {
            flow.publishSite(
              getDomainsFromForm(new FormData(form)),
              maxDailyPublishesPerUser - userPublishCount,
              maxDailyPublishesPerUser
            );
          }
        }}
      />
    </Flex>
  );
};

const PublishStatic = ({
  templates,
  flow,
}: {
  templates: readonly Templates[];
  flow: StaticPublishUiState;
}) => {
  const {
    isPublishing,
    publishes,
    staticFailureFinding,
    openStaticReport: onOpenReport,
  } = flow;
  const project = useStore($project);

  if (project == null) {
    throw new Error("Project not found");
  }

  const { status, statusContent } =
    project.latestStaticBuild == null
      ? { status: "LOADED" as const, statusContent: "Not published" }
      : getStaticPublishStatusDisplay(project.latestStaticBuild);
  const latestPublish = publishes.find((item) => item.target === "static");
  const logStatus =
    staticFailureFinding !== undefined
      ? "FAILED"
      : latestPublish?.status === "pending"
        ? "PENDING"
        : latestPublish?.status === "failed"
          ? "FAILED"
          : latestPublish?.status === "success"
            ? "PUBLISHED"
            : status;

  const isPublishInProgress = status === "PENDING" || isPublishing;

  return (
    <Flex gap={2} shrink={false} direction={"column"}>
      {latestPublish?.status === "success" &&
        latestPublish.staticName !== undefined &&
        !isPublishInProgress &&
        staticFailureFinding === undefined && (
          <PublishSuccessBanner
            message="Downloaded"
            onOpen={() => onOpenReport("publish")}
          />
        )}
      <Flex gap={2} align="center">
        <Tooltip
          content={
            staticFailureFinding?.title ??
            (latestPublish?.status === "failed"
              ? "Publish failed"
              : statusContent)
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
          onClick={() => flow.exportStatic(templates)}
        >
          Build and download static site
        </Button>
      </Tooltip>
    </Flex>
  );
};

const refreshProject = async () => {
  await fetchAndStoreProject({ projectId: $project.get()!.id });
};

const buttonLinkClass = css({
  all: "unset",
  cursor: "pointer",
  ...textVariants.link,
}).toString();

const UpgradeBanner = ({
  hasCustomDomains,
  quota,
}: {
  hasCustomDomains: boolean;
  quota: { userPublishCount: number; maxDailyPublishesPerUser: number };
}) => {
  const restrictedFeatures = useStore($restrictedFeatures);
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
  const { userPublishCount, maxDailyPublishesPerUser } = quota;
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

export const Content = (props: {
  projectId: Project["id"];
  onExportClick: () => void;
  flow: PublishUiState;
}) => {
  const restrictedFeatures = useStore($restrictedFeatures);
  const [newDomains, setNewDomains] = useState(new Set<string>());
  const [isAddingDomain, setIsAddingDomain] = useState(false);

  const project = useStore($project);

  if (project == null) {
    throw new Error("Project not found");
  }

  const { load: loadPublishCount, data: publishCount } =
    trpcClient.project.userPublishCount.useQuery();
  const { maxDailyPublishesPerUser } = useStore($permissions);
  useEffect(() => {
    loadPublishCount({ projectId: project.id });
  }, [loadPublishCount, project.id]);
  const quota = {
    userPublishCount: publishCount?.success ? publishCount.data : 0,
    maxDailyPublishesPerUser:
      publishCount?.success && "limit" in publishCount
        ? publishCount.limit
        : maxDailyPublishesPerUser,
  };

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
  const hasSitePublish = props.flow.publishes.some(
    ({ target }) => target === "site"
  );
  const diagnosticFindings = props.flow.siteFindings;
  const hasDiagnostics =
    hasSitePublish ||
    diagnosticFindings.length > 0 ||
    props.flow.siteError !== undefined;

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
                    props.flow.openSiteReport(
                      undefined,
                      hasSitePublish
                        ? "publish"
                        : props.flow.siteError !== undefined ||
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
              project={project}
              validatedDomains={props.flow.validatedDomains}
              onOpenReport={(domain) =>
                props.flow.openSiteReport(domain, "publish")
              }
              latestPublish={props.flow.publishes.find(
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
              validatedDomains={props.flow.validatedDomains}
              onOpenReport={(domain) =>
                props.flow.openSiteReport(domain, "publish")
              }
              sessionPublishes={props.flow.publishes}
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
          <UpgradeBanner hasCustomDomains={hasCustomDomains} quota={quota} />
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
            quota={quota}
            restrictedFeatures={restrictedFeatures}
            flow={props.flow}
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

export const ExportContent = (props: { flow: StaticPublishUiState }) => {
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
            templates={deployTargets[deployTarget].ssgTemplates}
            flow={props.flow}
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
