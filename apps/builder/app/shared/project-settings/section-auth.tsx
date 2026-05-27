import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Combobox,
  Flex,
  Grid,
  InputErrorsTooltip,
  InputField,
  Link,
  List,
  ListItem,
  ProBadge,
  rawTheme,
  ScrollArea,
  SearchField,
  SmallIconButton,
  Text,
  theme,
  Tooltip,
  buttonStyle,
} from "@webstudio-is/design-system";
import { InfoCircleIcon, TrashIcon } from "@webstudio-is/icons";
import { useStore } from "@nanostores/react";
import {
  createBasicAuthRoute,
  parseWsAuth,
  serializeWsAuth,
  validateBasicAuth,
  type WsAuthRoute,
} from "@webstudio-is/wsauth";
import { $permissions } from "~/shared/nano-states";
import { $pages } from "~/shared/sync/data-stores";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { getExistingRoutePaths, sectionSpacing } from "./utils";

const parseAuthRoutes = (auth: string | undefined) => {
  return parseWsAuth(auth ?? "");
};

const validateRouteSyntax = (route: string) => {
  const result = parseWsAuth(
    JSON.stringify({
      version: 1,
      routes: {
        [route]: {
          method: "basic",
          login: "login",
          password: "password",
        },
      },
    })
  );
  return result.errors.find((error) =>
    error.path.startsWith(`routes.${JSON.stringify(route)}`)
  )?.message;
};

const saveAuthRoutes = (authRoutes: WsAuthRoute[]) => {
  serverSyncStore.createTransaction([$pages], (pages) => {
    if (pages === undefined) {
      return;
    }
    if (pages.meta === undefined) {
      pages.meta = {};
    }
    pages.meta.auth =
      authRoutes.length === 0 ? undefined : serializeWsAuth(authRoutes);
  });
};

const validateRoute = (route: string, authRoutes: WsAuthRoute[]) => {
  const errors: string[] = [];
  if (route === "") {
    errors.push("Route is required");
    return errors;
  }
  const routeError = validateRouteSyntax(route);
  if (routeError !== undefined) {
    errors.push(routeError);
  }
  if (authRoutes.some((authRoute) => authRoute.route === route)) {
    errors.push("This route already requires authentication");
  }
  return errors;
};

export const SectionAuth = () => {
  const { allowAuth } = useStore($permissions);
  const pages = useStore($pages);
  const routeRef = useRef<HTMLInputElement>(null);
  const [authRoutes, setAuthRoutes] = useState(() => {
    return parseAuthRoutes($pages.get()?.meta?.auth).routes;
  });
  const [route, setRoute] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [routeErrors, setRouteErrors] = useState<string[]>([]);
  const [loginErrors, setLoginErrors] = useState<string[]>([]);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const authContent = pages?.meta?.auth;
  const parseResult = useMemo(() => {
    return parseAuthRoutes(authContent);
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
    setRouteErrors(validateRoute(value.trim(), authRoutes));
  };

  const handleSave = (nextAuthRoutes: WsAuthRoute[]) => {
    setAuthRoutes(nextAuthRoutes);
    saveAuthRoutes(nextAuthRoutes);
  };

  const handleAddAuthRoute = () => {
    const nextRoute = route.trim();
    const nextRouteErrors = validateRoute(nextRoute, authRoutes);
    const basicAuthValidation = validateBasicAuth({
      login,
      password,
    });
    const nextLoginErrors = basicAuthValidation.errors?.login ?? [];
    const nextPasswordErrors = basicAuthValidation.errors?.password ?? [];

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
        {allowAuth === false && <ProBadge>PRO</ProBadge>}
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
                  <Link
                    className={buttonStyle({ color: "gradient" })}
                    css={{ marginTop: theme.spacing[5], width: "100%" }}
                    color="contrast"
                    underline="none"
                    target="_blank"
                    href="https://webstudio.is/pricing"
                  >
                    Upgrade
                  </Link>
                </>
              )}
            </>
          }
          variant="wrapped"
        >
          <InfoCircleIcon
            color={rawTheme.colors.foregroundSubtle}
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
                      <Grid
                        align="center"
                        gap="2"
                        css={{
                          p: theme.spacing[3],
                          overflow: "hidden",
                          gridTemplateColumns: "1fr 1fr",
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
                      </Grid>
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

export const __testing__ = {
  parseAuthRoutes,
  validateRoute,
};
