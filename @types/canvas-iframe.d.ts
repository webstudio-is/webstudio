declare namespace JSX {
  interface IntrinsicElements {
    iframe: React.DetailedHTMLProps<
      React.IframeHTMLAttributes<HTMLIFrameElement> & {
        credentialless?: "true";
      },
      HTMLIFrameElement
    >;
  }
}
