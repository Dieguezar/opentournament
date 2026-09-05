import type { ReactNode } from 'react';

const overlayDocumentStyles =
  'html:has([data-obs-route]),body:has([data-obs-route]){background:transparent;overflow:hidden}body:has([data-obs-route])>header,body:has([data-obs-route])>.skip-link{display:none}body:has([data-obs-route]) nextjs-portal{display:none}body:has([data-obs-route])>#main-content{position:fixed;inset:0;overflow:hidden}';

export default function PublicObsOverlayLayout({ children }: { children: ReactNode }) {
  return (
    <div data-obs-route>
      <style>{overlayDocumentStyles}</style>
      {children}
    </div>
  );
}
