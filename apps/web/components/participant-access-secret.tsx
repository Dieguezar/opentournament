import { QRCodeSVG } from 'qrcode.react';

import styles from './participant-access-manager.module.css';

interface ParticipantAccessSecretProps {
  teamName: string;
  url: string;
  onCopy: () => void;
}

export function ParticipantAccessSecret({
  teamName,
  url,
  onCopy,
}: ParticipantAccessSecretProps) {
  return (
    <div className={styles.secretBox}>
      <div className={styles.qrFrame}>
        <QRCodeSVG
          value={url}
          title={`Acceso privado para ${teamName}`}
          size={192}
          level="M"
          marginSize={4}
          bgColor="#ffffff"
          fgColor="#111827"
          className={styles.qrCode}
        />
      </div>
      <div className={styles.secretContent}>
        <strong>Enlace nuevo para {teamName}</strong>
        <p>Escaneá el QR con el teléfono del participante o copiá el enlace privado.</p>
        <input aria-label="Enlace privado recién generado" readOnly value={url} />
        <button type="button" className="button button-secondary" onClick={onCopy}>
          Copiar enlace
        </button>
        <small>
          El QR se genera en este navegador y no envía el token a terceros. Guardalo ahora: por
          seguridad no podremos volver a mostrarlo.
        </small>
      </div>
    </div>
  );
}
