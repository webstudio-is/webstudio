import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
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
  $publishedOrigin,
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

const AddressBar = forwardRef<HTMLFormElement, unknown>((_props, ref) => {
  const publishedOrigin = useStore($publishedOrigin);
  const path = useStore($selectedPagePath);
  const [pathParams, setPathParams] = useState(
    () => $selectedPagePathParams.get() ?? {}
  );
  const tokens = tokenizePathnamePattern(path);
  const compiledPath = compilePathnamePattern(tokens, pathParams);
  const { tooltipProps, buttonProps } = useCopyUrl(
    `${publishedOrigin}${compiledPath}`
  );

  const errors = new Map<string, string>();
  for (const token of tokens) {
    if (token.type === "param") {
      const value = (pathParams[token.name] ?? "").trim();
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
    <form
      ref={ref}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const path = $selectedPagePath.get();
        const tokens = tokenizePathnamePattern(path);
        // delete stale fields
        const newParams: Record<string, string> = {};
        for (const token of tokens) {
          if (token.type === "param") {
            newParams[token.name] = String(formData.get(token.name) ?? "");
          }
        }
        const page = $selectedPage.get();
        if (page) {
          updateSystem(page, { params: newParams });
        }
      }}
    >
      {/* submit is not triggered when press enter on input without submit button */}
      <button style={{ display: "none" }}>submit</button>
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
                    name={token.name}
                    fieldSizing="content"
                    css={{ minWidth: theme.spacing[15] }}
                    color={errors.has(token.name) ? "error" : undefined}
                    placeholder={token.name}
                    value={pathParams[token.name] ?? ""}
                    onChange={(event) =>
                      setPathParams((prevPathParams) => ({
                        ...prevPathParams,
                        [token.name]: event.target.value,
                      }))
                    }
                  />
                );
              }
              token satisfies never;
            })}
          </Flex>

          <Tooltip {...tooltipProps}>
            <IconButton
              {...buttonProps}
              disabled={errors.size > 0}
              type="button"
            />
          </Tooltip>
        </Flex>
      </InputErrorsTooltip>
    </form>
  );
});

export const AddressBarPopover = () => {
  const [isOpen, setIsOpen] = useState(false);
  const path = useStore($selectedPagePath);
  const publishedOrigin = useStore($publishedOrigin);
  const { tooltipProps, buttonProps } = useCopyUrl(`${publishedOrigin}${path}`);
  const formRef = useRef<HTMLFormElement>(null);

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
    <Popover
      open={isOpen}
      onOpenChange={(newIsOpen) => {
        setIsOpen(newIsOpen);
        if (newIsOpen === false) {
          formRef.current?.requestSubmit();
        }
      }}
    >
      <PopoverTrigger asChild>
        <ToolbarButton aria-label="Toggle dynamic page address" tabIndex={0}>
          <DynamicPageIcon />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          css={{ padding: 0 }}
          sideOffset={0}
          collisionPadding={4}
          align="start"
        >
          <AddressBar ref={formRef} />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
