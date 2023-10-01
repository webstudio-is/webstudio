import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  Button,
  useId,
  Tooltip,
  FloatingPanelPopover,
  FloatingPanelAnchor,
  FloatingPanelPopoverTrigger,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
  IconButton,
  Grid,
  Flex,
  Label,
  Text,
  InputField,
  Separator,
  ScrollArea,
  Box,
  rawTheme,
  styled,
  Select,
  theme,
  TextArea,
} from "@webstudio-is/design-system";
import stripIndent from "strip-indent";
import { useIsPublishDialogOpen } from "../../shared/nano-states";
import { validateProjectDomain, type Project } from "@webstudio-is/project";
import { getPublishedUrl } from "~/shared/router-utils";
import { $authPermit } from "~/shared/nano-states";
import {
  Domains,
  getPublishStatusAndText,
  getStatus,
  type Domain,
  PENDING_TIMEOUT,
} from "./domains";
import { CollapsibleDomainSection } from "./collapsible-domain-section";
import {
  CheckCircleIcon,
  ExternalLinkIcon,
  AlertIcon,
  CopyIcon,
} from "@webstudio-is/icons";
import { createTrpcFetchProxy } from "~/shared/remix/trpc-remix-proxy";
import { builderDomainsPath } from "~/shared/router-utils";
import type { DomainRouter } from "@webstudio-is/domain/index.server";
import { AddDomain } from "./add-domain";
import { humanizeString } from "~/shared/string-utils";

const trpc = createTrpcFetchProxy<DomainRouter>(builderDomainsPath);

type ProjectData =
  | {
      success: true;
      project: Project;
    }
  | {
      success: false;
      error: string;
    };

type ChangeProjectDomainProps = {
  project: Project;
  projectState: "idle" | "submitting";
  isPublishing: boolean;
  projectLoad: (
    props: { projectId: Project["id"] },
    callback: (projectData: ProjectData) => void
  ) => void;
};

type TimeoutId = undefined | ReturnType<typeof setTimeout>;

