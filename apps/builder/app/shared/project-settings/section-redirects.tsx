import { useStore } from "@nanostores/react";
import {
  Box,
  Button,
  Combobox,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogTitle,
  Flex,
  Grid,
  InputErrorsTooltip,
  Link,
  List,
  ListItem,
  rawTheme,
  ScrollArea,
  SearchField,
  Select,
  SmallIconButton,
  Text,
  theme,
  Tooltip,
} from "@webstudio-is/design-system";
import {
  AlertIcon,
  ArrowRightIcon,
  InfoCircleIcon,
  TrashIcon,
  UploadIcon,
} from "@webstudio-is/icons";
import { ImportRedirectsDialog } from "./import-redirects-dialog";
import { OldPagePath, ProjectNewRedirectPath } from "@webstudio-is/sdk";
import type { PageRedirect } from "@webstudio-is/sdk";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { $pages } from "~/shared/sync/data-stores";
import { $publishedOrigin } from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { getExistingRoutePaths, sectionSpacing } from "./utils";
import {
  LOOP_ERROR,
  wouldCreateLoop,
} from "~/shared/redirects/redirect-loop-detection";

const statusCodeOptions = ["301", "302"] as const;

const statusCodeDescriptions: Record<string, string> = {
  "301": "Moved permanently. SEO ranking transfers to new URL.",
  "302": "Moved temporarily. SEO ranking stays with original URL.",
};

type ValidationResult = {
  errors: string[];
  warnings: string[];
};

const validateFromPath = (
  fromPath: string,
  redirects: Array<PageRedirect>,
  existingPaths: Set<string>
): ValidationResult => {
  const fromPathValidationResult = OldPagePath.safeParse(fromPath);

  if (fromPathValidationResult.success) {
    if (fromPath.startsWith("/")) {
      // Check for duplicate redirect first (error takes precedence)
      if (redirects.some((redirect) => redirect.old === fromPath)) {
        return {
          errors: ["This path is already being redirected"],
          warnings: [],
        };
      }

      // Show warning if redirecting from an existing page path
      // The redirect will take precedence over the page when published
      if (existingPaths.has(fromPath)) {
        return {
          errors: [],
          warnings: ["This redirect will override an existing page"],
        };
      }
    }
    return { errors: [], warnings: [] };
  }

  return {
    errors: fromPathValidationResult.error.format()?._errors,
    warnings: [],
  };
};

const validateToPath = (toPath: string): string[] => {
  const toPathValidationResult = ProjectNewRedirectPath.safeParse(toPath);
  if (toPathValidationResult.success) {
    return [];
  }
  return toPathValidationResult.error.format()._errors;
};

// Exported for testing
export const __testing__ = {
  validateFromPath,
  validateToPath,
};

