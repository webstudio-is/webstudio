import { Fragment, useId, useState } from "react";
import { compilePathnamePattern, parsePathnamePattern } from "./url-pattern";
import { Grid, InputField, Label } from "@webstudio-is/design-system";
import { useStore } from "@nanostores/react";
import { $dataSourceVariables } from "~/shared/nano-states";
import type { DataSource } from "@webstudio-is/sdk";

type PathParams = Record<string, string>;

export type AddressBarApi = {
  pathParamNames: string[];
  pathParams: PathParams;
  compiledPath: string;
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

  const compiledPath = compilePathnamePattern(path, pathParams);

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
    if (dataSourceId === undefined) {
      console.error("Cannot save path params because variable is not created");
      return;
    }
    setPathParams(dataSourceId, newParams);
  };

  return {
    pathParamNames,
    pathParams,
    compiledPath,
    updatePathParam,
    savePathParams,
  };
};

export const AddressBar = ({ addressBar }: { addressBar: AddressBarApi }) => {
  const { pathParamNames, pathParams, updatePathParam } = addressBar;
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
    </Grid>
  );
};
