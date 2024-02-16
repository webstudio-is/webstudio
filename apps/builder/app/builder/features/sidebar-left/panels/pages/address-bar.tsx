import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { useEffect, useId, useState } from "react";
import {
  Button,
  Flex,
  Grid,
  InputField,
  Label,
  Tooltip,
  theme,
  textVariants,
  InputErrorsTooltip,
} from "@webstudio-is/design-system";
import { CheckMarkIcon, CopyIcon, LinkIcon } from "@webstudio-is/icons";
import type { DataSource } from "@webstudio-is/sdk";
import { $dataSourceVariables, $domains, $project } from "~/shared/nano-states";
import env from "~/shared/env";
import {
  compilePathnamePattern,
  parsePathnamePattern,
  tokenizePathnamePattern,
} from "./url-pattern";
import { $userPlanFeatures } from "~/builder/shared/nano-states";

const $publishedOrigin = computed([$project, $domains], (project, domains) => {
  const customDomain: string | undefined = domains[0];
  const projectDomain = `${project?.domain}.${
    env.PUBLISHER_HOST ?? "wstd.work"
  }`;
  const domain = customDomain ?? projectDomain;
  const publishedUrl = new URL(`https://${domain}`);
  return publishedUrl.origin;
});

type PathParams = Record<string, string>;

export type AddressBarApi = {
  path: string;
  pathParams: PathParams;
  pageUrl: string;
  updatePathParam: (name: string, value: string) => void;
  savePathParams: () => void;
};

const setPathParams = (
  dataSourceId: DataSource["id"],
  newParams: PathParams
) => {
  const dataSourceVariables = new Map($dataSourceVariables.get());
  dataSourceVariables.set(dataSourceId, newParams);
  $dataSourceVariables.set(dataSourceVariables);
};

export const useAddressBar = ({
  path,
  dataSourceId,
}: {
  path: string;
  dataSourceId?: string;
}): AddressBarApi => {
  const pathParamNames = parsePathnamePattern(path);
  const [localParams, setLocalParams] = useState<PathParams>({});
  const dataSourceVariables = useStore($dataSourceVariables);
  const storedParams =
    dataSourceId === undefined
      ? undefined
      : (dataSourceVariables.get(dataSourceId) as Record<string, string>);
  const pathParams = storedParams ?? localParams;

  const publishedOrigin = useStore($publishedOrigin);
  const tokens = tokenizePathnamePattern(path);
  const compiledPath = compilePathnamePattern(tokens, pathParams);
  const pageUrl = `${publishedOrigin}${compiledPath}`;

  const updatePathParam: AddressBarApi["updatePathParam"] = (name, value) => {
    // delete stale fields
    const newParams: Record<string, string> = {};
    for (const name of pathParamNames) {
      newParams[name] = pathParams[name] ?? "";
    }
    newParams[name] = value;
    setLocalParams(newParams);
    if (dataSourceId) {
      setPathParams(dataSourceId, newParams);
    }
  };

  const savePathParams: AddressBarApi["savePathParams"] = () => {
    const newParams: Record<string, string> = {};
    for (const name of pathParamNames) {
      newParams[name] = pathParams[name] ?? "";
    }
    if (dataSourceId) {
      setPathParams(dataSourceId, newParams);
    }
  };

  return {
    path,
    pathParams,
    pageUrl,
    updatePathParam,
    savePathParams,
  };
};

const CopyPageUrl = ({
  pageUrl,
  disabled,
}: {
  pageUrl: string;
  disabled: boolean;
}) => {
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

  let copyIcon = (
    <>
      <LinkIcon
        style={{ display: "var(--ws-address-bar-link-icon-display, block)" }}
      />
      <CopyIcon
        style={{ display: "var(--ws-address-bar-copy-icon-display, none)" }}
      />
    </>
  );
  if (copyState === "copied") {
    copyIcon = <CheckMarkIcon />;
  }

  const parsed = new URL(pageUrl);
  const pageDomainAndPath = `${parsed.host}${parsed.pathname}`;

  return (
    <Tooltip
      // keep tooltip open when user just copied
      open={copyState === "copied" ? true : undefined}
      content={copyState === "copied" ? "Copied" : "Click to copy"}
    >
      <Button
        color="ghost"
        type="button"
        disabled={disabled}
        onClick={() => {
          navigator.clipboard.writeText(pageUrl);
          setCopyState("copied");
        }}
        prefix={copyIcon}
        css={{
          justifySelf: "start",
          "&:hover": {
            "--ws-address-bar-link-icon-display": "none",
            "--ws-address-bar-copy-icon-display": "block",
          },
        }}
      >
        {pageDomainAndPath}
      </Button>
    </Tooltip>
  );
};

export const AddressBar = ({ addressBar }: { addressBar: AddressBarApi }) => {
  const { path, pathParams, pageUrl, updatePathParam } = addressBar;
  const id = useId();
  const { allowDynamicData } = useStore($userPlanFeatures);

  const tokens = tokenizePathnamePattern(path);
  const hasParams = tokens.length > 1;

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

  return (
    <Grid gap={1}>
      {allowDynamicData && hasParams && (
        <>
          <Label htmlFor={id}>Address Bar</Label>
          <InputErrorsTooltip errors={Array.from(errors.values())}>
            <Flex
              align="center"
              css={{
                padding: theme.spacing[5],
                // background: theme.colors.white,
                borderRadius: theme.borderRadius[4],
                border: `1px solid ${theme.colors.borderMain}`,
                ...textVariants.mono,
              }}
            >
              {tokens.map((token, index) => {
                if (token.type === "fragment") {
                  return token.value;
                }
                if (token.type === "param") {
                  return (
                    <InputField
                      key={index}
                      fieldSizing="content"
                      css={{
                        margin: `0 ${theme.spacing[3]}`,
                        minWidth: theme.spacing[15],
                      }}
                      color={errors.has(token.name) ? "error" : undefined}
                      id={`${id}-${token.name}`}
                      placeholder={token.name}
                      value={pathParams[token.name] ?? ""}
                      onChange={(event) =>
                        updatePathParam(token.name, event.target.value)
                      }
                    />
                  );
                }
                token satisfies never;
              })}
            </Flex>
          </InputErrorsTooltip>
        </>
      )}

      <CopyPageUrl
        pageUrl={pageUrl}
        disabled={errors.size > 0 || (allowDynamicData === false && hasParams)}
      />
    </Grid>
  );
};
