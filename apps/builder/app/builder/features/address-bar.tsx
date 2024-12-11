import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { mergeRefs } from "@react-aria/utils";
import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
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
  PopoverContent,
  IconButton,
  MenuItemButton,
  MenuList,
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
  $selectedPageDefaultSystem,
  updateSystem,
} from "~/shared/nano-states";
import {
  compilePathnamePattern,
  isPathnamePattern,
  matchPathnamePattern,
  tokenizePathnamePattern,
} from "~/builder/shared/url-pattern";
import { savePathInHistory } from "~/shared/pages";
import { $selectedPage } from "~/shared/awareness";

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
  [$selectedPageDefaultSystem, $selectedPage, $dataSourceVariables],
  (defaultSystem, selectedPage, dataSourceVariables) => {
    if (selectedPage === undefined) {
      return defaultSystem.params;
    }
    const system = dataSourceVariables.get(selectedPage.systemDataSourceId) as
      | undefined
      | System;
    return system?.params ?? defaultSystem.params;
  }
);

const $selectedPageHistory = computed(
  $selectedPage,
  (page) => page?.history ?? []
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

const moveSelection = (menu: HTMLElement, diff: number) => {
  const options = Array.from(menu.querySelectorAll("[role=option]"));
  const index = options.findIndex((element) => element.ariaSelected === "true");
  const newIndex = Math.max(-1, Math.min(index + diff, options.length - 1));
  if (index >= 0) {
    options[index].ariaSelected = null;
  }
  if (newIndex >= 0) {
    options[newIndex].ariaSelected = "true";
  }
};

/**
 * Suggestions are opened whenever user
 * - types in input
 * - focuses input
 * - press arrow down or arrow up
 *
 * and closed when
 * - input is lost focus
 * - escape or enter are pressed
 *
 * option selection is managed by arrow up, arrow down and hover
 */
const Suggestions = ({
  containerRef,
  options,
  onSelect,
}: {
  containerRef: RefObject<null | HTMLFormElement>;
  options: string[];
  onSelect: (option: string) => void;
}) => {
  const list = options;

  const menuRef = useRef<HTMLDivElement>(null);
  const [isListOpen, setIsListOpen] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const handleInput = () => {
      setIsListOpen(true);
    };
    let frameId: undefined | number;
    const handleFocusIn = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      setIsListOpen(true);
    };
    const handleFocusOut = () => {
      frameId = requestAnimationFrame(() => {
        setIsListOpen(false);
      });
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        // avoid moving cursor to the end
        event.preventDefault();
        // trigger menu with up and down like in chrome
        if (menuRef.current === null) {
          setIsListOpen(true);
          return;
        }
        moveSelection(menuRef.current, +1);
      }
      if (event.key === "ArrowUp") {
        // avoid moving cursor to the start
        event.preventDefault();
        if (menuRef.current === null) {
          setIsListOpen(true);
          return;
        }
        moveSelection(menuRef.current, -1);
      }
      if (event.key === "Escape" && menuRef.current) {
        // avoid closing popovers and dialogs when list is open
        event.stopPropagation();
        setIsListOpen(false);
      }
      if (event.key === "Enter" && menuRef.current) {
        const selected = menuRef.current?.querySelector(
          "[role=option][aria-selected=true]"
        );
        if (selected instanceof HTMLElement) {
          // avoid submitting form when item is selected
          event.preventDefault();
          selected.click();
        }
      }
    };
    container.addEventListener("input", handleInput);
    container.addEventListener("focusin", handleFocusIn);
    container.addEventListener("focusout", handleFocusOut);
    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("input", handleInput);
      container.removeEventListener("focusin", handleFocusIn);
      container.removeEventListener("focusout", handleFocusOut);
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, [containerRef]);

  if (isListOpen === false || list.length === 0) {
    return;
  }
  return (
    <MenuList
      ref={menuRef}
      role="listbox"
      css={{
        position: "absolute",
        left: 0,
        top: "calc(100% + 4px)",
        minWidth: "100%",
      }}
      // close after selecting option
      onClick={() => setIsListOpen(false)}
    >
      {list.map((option) => (
        <MenuItemButton
          key={option}
          type="button"
          role="option"
          tabIndex={-1}
          css={{ textTransform: "none", whiteSpace: "nowrap" }}
          onMouseEnter={(event) => {
            // select option on hover
            const options =
              menuRef.current?.querySelectorAll("[role=option]") ?? [];
            for (const element of options) {
              if (element.ariaSelected === "true") {
                element.ariaSelected = null;
              }
              if (element === event.currentTarget) {
                element.ariaSelected = "true";
              }
            }
          }}
          onClick={() => onSelect(option)}
        >
          {option}
        </MenuItemButton>
      ))}
    </MenuList>
  );
};

const AddressBar = forwardRef<
  HTMLFormElement,
  {
    onSubmit: () => void;
  }
>(({ onSubmit }, ref) => {
  const publishedOrigin = useStore($publishedOrigin);
  const path = useStore($selectedPagePath);
  let history = useStore($selectedPageHistory);
  history = useMemo(() => {
    return history.filter((item) => matchPathnamePattern(path, item));
  }, [history, path]);
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

  const containerRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={mergeRefs(ref, containerRef)}
      style={{ position: "relative" }}
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
        if (page === undefined) {
          return;
        }
        updateSystem(page, { params: newParams });
        const compiledPath = compilePathnamePattern(tokens, newParams);
        savePathInHistory(page.id, compiledPath);
        if (errors.size === 0) {
          onSubmit();
        }
      }}
    >
      {/* submit is not triggered when press enter on input without submit button */}
      <button style={{ display: "none" }}>submit</button>
      <Suggestions
        containerRef={containerRef}
        options={history}
        onSelect={(option) => {
          flushSync(() => {
            setPathParams(matchPathnamePattern(path, option) ?? {});
          });
          containerRef.current?.requestSubmit();
        }}
      />
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
        formRef.current?.requestSubmit();
        setIsOpen(newIsOpen);
      }}
    >
      <PopoverTrigger asChild>
        <ToolbarButton aria-label="Toggle dynamic page address" tabIndex={0}>
          <DynamicPageIcon />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent sideOffset={0} collisionPadding={4} align="start">
        <AddressBar ref={formRef} onSubmit={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  );
};
