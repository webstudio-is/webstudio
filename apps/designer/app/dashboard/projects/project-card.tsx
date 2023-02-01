import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  IconButton,
  css,
  Flex,
  DeprecatedText2,
  theme,
} from "@webstudio-is/design-system";
import { MenuIcon } from "@webstudio-is/icons";
import type { DashboardProject } from "@webstudio-is/prisma-client";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { designerPath, getPublishedUrl } from "~/shared/router-utils";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { RenameProject, DeleteProject, useDuplicate } from "./project-dialogs";
import { ThumbnailLink } from "./thumbnail-link";

const containerStyle = css({
  overflow: "hidden",
  width: theme.spacing[31],
  height: theme.spacing[29],
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.colors.borderMain,
  borderRadius: theme.borderRadius[4],
  background: theme.colors.brandBackgroundProjectCardBack,
  "&:hover, &:focus-within": {
    boxShadow: theme.shadows.brandElevationBig,
  },
});

const footerStyle = css({
  background: theme.colors.brandBackgroundProjectCardTextArea,
  height: theme.spacing[17],
  py: theme.spacing[5],
  px: theme.spacing[7],
});

const usePublishedLink = ({ domain }: { domain: string }) => {
  const [url, setUrl] = useState<URL>();

  useEffect(() => {
    // It uses `window.location` to detect the default values when running locally localhost,
    // so it needs an effect to avoid hydration errors.
    setUrl(new URL(getPublishedUrl(domain)));
  }, [domain]);

  return { url };
};

const PublishedLink = ({
  domain,
  tabIndex,
}: {
  domain: string;
  tabIndex: number;
}) => {
  const { url } = usePublishedLink({ domain });
  return (
    <DeprecatedText2
      as="a"
      href={url?.href}
      target="_blank"
      truncate
      color="hint"
      tabIndex={tabIndex}
      css={{
        "&:not(:hover)": {
          textDecoration: "none",
        },
      }}
    >
      {url?.host}
    </DeprecatedText2>
  );
};

const Menu = ({
  tabIndex,
  onDelete,
  onRename,
  onDuplicate,
}: {
  tabIndex: number;
  onDelete: () => void;
  onRename: () => void;
  onDuplicate: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <IconButton
          variant={isOpen ? "active" : "default"}
          aria-label="Menu Button"
          tabIndex={tabIndex}
          css={{ alignSelf: "center" }}
        >
          <MenuIcon width={15} height={15} />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onDuplicate}>Duplicate</DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
        {isFeatureEnabled("share2") && (
          <DropdownMenuItem>Share</DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onDelete}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const useProjectCard = () => {
  const thumbnailRef = useRef<HTMLAnchorElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const elements: Array<HTMLElement> = Array.from(
      event.currentTarget.querySelectorAll(`[tabIndex='-1']`)
    );
    const currentIndex = elements.indexOf(
      document.activeElement as HTMLElement
    );
    switch (event.key) {
      case "Enter": {
        // Only open project on enter when the project card container was focused,
        // otherwise we will always open project, even when a menu was pressed.
        if (event.currentTarget === document.activeElement) {
          thumbnailRef.current?.click();
        }
        break;
      }
      case "ArrowUp":
      case "ArrowRight": {
        const nextElement = elements.at(currentIndex + 1) ?? elements[0];
        nextElement?.focus();
        break;
      }
      case "ArrowDown":
      case "ArrowLeft": {
        const nextElement = elements.at(currentIndex - 1) ?? elements[0];
        nextElement?.focus();
        break;
      }
    }
  };

  return {
    thumbnailRef,
    handleKeyDown,
  };
};

type ProjectCardProps = Pick<
  DashboardProject,
  "id" | "title" | "domain" | "isPublished"
>;

export const ProjectCard = ({
  id,
  title,
  domain,
  isPublished,
}: ProjectCardProps) => {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { thumbnailRef, handleKeyDown } = useProjectCard();
  const handleDuplicate = useDuplicate(id);

  return (
    <>
      <Flex
        direction="column"
        shrink={false}
        as="article"
        className={containerStyle()}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <ThumbnailLink
          title={title}
          to={designerPath({ projectId: id })}
          ref={thumbnailRef}
        />
        <Flex
          justify="between"
          shrink={false}
          gap="1"
          className={footerStyle()}
        >
          <Flex direction="column" justify="around">
            <DeprecatedText2 variant="title" truncate>
              {title}
            </DeprecatedText2>
            {isPublished ? (
              <PublishedLink domain={domain} tabIndex={-1} />
            ) : (
              <DeprecatedText2 color="hint">Not Published</DeprecatedText2>
            )}
          </Flex>
          <Menu
            tabIndex={-1}
            onDelete={() => {
              setIsDeleteDialogOpen(true);
            }}
            onRename={() => {
              setIsRenameDialogOpen(true);
            }}
            onDuplicate={handleDuplicate}
          />
        </Flex>
      </Flex>
      <RenameProject
        isOpen={isRenameDialogOpen}
        title={title}
        projectId={id}
        onComplete={() => {
          setIsRenameDialogOpen(false);
        }}
        onOpenChange={setIsRenameDialogOpen}
      />
      <DeleteProject
        isOpen={isDeleteDialogOpen}
        title={title}
        projectId={id}
        onComplete={() => {
          setIsDeleteDialogOpen(false);
        }}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </>
  );
};
