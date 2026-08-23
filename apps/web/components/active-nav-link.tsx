'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface ActiveNavLinkProps {
  children: ReactNode;
  href: string;
}

export function ActiveNavLink({ children, href }: ActiveNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <Link aria-current={isActive ? 'page' : undefined} className="nav-link" href={href}>
      {children}
    </Link>
  );
}
