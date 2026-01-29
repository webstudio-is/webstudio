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
  Button,
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
  PanelBanner,
  buttonStyle,
  toast,
  RadioGroup,
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
  $awareness,
  $selectedPagePath,
  findAwarenessByInstanceId,
  type Awareness,
} from "~/shared/awareness";
import {
  $authTokenPermissions,
  $dataSources,
  $editingPageId,
  $instances,
  $pages,
  $project,
  $publishedOrigin,
  $userPlanFeatures,
  $stagingUsername,
  $stagingPassword,
  $publisherHost,
} from "~/shared/nano-states";
import {
  $publishDialog,
  setActiveSidebarPanel,
} from "../../shared/nano-states";
import { Domains, PENDING_TIMEOUT, getPublishStatusAndText } from "./domains";
import { CollapsibleDomainSection } from "./collapsible-domain-section";
import {
  CheckCircleIcon,
  AlertIcon,
  CopyIcon,
  GearIcon,
  UpgradeIcon,
  HelpIcon,
  InfoCircleIcon,
} from "@webstudio-is/icons";
import { AddDomain } from "./add-domain";
import { humanizeString } from "~/shared/string-utils";
import { trpcClient, nativeClient } from "~/shared/trpc/trpc-client";
import { isPathnamePattern, type Templates } from "@webstudio-is/sdk";
import { DomainCheckbox, domainToPublishName } from "./domain-checkbox";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import { $openProjectSettings } from "~/shared/nano-states/project-settings";
import { RelativeTime } from "~/builder/shared/relative-time";
import cmsUpgradeBanner from "~/shared/cms-upgrade-banner.svg?url";

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
  const publishedOrigin = useStore($publishedOrigin);
  const selectedPagePath = useStore($selectedPagePath);
  const stagingUsername = useStore($stagingUsername);
  const stagingPassword = useStore($stagingPassword);
  const publisherHost = useStore($publisherHost);

  const [domain, setDomain] = useState(project.domain);
  const [error, setError] = useState<string>();
  const [isUpdateInProgress, setIsUpdateInProgress] = useOptimistic(false);
  const [isUnpublishing, setIsUnpublishing] = useOptimistic(false);

  const pageUrl = new URL(publishedOrigin);
  pageUrl.pathname = selectedPagePath;

  // Add username:password@ for staging domains
  if (
    stagingUsername &&
    stagingPassword &&
    pageUrl.hostname.endsWith(`.${publisherHost}`)
  ) {
    pageUrl.username = stagingUsername;
    pageUrl.password = stagingPassword;
  }

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

  const { statusText, status } =
    project.latestBuildVirtual != null
      ? getPublishStatusAndText(project.latestBuildVirtual)
      : {
          statusText: "Not published",
          status: "PENDING" as const,
        };

  // Check if the wstd domain specifically is published (not just any custom domain)
  const isPublished = project.latestBuildVirtual?.domain === project.domain;

  return (
    <CollapsibleDomainSection
      title={pageUrl.host}
      prefix={
        <DomainCheckbox
          defaultChecked={project.latestBuildVirtual?.domain === domain}
          buildId={project.latestBuildVirtual?.buildId}
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
                  error !== undefined || status === "FAILED"
                    ? theme.colors.foregroundDestructive
                    : theme.colors.foregroundSuccessText,
              }}
            >
              {error !== undefined || status === "FAILED" ? (
                <AlertIcon />
              ) : (
                <CheckCircleIcon />
              )}
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
                color={rawTheme.colors.foregroundSubtle}
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
                  color={rawTheme.colors.foregroundSubtle}
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
  [$pages, $dataSources, $instances, $userPlanFeatures],
  (pages, dataSources, instances, userPlanFeatures) => {
    const features = new Map<
      string,
      | undefined
      | { awareness?: Awareness; view?: "pageSettings"; info?: ReactNode }
    >();
    if (pages === undefined) {
      return features;
    }
    // specified emails for default webhook form
    if (
      userPlanFeatures.maxContactEmails === 0 &&
      (pages?.meta?.contactEmail ?? "").trim()
    ) {
      features.set("Custom contact email", undefined);
    }
    if (!userPlanFeatures.allowDynamicData) {
      // pages with dynamic paths
      for (const page of [pages.homePage, ...pages.pages]) {
        const awareness = {
          pageId: page.id,
          instanceSelector: [page.rootInstanceId],
        };
        // allow catch all for 404 pages on free plan
        if (isPathnamePattern(page.path) && page.path !== "/*") {
          features.set("Dynamic path", { awareness, view: "pageSettings" });
        }
        if (page.meta.redirect && page.meta.redirect !== `""`) {
          features.set("Redirect", { awareness, view: "pageSettings" });
        }
      }
      // has resource variables
      for (const dataSource of dataSources.values()) {
        if (dataSource.type === "resource") {
          const instanceId = dataSource.scopeInstanceId ?? "";
          features.set("Resource variable", {
            awareness: findAwarenessByInstanceId(pages, instances, instanceId),
          });
        }
      }
    }
    return features;
  }
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
}: {
  project: Project;
  timesLeft: number;
  disabled: boolean;
  refresh: () => Promise<void>;
}) => {
  const { maxPublishesAllowedPerUser } = useStore($userPlanFeatures);
  const [publishError, setPublishError] = useState<
    undefined | JSX.Element | string
  >();
  const [isPublishing, setIsPublishing] = useOptimistic(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [hasSelectedDomains, setHasSelectedDomains] = useState(false);
  const userPlanFeatures = useStore($userPlanFeatures);
  const hasPaidPlan = userPlanFeatures.purchases.length > 0;
  const { allowStagingPublish } = userPlanFeatures;
  const countdown = usePublishCountdown(isPublishing);

  useEffect(() => {
    if (allowStagingPublish === false) {
      setHasSelectedDomains(true);
      return;
    }
    const form = buttonRef.current?.closest("form");

    if (form == null) {
      return;
    }

    const handleFormInput = () => {
      const formData = new FormData(form);
      const domainsSelected = formData.getAll(domainToPublishName).length;
      setHasSelectedDomains(domainsSelected > 0);
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
  }, [allowStagingPublish]);

  const handlePublish = async (formData: FormData) => {
    setPublishError(undefined);
    setIsPublishing(true);

    const domains = allowStagingPublish
      ? formData
          .getAll(domainToPublishName)
          .map((domainEntry) => domainEntry.toString())
      : [
          project.domain,
          ...project.domainsVirtual
            .filter((domain) => domain.verified && domain.status === "ACTIVE")
            .map((domain) => domain.domain),
        ];

    if (domains.length === 0) {
      toast.error("Please select at least one domain to publish");
      return;
    }

    const publishResult = await nativeClient.domain.publish.mutate({
      projectId: project.id,
      domains,
      destination: "saas",
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
            {hasPaidPlan === false && (
              <div>
                On the free plan, you have {timesLeft} out of{" "}
                {maxPublishesAllowedPerUser} daily publications remaining. The
                counter resets tomorrow.
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

  const hasPendingState = project.latestBuildVirtual
    ? getPublishStatusAndText(project.latestBuildVirtual).status === "PENDING"
    : false;

  const isPublishInProgress = isPublishing || hasPendingState;
  const showPendingState =
    isPublishInProgress && (countdown === undefined || countdown === 0);

  return (
    <Flex gap={2} shrink={false} direction={"column"}>
      {publishError && <Text color="destructive">{publishError}</Text>}

      <Tooltip
        content={
          isPublishInProgress
            ? "Publish process in progress"
            : hasSelectedDomains
              ? undefined
              : "Select at least one domain to publish"
        }
      >
        <Button
          ref={buttonRef}
          formAction={handlePublish}
          color="positive"
          state={showPendingState ? "pending" : undefined}
          disabled={hasSelectedDomains === false || disabled}
        >
          {countdown !== undefined && countdown > 0
            ? `Publishing (${countdown}s)`
            : "Publish"}
        </Button>
      </Tooltip>
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
      {status === "FAILED" && <Text color="destructive">{statusText}</Text>}

      <Tooltip
        content={isPublishInProgress ? "Preparing static site" : undefined}
      >
        <Button
          type="button"
          color="positive"
          state={isPublishInProgress ? "pending" : undefined}
          onClick={() => {
            startTransition(async () => {
              try {
                setIsPendingOptimistic(true);

                const result = await nativeClient.domain.publish.mutate({
                  projectId,
                  destination: "static",
                  templates: [...templates],
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
  const { maxDomainsAllowedPerUser } = useStore($userPlanFeatures);
  const project = useStore($project);
  const activeDomainsCount = project?.domainsVirtual.filter(
    (domain) => domain.status === "ACTIVE" && domain.verified
  ).length;
  useEffect(() => {
    load();
  }, [load, activeDomainsCount]);
  const canAddDomain = data
    ? data.success && data.data < maxDomainsAllowedPerUser
    : true;
  return { canAddDomain, maxDomainsAllowedPerUser };
};

const useUserPublishCount = () => {
  const { load, data } = trpcClient.project.userPublishCount.useQuery();
  const { maxPublishesAllowedPerUser } = useStore($userPlanFeatures);
  useEffect(() => {
    load();
  }, [load]);
  return {
    userPublishCount: data?.success ? data.data : 0,
    maxPublishesAllowedPerUser,
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

const UpgradeBanner = () => {
  const restrictedFeatures = useStore($restrictedFeatures);
  const { canAddDomain } = useCanAddDomain();
  const { userPublishCount, maxPublishesAllowedPerUser } =
    useUserPublishCount();

  if (userPublishCount >= maxPublishesAllowedPerUser) {
    return (
      <PanelBanner>
        <Text variant="regularBold">
          Upgrade to publish more than {maxPublishesAllowedPerUser} times per
          day:
        </Text>
        <Link
          className={buttonStyle({ color: "gradient" })}
          color="contrast"
          underline="none"
          href="https://webstudio.is/pricing"
          target="_blank"
        >
          Upgrade
        </Link>
      </PanelBanner>
    );
  }

  if (restrictedFeatures.size > 0) {
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
            ([message, { awareness, view, info } = {}], index) => (
              <li key={index}>
                <Flex align="center" gap="1">
                  {awareness ? (
                    <button
                      className={buttonLinkClass}
                      type="button"
                      onClick={() => {
                        $awareness.set(awareness);
                        if (view === "pageSettings") {
                          setActiveSidebarPanel("pages");
                          $editingPageId.set(awareness.pageId);
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
        <Text>You can delete these features or upgrade.</Text>
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
}) => {
  const restrictedFeatures = useStore($restrictedFeatures);
  const [newDomains, setNewDomains] = useState(new Set<string>());

  const project = useStore($project);

  if (project == null) {
    throw new Error("Project not found");
  }
  const projectState = "idle";

  const { userPublishCount, maxPublishesAllowedPerUser } =
    useUserPublishCount();

  return (
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
      <Flex direction="column" gap="2" css={{ padding: theme.panel.padding }}>
        <AddDomain
          projectId={props.projectId}
          refresh={refreshProject}
          onCreate={(domain) => {
            setNewDomains((prev) => {
              return new Set([...prev, domain]);
            });
          }}
          onExportClick={props.onExportClick}
        />
        <UpgradeBanner />
        <Publish
          project={project}
          refresh={refreshProject}
          timesLeft={maxPublishesAllowedPerUser - userPublishCount}
          disabled={
            restrictedFeatures.size > 0 ||
            userPublishCount >= maxPublishesAllowedPerUser
          }
        />
      </Flex>
    </form>
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
    <Grid columns={1} gap={3} css={{ padding: theme.panel.padding }}>
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
                <Button type="button" color="neutral" prefix={<CopyIcon />}>
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
                  color="neutral"
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
    </Grid>
  );
};

type PublishProps = {
  projectId: Project["id"];
};

export const PublishButton = ({ projectId }: PublishProps) => {
  const publishDialog = useStore($publishDialog);
  const authTokenPermissions = useStore($authTokenPermissions);
  const isPublishEnabled = authTokenPermissions.canPublish;

  const tooltipContent = isPublishEnabled
    ? undefined
    : "Only the owner, an admin, or content editors with publish permissions can publish projects";

  const handleExportClick = () => {
    $publishDialog.set("export");
  };

  const handleOpenChange = (isOpen: boolean) => {
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
          <Button
            type="button"
            disabled={isPublishEnabled === false}
            color="positive"
          >
            Publish
          </Button>
        </PopoverTrigger>
      </Tooltip>

      <PopoverContent
        sideOffset={Number.parseFloat(rawTheme.spacing[8])}
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
          <>
            <PopoverTitle
              suffix={
                <PopoverTitleActions>
                  <IconButton
                    type="button"
                    onClick={() => {
                      $openProjectSettings.set("publish");
                    }}
                  >
                    <GearIcon />
                  </IconButton>
                  <PopoverClose />
                </PopoverTitleActions>
              }
            >
              Publish
            </PopoverTitle>
            <Content projectId={projectId} onExportClick={handleExportClick} />
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
