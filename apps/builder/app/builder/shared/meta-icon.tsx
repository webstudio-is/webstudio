type Props = {
  size?: number | string;
  icon: string;
};

export const MetaIcon = ({ size = 16, icon }: Props) => {
  return (
    <div
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: icon }}
    />
  );
};
