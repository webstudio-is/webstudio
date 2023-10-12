import { useSearchParams } from "@remix-run/react";
import { setLocal } from "@webstudio-is/feature-flags";
import { useEffect } from "react";

// Allows to set feature flags via URL parameter features=name1,name2,name3
export const useSetFeatures = () => {
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const features = searchParams.get("features");
    if (features) {
      setLocal(features);
    }
  }, [searchParams]);
};
