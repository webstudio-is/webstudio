import { useSearchParams } from "@remix-run/react";
import { parse, readLocal, setLocal } from "@webstudio-is/feature-flags";
import { useEffect } from "react";

// Allows to set feature flags via URL parameter features=name1,name2,name3
export const useSetFeatures = () => {
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const features = searchParams.get("features");
    if (features) {
      const currentFlags = readLocal();
      for (const flag of parse(features)) {
        if (currentFlags.includes(flag) === false) {
          currentFlags.push(flag);
        }
      }
      setLocal(currentFlags.join(","));
    }
  }, [searchParams]);
};
