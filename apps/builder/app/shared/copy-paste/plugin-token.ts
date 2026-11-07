import { copyDesignToken } from "@webstudio-is/project-build/runtime";
import {
  parseTokenTransferData,
  tokenTransferDataVersion,
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

export const token: Plugin = {
  name: "token",
  mimeType: "text/plain",
  onPaste: async (data) => {
    const parsed = parseTokenTransferData(data);
    if (parsed.owned === false) {
      return pasteIgnored;
    }
    if (parsed.valid === false) {
      return { success: false, error: "Invalid token data" };
    }
    const projectId = $project.get()?.id;
    const instanceId = $selectedInstance.get()?.id;
    if (projectId === undefined) {
      return { success: false, error: "Project is unavailable" };
    }
    if (instanceId === undefined) {
      return { success: false, error: "Token cannot be pasted here" };
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
      const fragment = transfer.fragments.get(parsed.data.fragment);
      if (fragment === undefined) {
        return {
          success: false,
          error: "Token assets could not be transferred",
        };
      }
      const result = executeRuntimeMutation({
        id: "designTokens.paste",
        input: {
          instanceId,
          data: JSON.stringify({
            [tokenTransferDataVersion]: { ...parsed.data, fragment },
          }),
        },
      });
      return result === undefined
        ? { success: false, error: "Token cannot be pasted here" }
        : pasteHandled;
    } catch {
      return { success: false, error: "Token cannot be pasted here" };
    }
  },
};
