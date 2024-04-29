import {
  Grid,
  Flex,
  InputField,
  Button,
  Text,
  theme,
  List,
  ListItem,
  SmallIconButton,
  InputErrorsTooltip,
  Select,
  Link,
  truncate,
  Tooltip,
} from "@webstudio-is/design-system";
import { ArrowRightIcon, TrashIcon } from "@webstudio-is/icons";
import { useState, type ChangeEvent, useRef } from "react";
import {
  PagePath,
  PageRedirect,
  ProjectNewRedirectPath,
} from "@webstudio-is/sdk";
import { useStore } from "@nanostores/react";
import { getExistingRoutePaths } from "../sidebar-left/panels/pages/page-utils";
import { $pages, $publishedOrigin } from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";
import { flushSync } from "react-dom";
import { sectionSpacing } from "./utils";

export const SectionRedirects = () => {
  const publishedOrigin = useStore($publishedOrigin);
  const [redirects, setRedirects] = useState(
    () => $pages.get()?.redirects ?? []
  );
  const [oldPath, setOldPath] = useState<string>("");
  const [newPath, setNewPath] = useState<string>("");
  const [httpStatus, setHttpStatus] =
    useState<PageRedirect["status"]>(undefined);
  const [oldPathErrors, setOldPathErrors] = useState<string[]>([]);
  const [newPathErrors, setNewPathErrors] = useState<string[]>([]);
  const pages = useStore($pages);
  const existingPaths = getExistingRoutePaths(pages);
  const oldPathRef = useRef<HTMLInputElement>(null);

  const redirectKeys = Object.keys(redirects);
  const isValidRedirects =
    oldPathErrors.length === 0 && newPathErrors.length === 0;

  const handleOldPathChange = (event: ChangeEvent<HTMLInputElement>) => {
    setOldPath(event.target.value);
    setOldPathErrors(validateOldPath(event.target.value));
  };

  const handleNewPathChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNewPath(event.target.value);
    setNewPathErrors(validateNewPath(event.target.value));
  };

  const validateOldPath = (oldPath: string): string[] => {
    const oldPathValidationResult = PagePath.safeParse(oldPath);

    if (oldPathValidationResult.success === true) {
      if (oldPath.startsWith("/") === true) {
        /*
          This is the path, that users want to redirect to.
          If the path already exists in the project. Then we can't add a redirect
        */
        if (existingPaths.has(oldPath) === true) {
          return ["This path already exists in the project"];
        }

        if (redirects.some((redirect) => redirect.old === oldPath)) {
          return ["This path is already being redirected"];
        }
      }
      return [];
    }

    return oldPathValidationResult.error.format()?._errors;
  };

  const validateNewPath = (newPath: string): string[] => {
    const newPathValidationResult = ProjectNewRedirectPath.safeParse(newPath);

    if (newPathValidationResult.success === true) {
      /*
        This is the new path, that users want to redirect to.
        If the new path doesn't exist, it's not a valid redirect.
      */

      if (newPath === "/") {
        return [];
      }

      if (newPath.startsWith("/") === true) {
        if (existingPaths.has(newPath) === false) {
          return ["This path doesn't exist in the project"];
        }
      }

      return [];
    }

    return newPathValidationResult.error.format()._errors;
  };

  const handleOnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleAddRedirect();
    }
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
    const validOldPath = validateOldPath(oldPath);
    const validNewPath = validateNewPath(newPath);

    if (validOldPath.length > 0 || validNewPath.length > 0) {
      return;
    }

    // Needs to apply state before setting focus.
    flushSync(() => {
      handleSave([
        {
          old: oldPath,
          new: newPath,
          status: httpStatus ?? "301",
        },
        ...redirects,
      ]);
      setOldPath("");
      setNewPath("");
    });
    oldPathRef.current?.focus();
  };

  const handleDeleteRedirect = (index: number) => {
    const newRedirects = [...redirects];
    newRedirects.splice(index, 1);
    handleSave(newRedirects);
  };

  return (
    <>
      <Grid gap={2} css={sectionSpacing}>
        <Text variant="titles">Redirects</Text>
        <Text color="subtle">
          Redirects old URLs to new ones so that you don’t lose any traffic or
          search engine rankings.
        </Text>

        <Flex gap="2" align="center">
          <InputErrorsTooltip
            errors={oldPathErrors.length > 0 ? oldPathErrors : undefined}
            side="top"
          >
            <InputField
              ref={oldPathRef}
              autoFocus
              type="text"
              placeholder="/old-path"
              value={oldPath}
              css={{ flexGrow: 1 }}
              onKeyDown={handleOnKeyDown}
              onChange={handleOldPathChange}
              color={oldPathErrors.length === 0 ? undefined : "error"}
            />
          </InputErrorsTooltip>

          <Select
            id="redirect-type"
            placeholder="301"
            options={["301", "302"]}
            value={httpStatus ?? "301"}
            css={{ width: theme.spacing[18] }}
            onChange={(value) => {
              setHttpStatus(value as PageRedirect["status"]);
            }}
          />

          <ArrowRightIcon size={16} style={{ flexShrink: 0 }} />

          <InputErrorsTooltip
            errors={newPathErrors.length > 0 ? newPathErrors : undefined}
            side="top"
          >
            <InputField
              type="text"
              placeholder="/new-path or URL"
              value={newPath}
              onKeyDown={handleOnKeyDown}
              onChange={handleNewPathChange}
              color={newPathErrors.length === 0 ? undefined : "error"}
            />
          </InputErrorsTooltip>

          <Button
            disabled={isValidRedirects === false || oldPath === newPath}
            onClick={handleAddRedirect}
            css={{ flexShrink: 0 }}
          >
            Add
          </Button>
        </Flex>
      </Grid>

      {redirectKeys.length > 0 ? (
        <Grid css={sectionSpacing}>
          <List asChild>
            <Flex direction="column" gap="1">
              {redirects.map((redirect, index) => {
                return (
                  <ListItem asChild key={redirect.old} index={index}>
                    <Flex
                      justify="between"
                      align="center"
                      gap="2"
                      css={{
                        p: theme.spacing[3],
                        overflow: "hidden",
                      }}
                    >
                      <Flex gap="2" align="center">
                        <Tooltip content={redirect.old}>
                          <Link
                            underline="hover"
                            href={new URL(
                              redirect.old,
                              publishedOrigin
                            ).toString()}
                            css={truncate()}
                            target="_blank"
                          >
                            {redirect.old}
                          </Link>
                        </Tooltip>
                        <Text>{redirect.status ?? "301"}</Text>
                        <Flex shrink={false} align="center">
                          <ArrowRightIcon size={16} aria-disabled />
                        </Flex>
                        <Tooltip content={redirect.new}>
                          <Link
                            underline="hover"
                            href={new URL(
                              redirect.new,
                              publishedOrigin
                            ).toString()}
                            css={truncate()}
                            target="_blank"
                          >
                            {redirect.new}
                          </Link>
                        </Tooltip>
                      </Flex>
                      <SmallIconButton
                        variant="destructive"
                        icon={<TrashIcon />}
                        aria-label={`Delete redirect from ${redirect.old}`}
                        onClick={() => handleDeleteRedirect(index)}
                      />
                    </Flex>
                  </ListItem>
                );
              })}
            </Flex>
          </List>
        </Grid>
      ) : null}
    </>
  );
};
