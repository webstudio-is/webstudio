import { useEffect } from "react";
import { publish } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    canvasWidth: number;
  }
}

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
