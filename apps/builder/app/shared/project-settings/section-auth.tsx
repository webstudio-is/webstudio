import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Flex,
  Grid,
  LinkButton,
  ProChip,
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
import { ProjectSettingsRuleList } from "./rule-list";

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
  const [authRoutes, setAuthRoutes] = useState(() => {
    return parseProjectAuthRoutes($projectSettings.get()?.meta.auth).routes;
  });
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

  const handleSave = (nextAuthRoutes: WsAuthRoute[]) => {
    setAuthRoutes(nextAuthRoutes);
    saveAuthRoutes(nextAuthRoutes);
  };

  const handleAddAuthRoute = (values: Record<string, string>) => {
    handleSave([
      createBasicAuthRoute({
        route: values.route.trim(),
        login: values.login,
        password: values.password,
      }),
      ...authRoutes,
    ]);
    return true;
  };

  const handleDeleteAuthRoute = (index: number) => {
    const nextAuthRoutes = [...authRoutes];
    nextAuthRoutes.splice(index, 1);
    handleSave(nextAuthRoutes);
  };

  const handleReset = () => {
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

      <ProjectSettingsRuleList
        fields={[
          {
            name: "route",
            placeholder: "/private or /docs/*",
            suggestions: routeSuggestions,
            validateOnChange: (value) =>
              validateProjectAuthRoute(value.trim(), authRoutes),
          },
          { name: "login", placeholder: "Login" },
          { name: "password", placeholder: "Password", type: "password" },
        ]}
        validate={(values) => ({
          route: validateProjectAuthRoute(
            values.route?.trim() ?? "",
            authRoutes
          ),
          ...validateBasicAuthCredentials({
            login: values.login ?? "",
            password: values.password ?? "",
          }),
        })}
        onSubmit={handleAddAuthRoute}
        columns="1fr 1fr"
        columnLabels={["Path", "Login"]}
        label="Authentication rules"
        rules={filteredAuthRoutes.map((authRoute) => ({
          key: authRoute.route,
          values: [
            <Tooltip content={authRoute.route} key="route">
              <Text truncate css={{ wordBreak: "break-all" }}>
                {authRoute.route}
              </Text>
            </Tooltip>,
            <Tooltip content={authRoute.auth.login} key="login">
              <Text truncate>{authRoute.auth.login}</Text>
            </Tooltip>,
          ],
          actions: (
            <SmallIconButton
              variant="destructive"
              icon={<TrashIcon />}
              aria-label={`Delete authentication for ${authRoute.route}`}
              onClick={() =>
                handleDeleteAuthRoute(authRoutes.indexOf(authRoute))
              }
            />
          ),
        }))}
      />
    </Grid>
  );
};
