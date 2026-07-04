import { useEffect, useState } from "react";
import { sourceIconUrl, sourceKindClass, sourceKindIconText } from "../data";

interface SourceIconProps {
  className: string;
  kind: string;
  sourceName: string;
  sourceAvatarUrl?: string;
  sourceHostname?: string;
  sourceIconHostname?: string;
}

export function SourceIcon({
  className,
  kind,
  sourceName,
  sourceAvatarUrl,
  sourceHostname,
  sourceIconHostname
}: SourceIconProps) {
  const iconUrl = sourceIconUrl(kind, sourceAvatarUrl, sourceHostname, sourceIconHostname);
  const [imageAvailable, setImageAvailable] = useState(Boolean(iconUrl));

  useEffect(() => {
    setImageAvailable(Boolean(iconUrl));
  }, [iconUrl]);

  return (
    <span className={`${className} ${sourceKindClass(kind)} ${imageAvailable ? "has-source-image" : ""}`}>
      {imageAvailable ? (
        <img alt="" src={iconUrl} onError={() => setImageAvailable(false)} loading="lazy" decoding="async" />
      ) : (
        sourceKindIconText(kind, sourceName)
      )}
    </span>
  );
}
