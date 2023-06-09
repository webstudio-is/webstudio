import useScript from "react-script-hook";
import type { DomainRouter } from "@webstudio-is/domain/index.server";
import { createTrpcFetchProxy } from "~/shared/remix/trpc-remix-proxy";
import { builderDomainsPath } from "~/shared/router-utils";
import { Button, Text, globalCss } from "@webstudio-is/design-system";
import { useEffect, useState } from "react";

const trpc = createTrpcFetchProxy<DomainRouter>(builderDomainsPath);

const scriptAttributes = {
  async: true,
  defer: true,
  importance: "low",
  src: "https://cdn.goentri.com/entri.js",
};

// https://developers.entri.com/docs/install
type DnsRecord = {
  type: "CNAME" | "TXT";
  host: string;
  value: string;
  ttl: number;
};

// https://developers.entri.com/docs/integrate-with-dns-providers
type EntriCloseDetail = {
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
    entri: {
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
const globalStyles = globalCss({
  body: {
    "&>#entriApp": {
      pointerEvents: "all",
    },
  },
});

export const Entri = ({
  dnsRecords,
  domain,
  onSuccess,
  onClose,
}: {
  dnsRecords: DnsRecord[];
  domain: string;
  onSuccess: () => void;
  onClose: () => void;
}) => {
  globalStyles();

  const [isEntriOpen, setIsEntriOpen] = useState(false);
  const [isScriptLoading, scriptLoadingError] = useScript(scriptAttributes);

  const {
    load: entriTokenLoad,
    data: entriTokenData,
    error: entriTokenSystemError,
  } = trpc.getEntriToken.useQuery();

  useEffect(() => {
    const handleOnEntriClose = (event: CustomEvent<EntriCloseDetail>) => {
      if (event.detail.domain !== domain) {
        return;
      }

      setIsEntriOpen(false);

      if (event.detail.success) {
        onSuccess();
        return;
      }
      onClose();
    };

    window.addEventListener("onEntriClose", handleOnEntriClose, false);

    return () => {
      window.removeEventListener("onEntriClose", handleOnEntriClose);
    };
  }, [domain, onSuccess]);

  return (
    <>
      {entriTokenSystemError !== undefined && (
        <Text color="destructive">{entriTokenSystemError}</Text>
      )}

      {entriTokenData?.success === false && (
        <Text color="destructive">{entriTokenData.error}</Text>
      )}

      {scriptLoadingError !== null && (
        <Text color="destructive">{scriptLoadingError.message}</Text>
      )}

      <Button
        disabled={isEntriOpen || isScriptLoading || scriptLoadingError !== null}
        color="neutral"
        css={{ width: "100%", flexShrink: 0 }}
        onClick={() => {
          setIsEntriOpen(true);

          entriTokenLoad(undefined, (data) => {
            if (data.success) {
              const { token, applicationId } = data;
              const entri = window.entri;
              if (entri) {
                entri.showEntri({
                  applicationId,
                  token,
                  dnsRecords,
                  prefilledDomain: domain,
                });
              }
            }
          });
        }}
      >
        Configure automatically with entri
      </Button>
    </>
  );
};
