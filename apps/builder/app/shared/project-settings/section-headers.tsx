import { useState } from "react";
import { useStore } from "@nanostores/react";
import {
  Flex,
  Grid,
  LinkButton,
  ProChip,
  SmallIconButton,
  Text,
  Tooltip,
  cssVar,
  theme,
} from "@webstudio-is/design-system";
import { InfoCircleIcon, TrashIcon } from "@webstudio-is/icons";
import {
  customResponseHeader,
  customResponseHeaders,
  getResponseHeaderDefinition,
  type CustomResponseHeader,
} from "@webstudio-is/sdk";
import { validateWsAuthRoute } from "@webstudio-is/wsauth";
import { $pages, $projectSettings } from "~/shared/sync/data-stores";
import { $permissions } from "~/shared/nano-states";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { ProjectSettingsRuleList } from "./rule-list";
import {
  getResponseHeaderName,
  getResponseHeaderValueSuggestions,
  responseHeaderNames,
} from "./response-header-suggestions";
import { getExistingRoutePaths, sectionSpacing } from "./utils";

const ruleKey = (route: string, name: string) =>
  `${route}\0${name.toLowerCase()}`;

export const SectionHeaders = () => {
  const { allowDynamicData } = useStore($permissions);
  const settings = useStore($projectSettings);
  const pages = useStore($pages);
  const [saveError, setSaveError] = useState("");
  const configured = settings?.meta.customHeaders ?? [];
  const routeSuggestions = [
    ...new Set(["/*", "/", ...Array.from(getExistingRoutePaths(pages)).sort()]),
  ];

  const save = (
    next: CustomResponseHeader | undefined,
    previousKey?: string
  ) => {
    const headers = ($projectSettings.get()?.meta.customHeaders ?? []).filter(
      (header) => ruleKey(header.route ?? "/*", header.name) !== previousKey
    );
    if (next !== undefined) {
      headers.unshift(next);
    }
    const result = customResponseHeaders.safeParse(headers);
    if (!result.success) {
      setSaveError(
        result.error.issues.map((issue) => issue.message).join(". ")
      );
      return false;
    }
    try {
      const mutation = executeRuntimeMutation({
        id: "projectSettings.update",
        input: {
          meta: { customHeaders: result.data.length ? result.data : null },
        },
      });
      if (mutation !== undefined) {
        setSaveError("");
        return true;
      }
    } catch {
      // Keep the form values or existing row available for retry.
    }
    setSaveError("Changes could not be saved. Please try again.");
    return false;
  };

  return (
    <Grid gap={3} css={sectionSpacing}>
      <Flex align="center" gap={1}>
        <Text variant="titles">Headers</Text>
        {allowDynamicData === false && <ProChip>Pro</ProChip>}
        <Tooltip
          variant="wrapped"
          content={
            <>
              <Text>
                Set response headers for all paths or a route. Routes use the
                same syntax as Authentication, including :params and *.
              </Text>
              <br />
              <Text>
                /* applies to every path; / applies only to the root. Webstudio
                Cloud supplies CSP, X-Frame-Options, and Referrer-Policy when
                they are not set. X-Powered-By, X-Content-Type-Options, and
                Strict-Transport-Security are managed by the platform and cannot
                be configured here. Cookie, connection, and response-body
                framing headers are also unavailable. Publish to apply changes.
              </Text>
              {allowDynamicData === false && (
                <>
                  <br />
                  <Text>
                    Custom headers on a custom domain require Pro. Defaults and
                    staging are free.
                  </Text>
                  <LinkButton
                    color="primary"
                    css={{ marginTop: theme.spacing[5], width: "100%" }}
                    href="https://webstudio.is/pricing"
                    target="_blank"
                  >
                    Upgrade
                  </LinkButton>
                </>
              )}
            </>
          }
        >
          <InfoCircleIcon
            color={cssVar("--foreground-secondary")}
            tabIndex={0}
            aria-label="About response headers"
          />
        </Tooltip>
      </Flex>
      {saveError && <Text color="destructive">{saveError}</Text>}
      <ProjectSettingsRuleList
        fields={[
          {
            name: "route",
            placeholder: "/* or /private/*",
            suggestions: routeSuggestions,
          },
          {
            name: "name",
            placeholder: "Header name",
            suggestions: responseHeaderNames,
          },
          {
            name: "value",
            placeholder: "Header value",
            suggestions: (values) =>
              getResponseHeaderValueSuggestions(values.name ?? ""),
          },
        ]}
        validate={(values) => {
          const route = values.route?.trim() ?? "";
          const name = values.name?.trim() ?? "";
          const value = values.value?.trim() ?? "";
          const errors: Record<string, string[]> = {};
          const routeError = validateWsAuthRoute(route);
          if (routeError) {
            errors.route = [routeError];
          }
          if (
            value === "" &&
            (route === "/*" || getResponseHeaderDefinition(name) !== undefined)
          ) {
            errors.value = ["Enter a header value"];
          }
          const result = customResponseHeader.safeParse({
            route,
            name,
            value: value === "" ? null : value,
          });
          if (!result.success) {
            for (const issue of result.error.issues) {
              const field = String(issue.path[0] ?? "value");
              (errors[field] ??= []).push(issue.message);
            }
          }
          return errors;
        }}
        onSubmit={(values) => {
          const route = values.route.trim();
          const value = values.value?.trim();
          const name =
            getResponseHeaderName(values.name.trim()) ?? values.name.trim();
          const next: CustomResponseHeader = {
            ...(route === "/*" ? {} : { route }),
            name,
            value: value || null,
          };
          return save(next, ruleKey(route, name));
        }}
        columns="1fr 1.5fr 1.5fr"
        columnLabels={["Path", "Header", "Value"]}
        label="Response header rules"
        rules={configured.map((header) => {
          const route = header.route ?? "/*";
          const key = ruleKey(route, header.name);
          const value =
            header.value ??
            (getResponseHeaderDefinition(header.name) ? "Default" : "Not sent");
          return {
            key,
            values: [
              <Tooltip content={route} key="route">
                <Text truncate>{route}</Text>
              </Tooltip>,
              <Tooltip content={header.name} key="name">
                <Text truncate>{header.name}</Text>
              </Tooltip>,
              <Tooltip content={value} key="value">
                <Text truncate>{value}</Text>
              </Tooltip>,
            ],
            actions: (
              <SmallIconButton
                variant="destructive"
                icon={<TrashIcon />}
                aria-label={`Remove ${header.name} for ${route}`}
                onClick={() => {
                  save(undefined, key);
                }}
              />
            ),
          };
        })}
      />
    </Grid>
  );
};
