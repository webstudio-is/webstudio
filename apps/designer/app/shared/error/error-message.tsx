import { publish } from "@webstudio-is/sdk";
import { useEffect } from "react";

export const ErrorMessage = ({ message }: { message: string }) => {
  useEffect(() => {
    publish({ type: "canvasWidth", payload: 600 });
  }, []);
  return (
    <div>
      <h1>Error</h1>
      <pre>{message}</pre>
    </div>
  );
};
