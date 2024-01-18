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
  IconButton,
} from "@webstudio-is/design-system";
import { DeleteIcon } from "@webstudio-is/icons";
import { useState, type ChangeEvent, useEffect } from "react";
import type { ProjectSettings } from "./project-settings";

const redirectListStyle = css({
  maxHeight: theme.spacing[22],
  paddingLeft: 0,
  overflowY: "scroll",
  listStyle: "none",
});

export const ProjectRedirectionSettings = (props: {
  settings: ProjectSettings;
  onSettingsChange: (settings: ProjectSettings) => void;
}) => {
  const [oldPath, setOldPath] = useState<string | null>(null);
  const [newPath, setNewPath] = useState<string | null>(null);
  const [isValidOldPath, setIsValidOldPath] = useState<boolean>(false);
  const [isValidNewPath, setIsValidNewPath] = useState<boolean>(false);

  const redirects = props.settings?.redirects ?? {};
  const redirectKeys = Object.keys(redirects);
  const isValidRedirects =
    oldPath !== null && isValidOldPath && newPath !== null && isValidNewPath;

  useEffect(() => {
    if (oldPath === null) {
      return setIsValidOldPath(true);
    }
    return setIsValidOldPath(oldPath.charAt(0) === "/");
  }, [oldPath]);

  useEffect(() => {
    if (newPath === null) {
      return setIsValidNewPath(true);
    }

    if (newPath.charAt(0) === "/") {
      return setIsValidNewPath(true);
    }

    try {
      return setIsValidNewPath(Boolean(new URL(newPath)));
    } catch {
      return setIsValidNewPath(false);
    }
  }, [newPath]);

  const handleOldPathChange = (event: ChangeEvent<HTMLInputElement>) => {
    setOldPath(event.target.value);
  };

  const handleNewPathChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNewPath(event.target.value);
  };

  const handleAddRedirect = () => {
    if (oldPath === null || newPath === null) {
      return;
    }

    props.onSettingsChange({
      ...props.settings,
      redirects: {
        ...redirects,
        [oldPath]: newPath,
      },
    });
    setOldPath(null);
    setNewPath(null);
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

        <Flex gap="2" css={{ alignItems: "end" }}>
          <InputField
            id="old-url-path"
            type="text"
            placeholder="Old path"
            value={oldPath || ""}
            color={isValidOldPath || oldPath === "" ? undefined : "error"}
            onChange={handleOldPathChange}
          />
          <InputField
            id="new-url-path"
            type="text"
            placeholder="New path/url"
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
        <Grid
          css={{
            mx: theme.spacing[5],
            px: theme.spacing[5],
          }}
        >
          <Label sectionTitle>Existing Redirects</Label>
          <List className={redirectListStyle()}>
            {Object.keys(redirects).map((redirect) => {
              return (
                <ListItem key={redirect}>
                  <Grid
                    gap={2}
                    css={{
                      gridTemplateColumns: "2fr 6fr 0.5fr",
                    }}
                  >
                    <Text truncate>{redirect}</Text>
                    <Text variant={"regularLink"} truncate>
                      {redirects[redirect]}
                    </Text>
                    <IconButton>
                      <DeleteIcon
                        onClick={() => handleDeleteRedirect(redirect)}
                      />
                    </IconButton>
                  </Grid>
                </ListItem>
              );
            })}
          </List>
        </Grid>
      ) : null}
    </>
  );
};
