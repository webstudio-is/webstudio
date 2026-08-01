import { afterEach, describe, expect, test, vi } from "vitest";
import { toast } from "@webstudio-is/design-system";
import { $publishDialog } from "../../shared/nano-states";
import { showPublishWarning } from "./publish-warning";

describe("publish warning", () => {
  afterEach(() => {
    $publishDialog.set("none");
    vi.restoreAllMocks();
  });

  test.each(["publish", "export"] as const)(
    "shows the warning inline without a duplicate toast while the %s popover is open",
    (publishDialog) => {
      const toastWarn = vi.spyOn(toast, "warn").mockImplementation(() => "");
      const setWarning = vi.fn();
      const message = <span>Invalid HTML</span>;
      $publishDialog.set(publishDialog);

      showPublishWarning({ message, setWarning });

      expect(setWarning).toHaveBeenCalledWith(message);
      expect(toastWarn).not.toHaveBeenCalled();
    }
  );

  test("shows a toast when the publish popover is closed", () => {
    const toastWarn = vi.spyOn(toast, "warn").mockImplementation(() => "");
    const setWarning = vi.fn();
    const message = <span>Invalid HTML</span>;

    showPublishWarning({ message, setWarning });

    expect(setWarning).toHaveBeenCalledWith(message);
    expect(toastWarn).toHaveBeenCalledWith(message);
  });
});
