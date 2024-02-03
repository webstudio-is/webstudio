import {
  Grid,
  Separator,
  Flex,
  InputField,
  Button,
  Text,
  theme,
  List,
  ListItem,
  SmallIconButton,
  InputErrorsTooltip,
} from "@webstudio-is/design-system";
import { ArrowRightIcon, TrashIcon } from "@webstudio-is/icons";
import { useState, type ChangeEvent } from "react";
import type { ProjectSettings } from "./project-settings";
import { PagePath, ProjectNewRedirectPathSchema } from "@webstudio-is/sdk";
import { useStore } from "@nanostores/react";
import { getExistingRoutePaths } from "../sidebar-left/panels/pages/page-utils";
import { $pages } from "~/shared/nano-states";

export const RedirectSection = (props: {
  settings: ProjectSettings;
  onSettingsChange: (settings: ProjectSettings) => void;
}) => {
  const [oldPath, setOldPath] = useState<string>("");
  const [newPath, setNewPath] = useState<string>("");
  const [oldPathErrors, setOldPathErrors] = useState<string[]>([]);
  const [newPathErrors, setNewPathErrors] = useState<string[]>([]);
  const pages = useStore($pages);
  const existingPaths = getExistingRoutePaths(pages);

  const redirects = props.settings?.redirects ?? [];
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
    const newPathValidationResult =
      ProjectNewRedirectPathSchema.safeParse(newPath);

    if (newPathValidationResult.success === true) {
      /*
        This is the new path, that users want to redirect to.
        If the new path doesn't exist, it's not a valid redirect.
      */

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

  const handleAddRedirect = () => {
    const validOldPath = validateOldPath(oldPath);
    const validNewPath = validateNewPath(newPath);

    if (validOldPath.length > 0 || validNewPath.length > 0) {
      return;
    }

    props.onSettingsChange({
      ...props.settings,
      redirects: [{ old: oldPath, new: newPath }, ...redirects],
    });
    setOldPath("");
    setNewPath("");
  };

  const handleDeleteRedirect = (index: number) => {
    const newRedirects = [...redirects];
    newRedirects.splice(index, 1);
    props.onSettingsChange({
      ...props.settings,
      redirects: newRedirects,
    });
  };

  return (
    <>
      <Separator />
      <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
        <Text variant="titles">301 Redirects</Text>
        <Text color="subtle">
          Redirects old URLs to new ones so that you don’t lose any traffic or
          search engine rankings.
        </Text>

        <Flex gap="2" align="center">
          <InputErrorsTooltip
            errors={oldPathErrors.length > 0 ? oldPathErrors : undefined}
            side="top"
            css={{ zIndex: theme.zIndices["1"] }}
          >
            <InputField
              type="text"
              placeholder="/old-path"
              value={oldPath}
              css={{ flexGrow: 1 }}
              onKeyDown={handleOnKeyDown}
              onChange={handleOldPathChange}
              color={oldPathErrors.length === 0 ? undefined : "error"}
            />
          </InputErrorsTooltip>
          <ArrowRightIcon />

          <InputErrorsTooltip
            errors={newPathErrors.length > 0 ? newPathErrors : undefined}
            side="top"
            css={{ zIndex: theme.zIndices["2"] }}
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
        <Grid
          css={{
            p: theme.spacing[5],
            mx: theme.spacing[5],
          }}
        >
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
                      }}
                    >
                      <Flex gap="2">
                        <Text>{redirect.old}</Text>
                        <ArrowRightIcon />
                        <Text truncate>{redirect.new}</Text>
                      </Flex>
                      <SmallIconButton
                        variant="destructive"
                        icon={<TrashIcon />}
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
