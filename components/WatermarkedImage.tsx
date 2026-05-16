import React from "react";

type WatermarkVariant = "default" | "page" | "hero" | "subtle";

type WatermarkedImageProps = {
  src: string;
  alt: string;
  className?: string;
  variant?: WatermarkVariant;
  showCornerMark?: boolean;
  showDiagonalMark?: boolean;
  showPatternMark?: boolean;
  objectFit?: "cover" | "contain";
};

const variantDefaults: Record<WatermarkVariant, {
  showCornerMark: boolean;
  showDiagonalMark: boolean;
  showPatternMark: boolean;
}> = {
  default: { showCornerMark: true, showDiagonalMark: false, showPatternMark: false },
  subtle: { showCornerMark: true, showDiagonalMark: false, showPatternMark: false },
  hero: { showCornerMark: true, showDiagonalMark: true, showPatternMark: false },
  page: { showCornerMark: true, showDiagonalMark: true, showPatternMark: true },
};

export default function WatermarkedImage({
  src,
  alt,
  className = "",
  variant = "default",
  showCornerMark,
  showDiagonalMark,
  showPatternMark,
  objectFit = "cover",
}: WatermarkedImageProps) {
  const defaults = variantDefaults[variant];
  const corner = showCornerMark ?? defaults.showCornerMark;
  const diagonal = showDiagonalMark ?? defaults.showDiagonalMark;
  const pattern = showPatternMark ?? defaults.showPatternMark;

  return (
    <figure
      className={[
        "watermarked-image",
        `watermarked-image--${variant}`,
        objectFit === "contain" ? "watermarked-image--contain" : "watermarked-image--cover",
        className,
      ].filter(Boolean).join(" ")}
      onContextMenu={(event) => event.preventDefault()}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        loading="lazy"
        decoding="async"
      />
      {pattern && (
        <span className="watermarked-image__pattern" aria-hidden="true">
          HESIDIO · @hesidio
        </span>
      )}
      {diagonal && (
        <span className="watermarked-image__diagonal" aria-hidden="true">
          HESIDIO
        </span>
      )}
      {corner && (
        <span className="watermarked-image__corner" aria-hidden="true">
          <strong>HESIDIO</strong>
          <small>@hesidio</small>
        </span>
      )}
    </figure>
  );
}
