import { useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";

/**
 * Safary/FF doesn't allow to set cookies from third party domains. Without explicit permission from the user.
 * Permission is granted by calling document.requestStorageAccess() method inside click handler.
 **/
export const StorageAccessRequest = () => {
  const fetcher = useFetcher();
  const [showRequestStorageAccess, setShowRequestStorageAccess] =
    useState(true);

  useEffect(() => {
    if (document.hasStorageAccess === undefined) {
      // Chrome has no document.hasStorageAccess just submit to the server
      fetcher.submit({}, { method: "post" });
      return;
    }

    document.hasStorageAccess().then((hasAccess) => {
      if (hasAccess) {
        // Safari already has access no need in requestStorageAccess
        fetcher.submit({}, { method: "post" });
        return;
      }
    });

    setShowRequestStorageAccess(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRequestStorageAccess = () => {
    document.requestStorageAccess().then(() => {
      // Safari now has access
      fetcher.submit({}, { method: "post" });
    });
  };

  return (
    <div>
      {showRequestStorageAccess && (
        <button onClick={handleRequestStorageAccess}>
          REQUEST STORAGE ACCESS
        </button>
      )}
    </div>
  );
};
