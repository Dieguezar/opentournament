import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';

import styles from './tournament-branding.module.css';

export interface TournamentBrandingAppearance {
  logoMediaId: string | null;
  bannerMediaId: string | null;
  primaryColor: string | null;
  accentColor: string | null;
}

interface TournamentBrandingProps {
  appearance: TournamentBrandingAppearance | null;
  children: ReactNode;
  tournamentName: string;
}

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function validatedColor(value: string | null): string | undefined {
  return value && HEX_COLOR.test(value) ? value : undefined;
}

function mediaPath(mediaId: string): string {
  return `/api/v1/media/${encodeURIComponent(mediaId)}`;
}

export function TournamentBranding({
  appearance,
  children,
  tournamentName,
}: TournamentBrandingProps) {
  const primaryColor = validatedColor(appearance?.primaryColor ?? null);
  const accentColor = validatedColor(appearance?.accentColor ?? null);
  const style: CSSProperties & Record<`--${string}`, string> = {};

  if (primaryColor) style['--tournament-primary'] = primaryColor;
  if (accentColor) style['--tournament-accent'] = accentColor;

  const logoPath = appearance?.logoMediaId ? mediaPath(appearance.logoMediaId) : null;
  const bannerPath = appearance?.bannerMediaId ? mediaPath(appearance.bannerMediaId) : null;

  return (
    <section className={styles.branding} style={style}>
      {bannerPath && (
        <div className={styles.banner}>
          <Image
            alt={`${tournamentName} banner`}
            fill
            sizes="(min-width: 720px) 65vw, 100vw"
            src={bannerPath}
            unoptimized
          />
        </div>
      )}
      <div className={styles.content}>
        {logoPath && (
          <Image
            alt={`${tournamentName} logo`}
            className={styles.logo}
            height={88}
            src={logoPath}
            unoptimized
            width={88}
          />
        )}
        <div className={styles.copy}>{children}</div>
      </div>
    </section>
  );
}
