import type { BuilderNamespace } from "../contracts/namespaces";
import type { BuilderPatchChange } from "../contracts/patch";

export type BuilderRuntimeMutation<
  Result extends Record<string, unknown> = Record<string, unknown>,
> = {
  kind: "mutation";
  payload: BuilderPatchChange[];
  result: Result;
  invalidatesNamespaces: readonly BuilderNamespace[];
  noop: boolean;
};

export const createRuntimeMutation = <
  Result extends Record<string, unknown> = Record<string, unknown>,
>({
  payload,
  result,
  invalidatesNamespaces,
}: {
  payload: BuilderPatchChange[];
  result: Result;
  invalidatesNamespaces: readonly BuilderNamespace[];
}): BuilderRuntimeMutation<Result> => ({
  kind: "mutation",
  payload,
  result,
  invalidatesNamespaces,
  noop: payload.length === 0,
});
