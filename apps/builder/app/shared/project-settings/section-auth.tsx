import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Combobox,
  Flex,
  Grid,
  InputErrorsTooltip,
  InputField,
  LinkButton,
  List,
  ListItem,
  ProChip,
  ScrollArea,
  SearchField,
  SmallIconButton,
  Text,
  theme,
  Tooltip,
  cssVar,
} from "@webstudio-is/design-system";
import { InfoCircleIcon, TrashIcon } from "@webstudio-is/icons";
import { useStore } from "@nanostores/react";
import {
  createBasicAuthRoute,
  serializeWsAuth,
  type WsAuthRoute,
} from "@webstudio-is/wsauth";
import { validateBasicAuthCredentials } from "@webstudio-is/project-build/runtime";
import { $permissions } from "~/shared/nano-states";
import { $pages, $projectSettings } from "~/shared/sync/data-stores";
import { getExistingRoutePaths, sectionSpacing } from "./utils";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import {
  parseProjectAuthRoutes,
  validateProjectAuthRoute,
} from "@webstudio-is/project-build/contracts";
import { ProjectSettingsDataRow } from "./data-row";

const saveAuthRoutes = (authRoutes: WsAuthRoute[]) => {
  executeRuntimeMutation({
    id: "projectSettings.update",
    input: {
      meta: {
        auth: authRoutes.length === 0 ? null : serializeWsAuth(authRoutes),
      },
    },
  });
};

