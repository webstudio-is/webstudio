export const WebmLoading = ({ size = 100 }: { size?: number }) => {
  return (
    <video
      width={size}
      height={size}
      autoPlay
      loop
      muted
      playsInline
      style={{ filter: "drop-shadow(#183dcce3 4px -4px 15px)" }}
    >
      <source
        src={
          "https://user-images.githubusercontent.com/52824/235643318-b7b33a59-08d0-497c-8609-86d119dea257.webm"
        }
        type="video/webm"
      />
    </video>
  );
};
