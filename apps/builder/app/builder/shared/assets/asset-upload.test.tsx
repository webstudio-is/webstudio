import { createRef } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { $authPermit } from "~/shared/nano-states";
import { createAssetManagerTestRenderer } from "../asset-manager/test-utils";
import { AssetUpload, type AssetUploadHandle } from "./asset-upload";

const renderer = createAssetManagerTestRenderer();
afterEach(() => {
  renderer.cleanup();
  $authPermit.set("view");
  vi.restoreAllMocks();
});

test("opens the same file input from its imperative action", () => {
  $authPermit.set("build");
  const inputClick = vi
    .spyOn(HTMLInputElement.prototype, "click")
    .mockImplementation(() => {});
  const ref = createRef<AssetUploadHandle>();

  renderer.render(<AssetUpload ref={ref} type="file" folderId="folder" />);
  ref.current?.open();

  expect(inputClick).toHaveBeenCalledOnce();
});
