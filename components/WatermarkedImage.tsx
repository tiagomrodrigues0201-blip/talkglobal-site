import React from "react";

type WatermarkVariant = "default" | "page" | "hero" | "subtle";

type WatermarkedImageProps = {
  src: string;
  alt: string;
  className?: string;
  variant?: WatermarkVariant;
  objectFit?: "cover" | "contain";
  loading?: "eager" | "lazy";
};

const variantClass: Record<WatermarkVariant, string> = {
  default: "watermarked-image--default",
  subtle: "watermarked-image--subtle",
  hero: "watermarked-image--hero",
  page: "watermarked-image--page",
};

export default function WatermarkedImage({
  src,
  alt,
  className = "",
  variant = "default",
  objectFit = "cover",
  loading = "lazy",
}: WatermarkedImageProps) {
  return (
    <figure
      className={[
        "watermarked-image",
        variantClass[variant],
        objectFit === "contain" ? "watermarked-image--contain" : "watermarked-image--cover",
        className,
      ].filter(Boolean).join(" ")}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={alt}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        loading={loading}
        decoding="async"
      />
      <span className="watermarked-image__pattern" aria-hidden="true">
        HESIDIO · @hesidio
      </span>
      <span className="watermarked-image__diagonal" aria-hidden="true">
        HESIDIO
      </span>
      <span className="watermarked-image__corner" aria-hidden="true">
        <strong>HESIDIO</strong>
        <small>@hesidio</small>
      </span>
    </figure>
  );
}