const ChangeProjectDomain = ({
  project,
  projectLoad,
  projectState,
  isPublishing,
}: ChangeProjectDomainProps) => {
  const id = useId();

  const {
    send: updateProjectDomain,
    state: updateProjectDomainState,
    error: updateProjectSystemError,
  } = trpc.updateProjectDomain.useMutation();

  const [domain, setDomain] = useState(project.domain);
  const [error, setError] = useState<string>();

  const refreshProject = useCallback(
    () =>
      projectLoad({ projectId: project.id }, (projectData) => {
        if (projectData?.success === false) {
          setError(projectData.error);
          return;
        }

        setDomain(projectData.project.domain);
      }),
    [projectLoad, project.id]
  );

  useEffect(() => {
    refreshProject();
  }, [refreshProject]);

  const publishedUrl = new URL(getPublishedUrl(project.domain));

  const handleUpdateProjectDomain = () => {
    const validationResult = validateProjectDomain(domain);

    if (validationResult.success === false) {
      setError(validationResult.error);
      return;
    }

    if (updateProjectDomainState !== "idle") {
      return;
    }
    if (domain === project.domain) {
      return;
    }

    updateProjectDomain({ domain, projectId: project.id }, (data) => {
      if (data?.success === false) {
        setError(data.error);
        return;
      }

      refreshProject();
    });
  };

  const { statusText, status } =
    project.latestBuild != null
      ? getPublishStatusAndText(project.latestBuild)
      : {
          statusText: "Not published",
          status: "PENDING",
        };

  return (
    <CollapsibleDomainSection
      title={publishedUrl.host}
      suffix={
        <Grid flow="column">
          <Tooltip content={error !== undefined ? error : statusText}>
            <Flex
              align={"center"}
              justify={"center"}
              css={{
                cursor: "pointer",
                width: theme.spacing[12],
                height: theme.spacing[12],
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

          <Tooltip content={`Proceed to ${publishedUrl.href}`}>
            <IconButton
              tabIndex={-1}
              onClick={(event) => {
                window.open(publishedUrl.href, "_blank");
                event.preventDefault();
              }}
            >
              <ExternalLinkIcon />
            </IconButton>
          </Tooltip>
        </Grid>
      }
    >
      <Grid gap={3}>
        <Grid gap={1}>
          <Label htmlFor={id}>Domain:</Label>
          <InputField
            id={id}
            placeholder="Domain"
            value={domain}
            disabled={
              isPublishing ||
              updateProjectDomainState !== "idle" ||
              projectState !== "idle"
            }
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
            color={
              error !== undefined || updateProjectSystemError !== undefined
                ? "error"
                : undefined
            }
          />
          {error !== undefined && <Text color="destructive">{error}</Text>}
          {updateProjectSystemError !== undefined && (
            <Text color="destructive">{updateProjectSystemError}</Text>
          )}
        </Grid>
      </Grid>
    </CollapsibleDomainSection>
  );
};

const Publish = ({
  project,
  domainsToPublish,
  refresh,

  isPublishing,
  setIsPublishing,
}: {
  project: Project;
  domainsToPublish: Domain[];
  refresh: () => void;

  isPublishing: boolean;
  setIsPublishing: (isPublishing: boolean) => void;
}) => {
  const {
    send: publish,
    state: publishState,
    data: publishData,
    error: publishSystemError,
  } = trpc.publish.useMutation();

  useEffect(() => {
    if (isPublishing) {
      let timeoutHandle: TimeoutId;
      let totalCalls = 0;
      const timeout = 10000;
      // Repeat few more times than timeout
      const repeat = PENDING_TIMEOUT / timeout + 5;

      // Call refresh
      const execRefresh = () => {
        if (totalCalls < repeat) {
          totalCalls += 1;
          clearTimeout(timeoutHandle);
          timeoutHandle = setTimeout(() => {
            refresh();
            execRefresh();
          }, timeout);
        }
      };

      execRefresh();

      return () => {
        clearTimeout(timeoutHandle);
      };
    }
  }, [isPublishing, refresh]);

  const isPublishInProgress = publishState !== "idle" || isPublishing;

  return (
    <Flex
      css={{
        paddingLeft: theme.spacing[9],
        paddingRight: theme.spacing[9],
        paddingBottom: theme.spacing[9],
        paddingTop: theme.spacing[5],
      }}
      gap={2}
      shrink={false}
      direction={"column"}
    >
      {publishSystemError !== undefined && (
        <Text color="destructive">{publishSystemError}</Text>
      )}

      {publishData?.success === false && (
        <Text color="destructive">{publishData.error}</Text>
      )}

      <Tooltip
        content={
          isPublishInProgress ? "Publish process in progress" : undefined
        }
      >
        <Button
          color="positive"
          state={isPublishInProgress ? "pending" : undefined}
          onClick={() => {
            setIsPublishing(true);

            publish(
              {
                projectId: project.id,
                domains: domainsToPublish.map(
                  (projectDomain) => projectDomain.domain.domain
                ),
              },
              () => {
                refresh();
              }
            );
          }}
        >
          Publish
        </Button>
      </Tooltip>
    </Flex>
  );
};

const ErrorText = ({ children }: { children: string }) => (
  <Flex
    css={{
      m: theme.spacing[9],
      overflowWrap: "anywhere",
    }}
    gap={2}
    direction={"column"}
  >
    <Text color="destructive">{children}</Text>
    <Text color="subtle">Please try again later</Text>
  </Flex>
);

const Content = (props: {
  projectId: Project["id"];
  onExportClick: () => void;
}) => {
  const [newDomains, setNewDomains] = useState(new Set<string>());
  const {
    data: domainsResult,
    load: domainRefresh,
    state: domainState,
    error: domainSystemError,
  } = trpc.findMany.useQuery();

  const {
    load: projectLoad,
    data: projectData,
    state: projectState,
    error: projectSystemError,
  } = trpc.project.useQuery();

  useEffect(() => {
    projectLoad({ projectId: props.projectId });
    domainRefresh({ projectId: props.projectId });
  }, [domainRefresh, props.projectId, projectLoad]);

  const domainsToPublish = useMemo(
    () =>
      domainsResult?.success
        ? domainsResult.data.filter(
            (projectDomain) => getStatus(projectDomain) === "VERIFIED_ACTIVE"
          )
        : [],
    [domainsResult]
  );

  const latestBuilds = useMemo(
    () => [
      projectData?.success ? projectData.project.latestBuild ?? null : null,
      ...domainsToPublish.map((domain) => domain.latestBuid),
    ],
    [domainsToPublish, projectData]
  );

  const hasPendingState = useMemo(
    () =>
      latestBuilds.some((latestBuild) => {
        if (latestBuild === null) {
          return false;
        }
        const { status } = getPublishStatusAndText(latestBuild);
        if (status === "PENDING") {
          return true;
        }
      }),
    [latestBuilds]
  );

  const [isPublishing, setIsPublishing] = useState(hasPendingState);

  useEffect(() => {
    setIsPublishing(hasPendingState);
  }, [hasPendingState, setIsPublishing]);

  return (
    <>
      <ScrollArea>
        {projectSystemError !== undefined && (
          <ErrorText>{projectSystemError}</ErrorText>
        )}

        {projectData?.success && (
          <ChangeProjectDomain
            projectLoad={projectLoad}
            projectState={projectState}
            project={projectData.project}
            isPublishing={isPublishing}
          />
        )}

        {domainsResult?.success === true && (
          <Domains
            newDomains={newDomains}
            domains={domainsResult.data}
            refreshDomainResult={domainRefresh}
            domainState={domainState}
            isPublishing={isPublishing}
          />
        )}

        {domainSystemError !== undefined && (
          <ErrorText>{domainSystemError}</ErrorText>
        )}

        {domainsResult?.success === false && (
          <ErrorText>{domainsResult.error}</ErrorText>
        )}
      </ScrollArea>

      <Flex direction="column" justify="end" css={{ height: 0 }}>
        <Separator />
      </Flex>

      <AddDomain
        projectId={props.projectId}
        refreshDomainResult={domainRefresh}
        domainState={domainState}
        onCreate={(domain) => {
          setNewDomains((prev) => {
            return new Set([...prev, domain]);
          });
        }}
        isPublishing={isPublishing}
        onExportClick={props.onExportClick}
      />

      {projectData?.success === true ? (
        <Publish
          project={projectData.project}
          domainsToPublish={domainsToPublish}
          refresh={() => {
            projectLoad({ projectId: props.projectId });
            domainRefresh({ projectId: props.projectId });
          }}
          isPublishing={isPublishing}
          setIsPublishing={setIsPublishing}
        />
      ) : (
        <Box css={{ height: theme.spacing[8] }} />
      )}
    </>
  );
};

/**
 * @todo change colors on theme colors when tokens will be ready
 * https://discord.com/channels/955905230107738152/1149380442315825212/1149408306671128666
 **/
const StyledLink = styled("a", {
  color: "#006ADC", // @todo theme.colors.foregroundLink,
  "&:visited": {
    color: "#793AAF", // @todo theme.colors.foregroundLinkVisited,
  },
});

const deployTargets = {
  vercel: {
    command: "npx vercel",
    docs: "https://vercel.com/docs/cli",
  },
  netlify: {
    command: `
npx netlify-cli login
npx netlify-cli sites:create
npx netlify-cli build
npx netlify-cli deploy`,
    docs: "https://docs.netlify.com/cli/get-started/",
  },
} as const;

type DeployTargets = keyof typeof deployTargets;

const isDeployTargets = (value: string): value is DeployTargets =>
  Object.keys(deployTargets).includes(value);

const ExportContent = () => {
  const npxCommand = "npx webstudio-cli";
  const [deployTarget, setDeployTarget] = useState<DeployTargets>("vercel");

  return (
    <Grid
      columns={1}
      gap={3}
      css={{
        margin: theme.spacing[9],
        marginTop: theme.spacing[5],
      }}
    >
      <Grid columns={1} gap={1}>
        <Text color="main" variant="labelsTitleCase">
          Step 1
        </Text>
        <Text color="subtle">
          Download and install Node v18+ from{" "}
          <StyledLink
            href="https://nodejs.org/"
            target="_blank"
            rel="noreferrer"
          >
            nodejs.org
          </StyledLink>{" "}
          or with{" "}
          <StyledLink
            href="https://nodejs.org/en/download/package-manager"
            target="_blank"
            rel="noreferrer"
          >
            a package manager
          </StyledLink>
          .
        </Text>
      </Grid>

      <Grid columns={1} gap={2}>
        <Grid columns={1} gap={1}>
          <Text color="main" variant="labelsTitleCase">
            Step 2
          </Text>
          <Text color="subtle">
            Run this command in your Terminal to install Webstudio CLI and sync
            your project.
          </Text>
        </Grid>

        <Flex gap={2}>
          <InputField css={{ flex: 1 }} readOnly value={npxCommand} />

          <Tooltip content={"Copy to clipboard"}>
            <Button
              color="neutral"
              onClick={() => {
                navigator.clipboard.writeText(npxCommand);
              }}
              prefix={<CopyIcon />}
            >
              Copy
            </Button>
          </Tooltip>
        </Flex>
      </Grid>
      <Grid columns={1} gap={2}>
        <Grid columns={1} gap={1}>
          <Text color="main" variant="labelsTitleCase">
            Step 3
          </Text>
          <Text color="subtle">
            Run this command to publish to{" "}
            <StyledLink
              href={deployTargets[deployTarget].docs}
              target="_blank"
              rel="noreferrer"
            >
              {humanizeString(deployTarget)}
            </StyledLink>{" "}
          </Text>
        </Grid>

        <Select
          fullWidth
          css={{ zIndex: theme.zIndices[2] }}
          value={deployTarget}
          options={Object.keys(deployTargets)}
          getLabel={(value) => humanizeString(value)}
          onChange={(value) => {
            if (isDeployTargets(value)) {
              setDeployTarget(value);
            }
          }}
        />

        <Flex gap={2} align="end">
          <TextArea
            css={{ flex: 1 }}
            readOnly
            value={stripIndent(deployTargets[deployTarget].command)
              .trimStart()
              .replace(/ +$/, "")}
          />
          <Tooltip content={"Copy to clipboard"}>
            <Button
              color="neutral"
              onClick={() => {
                navigator.clipboard.writeText(
                  deployTargets[deployTarget].command
                );
              }}
              prefix={<CopyIcon />}
            >
              Copy
            </Button>
          </Tooltip>
        </Flex>
      </Grid>
      <Grid columns={1} gap={1}>
        <Text color="subtle">
          Read the detailed documentation{" "}
          <StyledLink
            href="https://github.com/webstudio-is/webstudio/tree/main/packages/cli"
            target="_blank"
            rel="noreferrer"
          >
            here
          </StyledLink>
        </Text>
      </Grid>
    </Grid>
  );
};

type PublishProps = {
  projectId: Project["id"];
};

export const PublishButton = ({ projectId }: PublishProps) => {
  const [isOpen, setIsOpen] = useIsPublishDialogOpen();
  const authPermit = useStore($authPermit);
  const [dialogContentType, setDialogContentType] = useState<
    "publish" | "export"
  >("publish");

  const isPublishEnabled = authPermit === "own" || authPermit === "admin";

  const tooltipContent = isPublishEnabled
    ? undefined
    : "Only owner or admin can publish projects";

  const handleExportClick = () => {
    setDialogContentType("export");
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen === false) {
      setDialogContentType("publish");
    }
    setIsOpen(isOpen);
  };

  return (
    <FloatingPanelPopover modal open={isOpen} onOpenChange={handleOpenChange}>
      <FloatingPanelAnchor>
        <Tooltip side="bottom" content={tooltipContent}>
          <FloatingPanelPopoverTrigger asChild>
            <Button disabled={isPublishEnabled === false} color="positive">
              Publish
            </Button>
          </FloatingPanelPopoverTrigger>
        </Tooltip>
      </FloatingPanelAnchor>

      <FloatingPanelPopoverContent
        sideOffset={parseFloat(rawTheme.spacing[8])}
        css={{
          zIndex: theme.zIndices[1],
          width: theme.spacing[33],
          maxWidth: theme.spacing[33],
          marginRight: theme.spacing[3],
        }}
      >
        {dialogContentType === "export" && (
          <>
            <FloatingPanelPopoverTitle>Export</FloatingPanelPopoverTitle>
            <ExportContent />
          </>
        )}

        {dialogContentType === "publish" && (
          <>
            <FloatingPanelPopoverTitle>Publish</FloatingPanelPopoverTitle>
            <Content projectId={projectId} onExportClick={handleExportClick} />
          </>
        )}
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};
