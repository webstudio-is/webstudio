import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { useEffect, useId, useState, type ComponentProps } from "react";
import {
  Flex,
  InputField,
  Tooltip,
  theme,
  textVariants,
  InputErrorsTooltip,
  ToolbarButton,
  Popover,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
  IconButton,
} from "@webstudio-is/design-system";
import { CheckMarkIcon, CopyIcon, DynamicPageIcon } from "@webstudio-is/icons";
import {
  findParentFolderByChildId,
  ROOT_FOLDER_ID,
  getPagePath,
  type System,
} from "@webstudio-is/sdk";
import {
  $dataSourceVariables,
  $pages,
  $publishedUrl,
  $selectedPage,
  updateSystem,
} from "~/shared/nano-states";
import {
  compilePathnamePattern,
  isPathnamePattern,
  tokenizePathnamePattern,
} from "~/builder/shared/url-pattern";

const $selectedPagePath = computed([$selectedPage, $pages], (page, pages) => {
  if (pages === undefined || page === undefined) {
    return "/";
  }
  const parentFolder = findParentFolderByChildId(page.id, pages.folders);
  const parentFolderId = parentFolder?.id ?? ROOT_FOLDER_ID;
  const foldersPath = getPagePath(parentFolderId, pages);
  return [foldersPath, page?.path ?? ""]
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/");
});

const $selectedPagePathParams = computed(
  [$selectedPage, $dataSourceVariables],
  (selectedPage, dataSourceVariables) => {
    if (selectedPage === undefined) {
      return {};
    }
    const system = dataSourceVariables.get(selectedPage.systemDataSourceId) as
      | undefined
      | System;
    return system?.params;
  }
);

const updatePathParam = (name: string, value: string) => {
  const pathParams = $selectedPagePathParams.get();
  const path = $selectedPagePath.get();
  const tokens = tokenizePathnamePattern(path);
  // delete stale fields
  const newParams: Record<string, string> = {};
  for (const token of tokens) {
    if (token.type === "param") {
      newParams[token.name] = pathParams?.[token.name] ?? "";
    }
  }
  newParams[name] = value;
  const page = $selectedPage.get();
  if (page) {
    updateSystem(page, { params: newParams });
  }
};

const useCopyUrl = (pageUrl: string) => {
  const [copyState, setCopyState] = useState<"copy" | "copied">("copy");
  // reset copied state after 2 seconds
  useEffect(() => {
    if (copyState === "copied") {
      const timeoutId = setTimeout(() => {
        setCopyState("copy");
      }, 2000);
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [copyState]);
  let copyIcon = <CopyIcon />;
  if (copyState === "copied") {
    copyIcon = <CheckMarkIcon />;
  }
  const onClick = () => {
    navigator.clipboard.writeText(pageUrl);
    setCopyState("copied");
  };
  return {
    tooltipProps: {
      // keep tooltip open when user just copied
      open: copyState === "copied" ? true : undefined,
      content: copyState === "copied" ? "Copied" : `Copy ${pageUrl}`,
    } satisfies Partial<ComponentProps<typeof Tooltip>>,
    buttonProps: {
      onClick,
      children: copyIcon,
    } satisfies Partial<ComponentProps<"button">>,
  };
};

const AddressBar = () => {
  const id = useId();
  const publishedUrl = useStore($publishedUrl);
  const path = useStore($selectedPagePath);
  const pathParams = useStore($selectedPagePathParams);
  const tokens = tokenizePathnamePattern(path);
  const compiledPath = compilePathnamePattern(tokens, pathParams ?? {});
  const { tooltipProps, buttonProps } = useCopyUrl(
    `${publishedUrl}${compiledPath}`
  );

  const errors = new Map<string, string>();
  for (const token of tokens) {
    if (token.type === "param") {
      const value = (pathParams?.[token.name] ?? "").trim();
      if (value === "" && token.optional === false) {
        errors.set(token.name, `"${token.name}" is required`);
      }
      if (value.includes("/") && token.splat === false) {
        errors.set(
          token.name,
          `"${token.name}" should be splat parameter to contain slashes`
        );
      }
    }
  }

  return (
    <InputErrorsTooltip errors={Array.from(errors.values())}>
      <Flex gap={1} css={{ padding: theme.spacing[5] }}>
        <Flex align="center" gap={1} css={textVariants.mono}>
          {tokens.map((token, index) => {
            if (token.type === "fragment") {
              return token.value;
            }
            if (token.type === "param") {
              return (
                <InputField
                  key={index}
                  fieldSizing="content"
                  css={{ minWidth: theme.spacing[15] }}
                  color={errors.has(token.name) ? "error" : undefined}
                  id={`${id}-${token.name}`}
                  placeholder={token.name}
                  value={pathParams?.[token.name] ?? ""}
                  onChange={(event) =>
                    updatePathParam(token.name, event.target.value)
                  }
                />
              );
            }
            token satisfies never;
          })}
        </Flex>

        <Tooltip {...tooltipProps}>
          <IconButton {...buttonProps} disabled={errors.size > 0} />
        </Tooltip>
      </Flex>
    </InputErrorsTooltip>
  );
};

export const AddressBarPopover = () => {
  const [isOpen, setIsOpen] = useState(false);
  const path = useStore($selectedPagePath);
  const publishedUrl = useStore($publishedUrl);
  const { tooltipProps, buttonProps } = useCopyUrl(`${publishedUrl}${path}`);

  // show only copy button when path is static
  if (isPathnamePattern(path) === false) {
    return (
      <Tooltip {...tooltipProps}>
        <ToolbarButton
          {...buttonProps}
          aria-label="Copy page URL"
          tabIndex={0}
        />
      </Tooltip>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton aria-label="Toggle dynamic page address" tabIndex={0}>
          <DynamicPageIcon />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          css={{ zIndex: theme.zIndices[1], padding: 0 }}
          sideOffset={0}
          collisionPadding={4}
          align="start"
        >
          <AddressBar />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
