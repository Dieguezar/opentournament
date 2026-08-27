import Image from 'next/image';

interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className }: BrandLogoProps) {
  const classes = ['brand-logo', className].filter(Boolean).join(' ');

  return (
    <span className={classes} aria-hidden="true">
      <Image
        alt=""
        className="brand-logo-image brand-logo-image-on-dark"
        height={40}
        src="/brand/opentournament-symbol-on-dark.png"
        unoptimized
        width={82}
      />
      <Image
        alt=""
        className="brand-logo-image brand-logo-image-on-light"
        height={40}
        src="/brand/opentournament-symbol-on-light.png"
        unoptimized
        width={82}
      />
    </span>
  );
}