export const SectionAuth = () => {
  const { allowAuth } = useStore($permissions);
  const pages = useStore($pages);
  const projectSettings = useStore($projectSettings);
  const routeRef = useRef<HTMLInputElement>(null);
  const [authRoutes, setAuthRoutes] = useState(() => {
    return parseProjectAuthRoutes($projectSettings.get()?.meta.auth).routes;
  });
  const [route, setRoute] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [routeErrors, setRouteErrors] = useState<string[]>([]);
  const [loginErrors, setLoginErrors] = useState<string[]>([]);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const authContent = projectSettings?.meta.auth;
  const parseResult = useMemo(() => {
    return parseProjectAuthRoutes(authContent);
  }, [authContent]);
  const parseErrors = parseResult.errors;

  useEffect(() => {
    setAuthRoutes(parseResult.routes);
  }, [parseResult.routes]);

  const existingPaths = getExistingRoutePaths(pages);
  const routeSuggestions = ["/", ...Array.from(existingPaths).sort()];
  const filteredAuthRoutes = searchQuery
    ? authRoutes.filter((authRoute) => {
        const query = searchQuery.toLowerCase();
        return (
          authRoute.route.toLowerCase().includes(query) ||
          authRoute.auth.login.toLowerCase().includes(query)
        );
      })
    : authRoutes;

  const handleRouteChange = (value: string) => {
    setRoute(value);
    setRouteErrors(validateProjectAuthRoute(value.trim(), authRoutes));
  };

  const handleSave = (nextAuthRoutes: WsAuthRoute[]) => {
    setAuthRoutes(nextAuthRoutes);
    saveAuthRoutes(nextAuthRoutes);
  };

  const handleAddAuthRoute = () => {
    const nextRoute = route.trim();
    const nextRouteErrors = validateProjectAuthRoute(nextRoute, authRoutes);
    const basicAuthErrors = validateBasicAuthCredentials({
      login,
      password,
    });
    const nextLoginErrors = basicAuthErrors?.login ?? [];
    const nextPasswordErrors = basicAuthErrors?.password ?? [];

    setRouteErrors(nextRouteErrors);
    setLoginErrors(nextLoginErrors);
    setPasswordErrors(nextPasswordErrors);

    if (
      nextRouteErrors.length > 0 ||
      nextLoginErrors.length > 0 ||
      nextPasswordErrors.length > 0
    ) {
      return;
    }

    handleSave([
      createBasicAuthRoute({
        route: nextRoute,
        login,
        password,
      }),
      ...authRoutes,
    ]);
    setRoute("");
    setLogin("");
    setPassword("");
    routeRef.current?.focus();
  };

  const handleDeleteAuthRoute = (index: number) => {
    const nextAuthRoutes = [...authRoutes];
    nextAuthRoutes.splice(index, 1);
    handleSave(nextAuthRoutes);
  };

  const handleReset = () => {
    setRouteErrors([]);
    setLoginErrors([]);
    setPasswordErrors([]);
    handleSave([]);
  };

  return (
    <Grid gap={3} css={sectionSpacing}>
      <Flex align="center" gap={1}>
        <Text variant="titles">Authentication</Text>
        {allowAuth === false && <ProChip>PRO</ProChip>}
        <Tooltip
          content={
            <>
              <Text>
                Authentication asks visitors for HTTP Basic Auth credentials
                before protected pages load on custom domains.
              </Text>
              <br />
              <Text>
                Routes use the same syntax as page paths, including :params and
                * wildcards.
              </Text>
              {allowAuth === false && (
                <>
                  <br />
                  <Text>
                    Authentication is a Pro feature. You can publish to staging
                    for free; upgrade to Pro to publish to custom domains.
                  </Text>
                  <LinkButton
                    color="primary"
                    css={{ marginTop: theme.spacing[5], width: "100%" }}
                    target="_blank"
                    href="https://webstudio.is/pricing"
                  >
                    Upgrade
                  </LinkButton>
                </>
              )}
            </>
          }
          variant="wrapped"
        >
          <InfoCircleIcon
            color={cssVar("--foreground-secondary")}
            tabIndex={-1}
          />
        </Tooltip>
      </Flex>

      {parseErrors.length > 0 && (
        <Grid gap={2}>
          <Grid gap={1}>
            {parseErrors.map((error) => (
              <Text key={`${error.path}:${error.message}`} color="destructive">
                {error.path}: {error.message}
              </Text>
            ))}
          </Grid>
          <Flex>
            <Button color="destructive" onClick={handleReset}>
              Reset authentication
            </Button>
          </Flex>
        </Grid>
      )}

      <Flex gap="2" justify="between">
        <SearchField
          placeholder="Search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onAbort={() => setSearchQuery("")}
          disabled={authRoutes.length === 0}
        />
        <Button
          color="ghost"
          prefix={<TrashIcon />}
          disabled={authRoutes.length === 0}
          onClick={handleReset}
        >
          Delete all
        </Button>
      </Flex>

      <Flex gap="2" align="center">
        <InputErrorsTooltip
          errors={routeErrors.length > 0 ? routeErrors : undefined}
          side="top"
        >
          <Combobox<string>
            inputRef={routeRef}
            autoFocus
            placeholder="/private or /docs/*"
            value={route}
            color={routeErrors.length === 0 ? undefined : "error"}
            getItems={() => routeSuggestions}
            itemToString={(item) => item ?? ""}
            onItemSelect={(value) => handleRouteChange(value ?? "")}
            onChange={(value) => {
              if (value !== undefined) {
                handleRouteChange(value);
              }
            }}
          />
        </InputErrorsTooltip>

        <InputErrorsTooltip
          errors={loginErrors.length > 0 ? loginErrors : undefined}
          side="top"
        >
          <InputField
            placeholder="Login"
            value={login}
            color={loginErrors.length === 0 ? undefined : "error"}
            onChange={(event) => {
              setLogin(event.target.value);
              setLoginErrors([]);
            }}
          />
        </InputErrorsTooltip>

        <InputErrorsTooltip
          errors={passwordErrors.length > 0 ? passwordErrors : undefined}
          side="top"
        >
          <InputField
            placeholder="Password"
            type="password"
            value={password}
            color={passwordErrors.length === 0 ? undefined : "error"}
            onChange={(event) => {
              setPassword(event.target.value);
              setPasswordErrors([]);
            }}
          />
        </InputErrorsTooltip>

        <Button
          color="primary"
          disabled={
            routeErrors.length > 0 ||
            loginErrors.length > 0 ||
            passwordErrors.length > 0
          }
          onClick={handleAddAuthRoute}
          css={{ flexShrink: 0 }}
        >
          Add
        </Button>
      </Flex>

      {authRoutes.length > 0 ? (
        <ScrollArea>
          <Grid>
            <List asChild>
              <Flex direction="column" gap="1" align="stretch">
                {filteredAuthRoutes.map((authRoute) => {
                  const index = authRoutes.indexOf(authRoute);
                  return (
                    <ListItem asChild key={authRoute.route}>
                      <ProjectSettingsDataRow
                        align="center"
                        gap="2"
                        css={{
                          gridTemplateColumns: "1fr 1fr",
                        }}
                      >
                        <Tooltip content={authRoute.route}>
                          <Text
                            truncate
                            css={{
                              wordBreak: "break-all",
                            }}
                          >
                            {authRoute.route}
                          </Text>
                        </Tooltip>
                        <Tooltip content={authRoute.auth.login}>
                          <Text truncate>{authRoute.auth.login}</Text>
                        </Tooltip>
                        <SmallIconButton
                          variant="destructive"
                          icon={<TrashIcon />}
                          aria-label={`Delete authentication for ${authRoute.route}`}
                          onClick={() => handleDeleteAuthRoute(index)}
                        />
                      </ProjectSettingsDataRow>
                    </ListItem>
                  );
                })}
              </Flex>
            </List>
          </Grid>
        </ScrollArea>
      ) : null}
    </Grid>
  );
};
