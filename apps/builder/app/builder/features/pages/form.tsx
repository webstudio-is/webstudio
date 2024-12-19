import { forwardRef, type ReactNode } from "react";

export const Form = forwardRef<
  HTMLFormElement,
  { onSubmit: () => void; children: ReactNode }
>(({ onSubmit, children }, ref) => {
  return (
    <form
      ref={ref}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      style={{ overflow: "auto" }}
    >
      {children}
      <input type="submit" hidden />
    </form>
  );
});
