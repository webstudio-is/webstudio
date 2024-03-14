import useScript from "react-script-hook";
import { globalCss } from "@webstudio-is/design-system";
import { useCallback, useEffect, useRef, useState } from "react";
import { trpcClient } from "../trpc/trpc-client";

const scriptAttributes = {
  async: true,
  defer: true,
  importance: "low",
  src: "https://cdn.goentri.com/entri.js",
};

// https://developers.entri.com/docs/install
export type DnsRecord = {
  type: "CNAME" | "TXT";
  host: string;
  value: string;
  ttl: number;
};

// https://developers.entri.com/docs/integrate-with-dns-providers
export type EntriCloseDetail = {
  domain: string;
  lastStatus:
    | "FINISHED_SUCCESSFULLY"
    | "IN_PROGRESS"
    | "EXISTING_RECORDS"
    | "LOGIN"
    | "MANUAL_CONFIGURATION"
    | "EXIT_WITH_ERROR"
    | "DKIM_SETUP";

  provider: string;
  setupType: "automatic" | "manual" | "sharedLogin" | null;
  success: boolean;
};

declare global {
  interface Window {
    // https://developers.entri.com/docs/api-reference
    entri?: {
      showEntri: (options: {
        applicationId: string;
        token: string;
        dnsRecords: DnsRecord[];
        prefilledDomain: string;
      }) => void;
    };
  }

  // https://developers.entri.com/docs/integrate-with-dns-providers
  interface WindowEventMap {
    onEntriClose: CustomEvent<EntriCloseDetail>;
  }
}

/**
 * Our FloatingPanelPopover adds pointerEvents: "none" to the body.
 * We open the entry dialog from the popover, so we need to allow pointer events on the entri dialog.
 */
export const entriGlobalStyles = globalCss({
  body: {
    "&>#entriApp": {
      pointerEvents: "all",
    },
  },
});

type UseEntriProps = {
  domain: string;
  onClose: (detail: EntriCloseDetail) => void;
  dnsRecords: DnsRecord[];
};

export const useEntri = ({ domain, dnsRecords, onClose }: UseEntriProps) => {
  const [isScriptLoading, scriptLoadingError] = useScript(scriptAttributes);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const showDialogInternalRef = useRef<
    undefined | ((token: string, applicationId: string) => void)
  >(undefined);

  const {
    load: entriTokenLoad,
    data: entriTokenData,
    error: entriTokenSystemError,
  } = trpcClient.domain.getEntriToken.useQuery();

  useEffect(() => {
    const handleOnEntriClose = (event: CustomEvent<EntriCloseDetail>) => {
      if (event.detail.domain !== domain) {
        return;
      }

      onClose(event.detail);
      setIsOpen(false);
    };

    window.addEventListener("onEntriClose", handleOnEntriClose, false);

    return () => {
      window.removeEventListener("onEntriClose", handleOnEntriClose);
    };
  }, [domain, onClose]);

  const showDialogInternal = useCallback(
    (token: string, applicationId: string) => {
      const entri = window.entri;

      if (entri === undefined) {
        if (isScriptLoading) {
          setError("Entri is not loaded, try again later");
          return;
        }

        setError("Entri is not loaded");
        return;
      }

      entri.showEntri({
        applicationId,
        token,
        dnsRecords,
        prefilledDomain: domain,
      });
    },
    [dnsRecords, domain, isScriptLoading]
  );

  showDialogInternalRef.current = showDialogInternal;

  const showDialog = useCallback(() => {
    setIsOpen(true);
    entriTokenLoad(undefined, (data) => {
      if (data.success === false) {
        return;
      }

      if (showDialogInternalRef.current === undefined) {
        return;
      }

      const { token, applicationId } = data;

      showDialogInternalRef.current(token, applicationId);
    });
  }, [entriTokenLoad]);

  return {
    isOpen,
    showDialog,
    error:
      error ??
      entriTokenSystemError ??
      scriptLoadingError?.message ??
      (entriTokenData?.success === false ? entriTokenData.error : undefined),
  };
};
