export const ErrorMessage = ({ message }: { message: string }) => {
  return (
    <div>
      <h1>Error</h1>
      <pre>{message}</pre>
    </div>
  );
};
