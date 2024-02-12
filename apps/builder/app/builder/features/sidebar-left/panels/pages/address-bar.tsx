import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { Fragment, useEffect, useId, useState } from "react";
import {
  Button,
  Grid,
  InputField,
  Label,
  Tooltip,
} from "@webstudio-is/design-system";
import { CheckMarkIcon, CopyIcon, LinkIcon } from "@webstudio-is/icons";
import type { DataSource } from "@webstudio-is/sdk";
import { $dataSourceVariables, $domains, $project } from "~/shared/nano-states";
import env from "~/shared/env";
import { compilePathnamePattern, parsePathnamePattern } from "./url-pattern";

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
  pathParamNames: string[];
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
  const compiledPath = compilePathnamePattern(path, pathParams);
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
    pathParamNames,
    pathParams,
    pageUrl,
    updatePathParam,
    savePathParams,
  };
};

const CopyPageUrl = ({ pageUrl }: { pageUrl: string }) => {
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
  const { pathParamNames, pathParams, pageUrl, updatePathParam } = addressBar;
  const id = useId();

  return (
    <Grid gap={1}>
      {pathParamNames.map((name) => (
        <Fragment key={name}>
          <Label htmlFor={`${id}-${name}`}>{name}</Label>
          <InputField
            tabIndex={1}
            id={`${id}-${name}`}
            value={pathParams[name] ?? ""}
            onChange={(event) => updatePathParam(name, event.target.value)}
          />
        </Fragment>
      ))}
      <CopyPageUrl pageUrl={pageUrl} />
    </Grid>
  );
};
