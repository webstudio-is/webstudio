import { useEffect, useState, type ReactNode } from "react";
import {
  setRequestFixture,
  type RequestFixture as Handler,
} from "../../../../../.storybook/request-fixtures";

/** Keep clients real; provide local HTTP responses before mounting their UI. */
export const RequestFixture = ({
  request,
  children,
}: {
  request: Handler;
  children: ReactNode;
}) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const restore = setRequestFixture(request);
    setReady(true);
    return () => {
      setReady(false);
      restore();
    };
  }, [request]);
  return ready ? children : null;
};
