import {
  Grid,
  Separator,
  Label,
  Flex,
  InputField,
  Button,
  Text,
  theme,
  List,
  ListItem,
  css,
  SmallIconButton,
  ScrollArea,
} from "@webstudio-is/design-system";
import { ArrowRightIcon, TrashIcon } from "@webstudio-is/icons";
import { useState, type ChangeEvent } from "react";
import type { ProjectSettings } from "./project-settings";

const redirectListStyle = css({
  paddingLeft: 0,
  listStyle: "none",
});

export const ProjectRedirectionSettings = (props: {
  settings: ProjectSettings;
  onSettingsChange: (settings: ProjectSettings) => void;
}) => {
  const [oldPath, setOldPath] = useState<string | undefined>(undefined);
  const [newPath, setNewPath] = useState<string | undefined>(undefined);
  const [isValidOldPath, setIsValidOldPath] = useState<boolean>(true);
  const [isValidNewPath, setIsValidNewPath] = useState<boolean>(true);

  const redirects = props.settings?.redirects ?? {};
  const redirectKeys = Object.keys(redirects);
  const isValidRedirects =
    oldPath !== undefined &&
    isValidOldPath &&
    newPath !== undefined &&
    isValidNewPath;

  const validateOldPath = () => {
    if (oldPath === undefined) {
      setIsValidOldPath(true);
      return;
    }
    setIsValidOldPath(oldPath.charAt(0) === "/");
  };

  const validateNewPath = () => {
    if (newPath === undefined) {
      setIsValidNewPath(true);
      return;
    }

    if (newPath.charAt(0) === "/") {
      setIsValidNewPath(true);
      return;
    }

    try {
      setIsValidNewPath(Boolean(new URL(newPath)));
    } catch {
      setIsValidNewPath(false);
    }
  };

  const handleOldPathChange = (event: ChangeEvent<HTMLInputElement>) => {
    setOldPath(event.target.value);
    validateOldPath();
  };

  const handleNewPathChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNewPath(event.target.value);
    validateNewPath();
  };

  const handleAddRedirect = () => {
    if (oldPath === undefined || newPath === undefined) {
      return;
    }

    if (isValidOldPath === false || isValidNewPath === false) {
      return;
    }

    props.onSettingsChange({
      ...props.settings,
      redirects: {
        ...redirects,
        [oldPath]: newPath,
      },
    });
    setOldPath(undefined);
    setNewPath(undefined);
  };

  const handleDeleteRedirect = (redirect: string) => {
    const newRedirects = { ...redirects };
    delete newRedirects[redirect];
    props.onSettingsChange({
      ...props.settings,
      redirects: newRedirects,
    });
  };

  return (
    <>
      <Separator />
      <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
        <Label sectionTitle>301 Redirects</Label>
        <Text color="subtle">
          Redirects old URLs to new ones so that you don’t lose any traffic or
          search engine rankings.
        </Text>

        <Flex gap="2" align="center">
          <InputField
            type="text"
            placeholder="/old-path"
            value={oldPath || ""}
            color={
              isValidOldPath === true || oldPath === "" ? undefined : "error"
            }
            onChange={handleOldPathChange}
            css={{ flexGrow: 1 }}
          />
          <ArrowRightIcon />
          <InputField
            type="text"
            placeholder="/new-path or URL"
            value={newPath || ""}
            color={
              isValidNewPath === true || newPath === "" ? undefined : "error"
            }
            onChange={handleNewPathChange}
          />
          <Button
            disabled={isValidRedirects === false || oldPath === newPath}
            onClick={handleAddRedirect}
          >
            Add
          </Button>
        </Flex>
      </Grid>

      {redirectKeys.length > 0 ? (
        <Grid>
          <ScrollArea css={{ maxHeight: theme.spacing[22] }}>
            <List asChild>
              <Flex direction="column" css={{ px: theme.spacing[5] }}>
                {Object.keys(redirects).map((redirect, index) => {
                  return (
                    <ListItem asChild key={redirect} index={index}>
                      <Flex
                        justify="between"
                        align="center"
                        gap="2"
                        css={{
                          height: theme.spacing[11],
                          overflow: "hidden",
                        }}
                      >
                        <Flex gap="2">
                          <Text>{redirect}</Text>
                          <ArrowRightIcon />
                          <Text truncate>{redirects[redirect]}</Text>
                        </Flex>
                        <SmallIconButton
                          variant="destructive"
                          icon={<TrashIcon />}
                          onClick={() => handleDeleteRedirect(redirect)}
                        />
                      </Flex>
                    </ListItem>
                  );
                })}
              </Flex>
            </List>
          </ScrollArea>
        </Grid>
      ) : null}
    </>
  );
};
