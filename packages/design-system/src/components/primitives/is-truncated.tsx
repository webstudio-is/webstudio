import { type RefObject, useState, useEffect } from "react";

/**
 * Checks whether text was truncated in an element with `text-overflow: ellipsis`
 */
export const useIsTruncated = (
  ref: RefObject<null | HTMLElement>,
  text: string
) => {
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    if (ref.current) {
      const { offsetWidth, scrollWidth } = ref.current;
      // https://stackoverflow.com/a/10017343/478603
      setIsTruncated(offsetWidth < scrollWidth);
    }

    // ref is in dependencies just to make eslint happy
  }, [ref, text]);

  return isTruncated;
};
