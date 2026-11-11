import {
  copyDesignToken,
  copyStyleSourceTransfer,
} from "@webstudio-is/project-build/runtime";
import {
  parseReusableStyleSourceTransferData,
  parseTokenTransferData,
} from "@webstudio-is/project-build/transfer";
import { $project } from "~/shared/sync/data-stores";
import { $selectedInstance } from "~/shared/nano-states";
import {
  executeRuntimeMutation,
  getWebstudioData,
} from "../instance-utils/data";
import { builderApi } from "../builder-api";
import { pasteHandled, pasteIgnored, type Plugin } from "./copy-paste";
import { transferFragmentAssets } from "./asset-transfer-utils";

export const copyTokenData = (tokenId: string) =>
  copyDesignToken(getWebstudioData(), {
    tokenId,
    sourceOrigin: window.location.origin,
  }).data;

export const copyReusableStyleSourceData = (
  styleSourceId: string,
  sourceType: "tag" | "local"
) =>
  copyStyleSourceTransfer(getWebstudioData(), {
    styleSourceId,
    sourceType,
    sourceOrigin: window.location.origin,
  }).data;

export const styleSource: Plugin = {
  name: "style-source",
  mimeType: "text/plain",
  onPaste: async (data) => {
    const token = parseTokenTransferData(data);
    const reusable = token.owned
      ? undefined
      : parseReusableStyleSourceTransferData(data);
    const parsed = token.owned ? token : reusable!;
    const sourceType = reusable?.valid
      ? reusable.data.fragment.styleSources[0]?.type
      : undefined;
    const cannotPaste = reusable?.owned
      ? "Style source cannot be pasted here"
      : "Token cannot be pasted here";
    if (parsed.owned === false) {
      return pasteIgnored;
    }
    if (parsed.valid === false) {
      return {
        success: false,
        error: reusable?.owned
          ? "Invalid style source data"
          : "Invalid token data",
      };
    }
    const projectId = $project.get()?.id;
    const instanceId = $selectedInstance.get()?.id;
    if (projectId === undefined) {
      return { success: false, error: "Project is unavailable" };
    }
    if (sourceType !== "tag" && instanceId === undefined) {
      return { success: false, error: cannotPaste };
    }
    try {
      const transfer = await transferFragmentAssets({
        sourceOrigin: parsed.data.sourceOrigin,
        projectId,
        fragments: [parsed.data.fragment],
        importAssets: builderApi.importAssets,
      });
      if (transfer.success === false) {
        return { success: false, error: transfer.error };
      }
      if (
        $project.get()?.id !== projectId ||
        $selectedInstance.get()?.id !== instanceId
      ) {
        return { success: false, error: "Project changed while pasting." };
      }
      const result = executeRuntimeMutation({
        id: "designTokens.paste",
        input: { instanceId, data, assetIds: [...transfer.assetIds] },
      });
      return result === undefined
        ? { success: false, error: cannotPaste }
        : pasteHandled;
    } catch {
      return { success: false, error: cannotPaste };
    }
  },
};
