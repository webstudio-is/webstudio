import * as entri from "entrijs";
import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { globalCss, Button, Text, toast } from "@webstudio-is/design-system";
import { trpcClient } from "~/shared/trpc/trpc-client";
import { $userPlanFeatures } from "~/shared/nano-states";
import { extractCname } from "./cname";

// https://developers.entri.com/docs/install
type DnsRecord = {
  type: "CNAME" | "ALIAS" | "TXT";
  host: string;
  value: string;
  ttl: number;
};

type EntriCloseEvent = CustomEvent<entri.EntriCloseEventDetail>;

declare global {
  // https://developers.entri.com/docs/integrate-with-dns-providers
  interface WindowEventMap {
    onEntriClose: EntriCloseEvent;
  }
}

/**
 * Our FloatingPanelPopover adds pointerEvents: "none" to the body.
 * We open the entry dialog from the popover, so we need to allow pointer events on the entri dialog.
 */
const entriGlobalStyles = globalCss({
  body: {
    "&>#entriApp": {
      pointerEvents: "auto",
    },
  },
});

type EntriProps = {
  domain: string;
  dnsRecords: DnsRecord[];
  onClose: (detail: entri.EntriCloseEventDetail) => void;
};

const useEntri = ({ domain, dnsRecords, onClose }: EntriProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    load: entriTokenLoad,
    data: entriTokenData,
    error: entriTokenSystemError,
  } = trpcClient.domain.getEntriToken.useQuery();

  useEffect(() => {
    const handleOnEntriClose = (event: EntriCloseEvent) => {
      if (event.detail.domain === domain) {
        onClose(event.detail);
        setIsOpen(false);
      }
    };
    window.addEventListener("onEntriClose", handleOnEntriClose, false);
    return () => {
      window.removeEventListener("onEntriClose", handleOnEntriClose, false);
    };
  }, [domain, onClose]);

  const showDialog = () => {
    setIsOpen(true);
    entriTokenLoad(undefined, async (data) => {
      if (data.success) {
        await entri.showEntri({
          applicationId: data.applicationId,
          token: data.token,
          dnsRecords,
          prefilledDomain: domain,
          // add redirect to www only when registered domain has www subdomain
          wwwRedirect: extractCname(domain) === "www",
        });
      }
    });
  };

  return {
    isOpen,
    showDialog,
    error:
      entriTokenSystemError ??
      (entriTokenData?.success === false ? entriTokenData.error : undefined),
  };
};

export const Entri = ({ domain, dnsRecords, onClose }: EntriProps) => {
  entriGlobalStyles();
  const { hasProPlan } = useStore($userPlanFeatures);
  const { error, isOpen, showDialog } = useEntri({
    domain,
    dnsRecords,
    onClose,
  });
  return (
    <>
      {error !== undefined && <Text color="destructive">{error}</Text>}
      <Button
        disabled={isOpen}
        color="neutral"
        css={{ width: "100%", flexShrink: 0 }}
        type="button"
        onClick={() => {
          // @todo temporary for testing
          if (hasProPlan) {
            showDialog();
          } else {
            toast.error(
              "Please upgrade to the Pro plan or higher to use automatic domain configuration."
            );
          }
        }}
      >
        Configure automatically
      </Button>
    </>
  );
};
