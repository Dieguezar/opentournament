import { QRCodeSVG } from 'qrcode.react';
import { useI18n } from './i18n-provider';
import { formatMessage } from '../lib/i18n';

import styles from './participant-access-manager.module.css';

interface ParticipantAccessSecretProps {
  teamName: string;
  url: string;
  onCopy: () => void;
}

export function ParticipantAccessSecret({ teamName, url, onCopy }: ParticipantAccessSecretProps) {
  const { dictionary } = useI18n();
  const copy = dictionary.participantAccess;
  return (
    <div className={styles.secretBox}>
      <div className={styles.qrFrame}>
        <QRCodeSVG
          value={url}
          title={formatMessage(copy.privateAccessTitle, { name: teamName })}
          size={192}
          level="M"
          marginSize={4}
          bgColor="#ffffff"
          fgColor="#111827"
          className={styles.qrCode}
        />
      </div>
      <div className={styles.secretContent}>
        <strong>{formatMessage(copy.newLink, { name: teamName })}</strong>
        <p>{copy.scanOrCopy}</p>
        <input aria-label={copy.generatedLinkLabel} readOnly value={url} />
        <button type="button" className="button button-secondary" onClick={onCopy}>
          {copy.copyLink}
        </button>
        <small>{copy.qrPrivacy}</small>
      </div>
    </div>
  );
}
