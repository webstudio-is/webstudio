import * as entri from "entrijs";
import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  globalCss,
  Button,
  Text,
  PanelBanner,
  Flex,
  Link,
} from "@webstudio-is/design-system";
import { trpcClient } from "~/shared/trpc/trpc-client";
import { $userPlanFeatures } from "~/shared/nano-states";
import { extractCname } from "./cname";
import { UploadIcon } from "@webstudio-is/icons";

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
  const userPlanFeatures = useStore($userPlanFeatures);
  const hasPaidPlan = userPlanFeatures.purchases.length > 0;
  const { error, isOpen, showDialog } = useEntri({
    domain,
    dnsRecords,
    onClose,
  });
  const [requestUpgrade, setRequestUpgrade] = useState(false);
  return (
    <>
      {error !== undefined && <Text color="destructive">{error}</Text>}
      <Button
        disabled={isOpen}
        color="primary"
        type="button"
        onClick={() => {
          if (hasPaidPlan) {
            showDialog();
          } else {
            setRequestUpgrade(true);
          }
        }}
      >
        Setup automatically with Entri
      </Button>
      {requestUpgrade && (
        <PanelBanner>
          <Text>
            Please upgrade to the Pro plan or higher to use automatic domain
            configuration.
          </Text>
          <Flex align="center" gap={1}>
            <UploadIcon />
            <Link
              color="inherit"
              target="_blank"
              href="https://webstudio.is/pricing"
            >
              Upgrade to Pro
            </Link>
          </Flex>
        </PanelBanner>
      )}
    </>
  );
};
