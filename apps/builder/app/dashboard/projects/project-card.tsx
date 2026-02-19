import { useEffect, useState } from "react";
import {
  css,
  Flex,
  Text,
  truncate,
  theme,
  Tooltip,
  rawTheme,
  Link,
  Box,
} from "@webstudio-is/design-system";
import { InfoCircleIcon } from "@webstudio-is/icons";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { builderUrl } from "~/shared/router-utils";
import { ProjectDialogs, type DialogType } from "./project-dialogs";
import {
  ThumbnailLinkWithAbbr,
  ThumbnailLinkWithImage,
} from "../shared/thumbnail";
import { Spinner } from "../shared/spinner";
import { Card, CardContent, CardFooter } from "../shared/card";
import type { User } from "~/shared/db/user.server";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";
import { ProjectMenu } from "./project-menu";
import { formatDate } from "./utils";

const infoIconStyle = css({ flexShrink: 0 });

const PublishedLink = ({
  domain,
  tabIndex,
}: {
  domain: string;
  tabIndex: number;
}) => {
  const publishedOrigin = `https://${domain}`;
  return (
    <Link
      href={publishedOrigin}
      target="_blank"
      rel="noreferrer"
      tabIndex={tabIndex}
      color="subtle"
      underline="hover"
      css={truncate()}
    >
      {new URL(publishedOrigin).host}
    </Link>
  );
};

type ProjectCardProps = {
  project: DashboardProject;
  userPlanFeatures: UserPlanFeatures;
  publisherHost: string;
  projectsTags: User["projectsTags"];
};

export const ProjectCard = ({
  project: {
    id,
    title,
    domain,
    isPublished,
    createdAt,
    latestBuildVirtual,
    previewImageAsset,
    tags,
    domainsVirtual,
  },
  userPlanFeatures,
  publisherHost,
  projectsTags,
  ...props
}: ProjectCardProps) => {
  // Determine which domain to display: custom domain if available, otherwise wstd subdomain
  const customDomain = domainsVirtual?.find(
    (d: { domain: string; status: string; verified: boolean }) =>
      d.status === "ACTIVE" && d.verified
  )?.domain;
  const displayDomain = customDomain ?? `${domain}.${publisherHost}`;
  const [openDialog, setOpenDialog] = useState<DialogType | undefined>();
  const [isHidden, setIsHidden] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Makes sure there are no project tags that reference deleted User tags.
  // We are not deleting project tag from project.tags when deleting User tags.
  const projectTagsIds = (tags || [])
    .map((tagId) => {
      const tag = projectsTags.find((tag) => tag.id === tagId);
      return tag ? tag.id : undefined;
    })
    .filter(Boolean) as string[];

  useEffect(() => {
    const linkPath = builderUrl({ origin: window.origin, projectId: id });

    const handleNavigate = (event: NavigateEvent) => {
      if (event.destination.url === linkPath) {
        setIsTransitioning(true);
      }
    };

    if (window.navigation === undefined) {
      return;
    }

    window.navigation.addEventListener("navigate", handleNavigate);

    return () => {
      window.navigation.removeEventListener("navigate", handleNavigate);
    };
  }, [id]);

  const linkPath = builderUrl({ origin: window.origin, projectId: id });

  return (
    <Card hidden={isHidden} {...props}>
      <CardContent
        css={{
          background: theme.colors.brandBackgroundProjectCardBack,
          [`&:hover`]: {
            "--ws-project-card-prefetch-image-background": `url(${linkPath}cgi/empty.gif)`,
          },
        }}
      >
        {/* This div with backgorundImage on card hover is used to prefetch DNS of the project domain on hover. */}
        <Box
          css={{
            backgroundImage: `var(--ws-project-card-prefetch-image-background, none)`,
            visibility: "hidden",
            position: "absolute",
            width: 1,
            height: 1,
            left: 0,
            top: 0,
            opacity: 0,
          }}
        />
        <Flex
          wrap="wrap"
          gap={1}
          css={{
            position: "absolute",
            padding: theme.panel.padding,
            bottom: 0,
            zIndex: 1,
          }}
        >
          {projectsTags.map((tag) => {
            const isApplied = projectTagsIds.includes(tag.id);
            if (isApplied) {
              return (
                <Text
                  color="contrast"
                  key={tag.id}
                  css={{
                    background: "oklch(0 0 0 / 0.3)",
                    borderRadius: theme.borderRadius[3],
                    paddingInline: theme.spacing[3],
                  }}
                >{`#${tag.label}`}</Text>
              );
            }
          })}
        </Flex>
        {previewImageAsset ? (
          <ThumbnailLinkWithImage to={linkPath} name={previewImageAsset.name} />
        ) : (
          <ThumbnailLinkWithAbbr title={title} to={linkPath} />
        )}
        {isTransitioning && <Spinner delay={0} />}
      </CardContent>
      <CardFooter>
        <Flex direction="column" justify="around" grow>
          <Flex gap="1">
            <Text
              variant="titles"
              userSelect="text"
              truncate
              css={{ textTransform: "none" }}
            >
              {title}
            </Text>
            <Tooltip
              variant="wrapped"
              content={
                <Text variant="small">
                  Created: {formatDate(createdAt)}
                  {latestBuildVirtual?.updatedAt && (
                    <>
                      <br />
                      Last modified: {formatDate(latestBuildVirtual.updatedAt)}
                    </>
                  )}
                  <br />
                  {isPublished && latestBuildVirtual ? (
                    <>Published: {formatDate(latestBuildVirtual.createdAt)}</>
                  ) : (
                    <>Not published</>
                  )}
                </Text>
              }
            >
              <InfoCircleIcon
                color={rawTheme.colors.foregroundSubtle}
                tabIndex={-1}
                className={infoIconStyle()}
              />
            </Tooltip>
          </Flex>
          {isPublished ? (
            <PublishedLink domain={displayDomain} tabIndex={-1} />
          ) : (
            <Text color="subtle">Not published</Text>
          )}
        </Flex>
        <ProjectMenu projectId={id} onOpenChange={setOpenDialog} />
      </CardFooter>
      <ProjectDialogs
        projectId={id}
        title={title}
        tags={tags}
        openDialog={openDialog}
        onOpenDialogChange={setOpenDialog}
        onHiddenChange={setIsHidden}
        userPlanFeatures={userPlanFeatures}
        projectsTags={projectsTags}
      />
    </Card>
  );
};
