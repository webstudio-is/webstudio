import { forwardRef, type ElementRef, type ReactNode } from "react";

const requestCopy = (selector: string) => {
  window.parent.postMessage({ type: "requestCopy", payload: selector });
};

type Props = {
  children?: ReactNode;
};

export const MarketplaceItem = forwardRef<ElementRef<"div">, Props>(
  ({ children, ...props }, ref) => {
    return (
      <div
        {...props}
        ref={ref}
        style={{ display: children ? "contents" : "block" }}
      >
        {children}
        <button
          onClick={() => {
            requestCopy(props["ws-data-selector"]);
          }}
        >
          Copy
        </button>
      </div>
    );
  }
);

MarketplaceItem.displayName = "MarketplaceItem";