export const SectionRedirects = () => {
  const publishedOrigin = useStore($publishedOrigin);
  const [redirects, setRedirects] = useState(
    () => $pages.get()?.redirects ?? []
  );

  const [fromPath, setFromPath] = useState<string>("");
  const [toPath, setToPath] = useState<string>("");
  const [httpStatus, setHttpStatus] =
    useState<PageRedirect["status"]>(undefined);
  const [fromPathErrors, setFromPathErrors] = useState<string[]>([]);
  const [fromPathWarnings, setFromPathWarnings] = useState<string[]>([]);
  const [toPathErrors, setToPathErrors] = useState<string[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pages = useStore($pages);
  const existingPaths = getExistingRoutePaths(pages);
  const fromPathRef = useRef<HTMLInputElement>(null);

  const isValidRedirects =
    fromPathErrors.length === 0 && toPathErrors.length === 0;

  // Filter redirects based on search query
  const filteredRedirects = searchQuery
    ? redirects.filter(
        (redirect) =>
          redirect.old.toLowerCase().includes(searchQuery.toLowerCase()) ||
          redirect.new.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : redirects;

  // Get all page paths for combobox suggestions
  const pagePaths = Array.from(existingPaths).sort();

  const handleFromPathChange = (value: string) => {
    setFromPath(value);
    const { errors, warnings } = validateFromPath(
      value,
      redirects,
      existingPaths
    );
    setFromPathErrors(errors);
    setFromPathWarnings(warnings);
  };

  const handleToPathChange = (value: string) => {
    setToPath(value);
    setToPathErrors(validateToPath(value));
  };

  const handleSave = (redirects: Array<PageRedirect>) => {
    setRedirects(redirects);
    serverSyncStore.createTransaction([$pages], (pages) => {
      if (pages === undefined) {
        return;
      }
      pages.redirects = redirects;
    });
  };

  const handleAddRedirect = () => {
    const { errors: fromPathValidationErrors, warnings } = validateFromPath(
      fromPath,
      redirects,
      existingPaths
    );
    const toPathValidationErrors = validateToPath(toPath);
    const hasLoop = wouldCreateLoop(fromPath, toPath, redirects);

    // Update error state so user sees what went wrong
    setFromPathErrors(fromPathValidationErrors);
    setFromPathWarnings(warnings);
    setToPathErrors(
      hasLoop ? [...toPathValidationErrors, LOOP_ERROR] : toPathValidationErrors
    );

    if (
      fromPathValidationErrors.length > 0 ||
      toPathValidationErrors.length > 0 ||
      hasLoop
    ) {
      return;
    }

    // Needs to apply state before setting focus.
    flushSync(() => {
      handleSave([
        {
          old: fromPath,
          new: toPath,
          status: httpStatus ?? "301",
        },
        ...redirects,
      ]);
      setFromPath("");
      setToPath("");
      setFromPathWarnings([]);
    });
    fromPathRef.current?.focus();
  };

  const handleDeleteRedirect = (index: number) => {
    const newRedirects = [...redirects];
    newRedirects.splice(index, 1);
    handleSave(newRedirects);
  };

  const handleImportRedirects = (
    importedRedirects: PageRedirect[],
    mode: "add" | "replace"
  ) => {
    if (mode === "replace") {
      handleSave(importedRedirects);
    } else {
      // Add mode - prepend new redirects
      handleSave([...importedRedirects, ...redirects]);
    }
  };

  const handleDeleteAll = () => {
    handleSave([]);
    setIsDeleteAllDialogOpen(false);
  };

  return (
    <>
      <ImportRedirectsDialog
        isOpen={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        existingRedirects={redirects}
        onImport={handleImportRedirects}
      />

      <Grid gap={3} css={sectionSpacing}>
        <Flex gap={1} align="center">
          <Text variant="titles">Redirects</Text>
          <Tooltip
            variant="wrapped"
            content={
              <Flex direction="column" gap="2">
                <Text>
                  Redirect old URLs to new ones so you don't lose traffic or
                  search engine rankings.
                </Text>
                <Flex direction="column" gap="1">
                  <Text>Supported patterns:</Text>
                  <Text>/path → Exact match</Text>
                  <Text>/blog/* → All paths under /blog/</Text>
                  <Text>/:slug → Dynamic segment</Text>
                  <Text>/:id? → Optional segment</Text>
                </Flex>
              </Flex>
            }
          >
            <InfoCircleIcon
              color={rawTheme.colors.foregroundSubtle}
              tabIndex={0}
            />
          </Tooltip>
        </Flex>

        <Flex gap="2" justify="between">
          <SearchField
            placeholder="Search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onAbort={() => setSearchQuery("")}
            disabled={redirects.length === 0}
          />
          <Flex gap="2">
            <Button
              color="ghost"
              prefix={<TrashIcon />}
              onClick={() => setIsDeleteAllDialogOpen(true)}
              disabled={redirects.length === 0}
            >
              Delete all
            </Button>
            <Button
              color="ghost"
              prefix={<UploadIcon />}
              onClick={() => setIsImportDialogOpen(true)}
            >
              Import
            </Button>
          </Flex>
        </Flex>

        <Dialog
          open={isDeleteAllDialogOpen}
          onOpenChange={setIsDeleteAllDialogOpen}
        >
          <DialogContent>
            <DialogTitle>Delete all redirects</DialogTitle>
            <Flex css={{ padding: theme.panel.padding }}>
              <Text>
                Are you sure you want to delete all {redirects.length} redirect
                {redirects.length !== 1 ? "s" : ""}? This action cannot be
                undone.
              </Text>
            </Flex>
            <DialogActions>
              <Button color="destructive" onClick={handleDeleteAll}>
                Delete all
              </Button>
              <DialogClose>
                <Button color="ghost">Cancel</Button>
              </DialogClose>
            </DialogActions>
          </DialogContent>
        </Dialog>

        <Flex gap="2" align="center">
          <InputErrorsTooltip
            errors={fromPathErrors.length > 0 ? fromPathErrors : undefined}
            side="top"
          >
            <Combobox<string>
              inputRef={fromPathRef}
              autoFocus
              placeholder="/old-path or /old/*"
              value={fromPath}
              color={fromPathErrors.length === 0 ? undefined : "error"}
              getItems={() => pagePaths}
              itemToString={(item) => item ?? ""}
              onItemSelect={(value) => handleFromPathChange(value ?? "")}
              onChange={(value) => {
                // Don't reset value on blur (when value is undefined)
                if (value !== undefined) {
                  handleFromPathChange(value);
                }
              }}
            />
          </InputErrorsTooltip>

          <Select
            id="redirect-type"
            placeholder="301"
            options={[...statusCodeOptions]}
            value={httpStatus ?? "301"}
            css={{ width: theme.spacing[18] }}
            getDescription={(option) => (
              <Box css={{ width: theme.spacing[25] }}>
                {statusCodeDescriptions[option]}
              </Box>
            )}
            onChange={(value) => {
              setHttpStatus(value as PageRedirect["status"]);
            }}
          />

          <InputErrorsTooltip
            errors={toPathErrors.length > 0 ? toPathErrors : undefined}
            side="top"
          >
            <Combobox<string>
              placeholder="/to-path or URL"
              value={toPath}
              color={toPathErrors.length === 0 ? undefined : "error"}
              getItems={() => pagePaths}
              itemToString={(item) => item ?? ""}
              onItemSelect={(value) => handleToPathChange(value ?? "")}
              onChange={(value) => {
                // Don't reset value on blur (when value is undefined)
                if (value !== undefined) {
                  handleToPathChange(value);
                }
              }}
            />
          </InputErrorsTooltip>

          <Button
            disabled={isValidRedirects === false || fromPath === toPath}
            onClick={handleAddRedirect}
            css={{ flexShrink: 0 }}
          >
            Add
          </Button>
        </Flex>
        {fromPathWarnings.length > 0 && (
          <Flex gap="1" align="center">
            <AlertIcon
              color={rawTheme.colors.backgroundAlertMain}
              style={{ flexShrink: 0 }}
            />
            <Text color="subtle">{fromPathWarnings.join(". ")}</Text>
          </Flex>
        )}
      </Grid>
      {redirects.length > 0 ? (
        <ScrollArea>
          <Grid css={sectionSpacing}>
            <List asChild>
              <Flex direction="column" gap="1" align="stretch">
                {filteredRedirects.map((redirect, index) => {
                  return (
                    <ListItem asChild key={redirect.old}>
                      <Grid
                        align="center"
                        gap="2"
                        css={{
                          p: theme.spacing[3],
                          overflow: "hidden",
                          gridTemplateColumns: `1fr auto auto 1fr`,
                          position: "relative",
                          "& > button": {
                            opacity: 0,
                            position: "absolute",
                            right: 0,
                            top: 0,
                            bottom: 0,
                            height: "auto",
                            borderRadius: 0,
                            background: theme.colors.backgroundPanel,
                          },
                          "&:hover > button, &:focus-within > button": {
                            opacity: 1,
                          },
                        }}
                      >
                        <Tooltip content={redirect.old}>
                          <Link
                            underline="hover"
                            href={new URL(
                              redirect.old,
                              publishedOrigin
                            ).toString()}
                            css={{
                              wordBreak: "break-all",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            target="_blank"
                          >
                            {redirect.old}
                          </Link>
                        </Tooltip>
                        <Text>{redirect.status ?? "301"}</Text>
                        <ArrowRightIcon size={16} />
                        <Tooltip content={redirect.new}>
                          <Link
                            underline="hover"
                            href={new URL(
                              redirect.new,
                              publishedOrigin
                            ).toString()}
                            css={{
                              wordBreak: "break-all",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            target="_blank"
                          >
                            {redirect.new}
                          </Link>
                        </Tooltip>
                        <SmallIconButton
                          variant="destructive"
                          icon={<TrashIcon />}
                          aria-label={`Delete redirect from ${redirect.old}`}
                          onClick={() => handleDeleteRedirect(index)}
                        />
                      </Grid>
                    </ListItem>
                  );
                })}
              </Flex>
            </List>
          </Grid>
        </ScrollArea>
      ) : null}
    </>
  );
};
