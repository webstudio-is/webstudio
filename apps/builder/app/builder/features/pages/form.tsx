export const Form = ({
  onSubmit,
  children,
}: {
  onSubmit: () => void;
  children: JSX.Element;
}) => {
  return (
    <form
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
};
