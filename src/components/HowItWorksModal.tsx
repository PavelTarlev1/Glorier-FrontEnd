import type { TFunc } from '../types';

interface HowItWorksModalProps {
  t: TFunc;
  onClose: () => void;
  totalRecords: number;
}

export default function HowItWorksModal({ t, onClose, totalRecords }: HowItWorksModalProps) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <button className="close" onClick={onClose}>
          &times;
        </button>
        <h2>{t('modalTitle')}</h2>
        <p>{t('modalP1')}</p>
        <h3>{t('modalH1')}</h3>
        <p>{t('modalP2')}</p>
        <h3>{t('modalH2')}</h3>
        <p>{t('modalP3')}</p>
        <h3>{t('modalH3')}</h3>
        <p>{t('modalP4')}</p>
        <h3>{t('modalH4')}</h3>
        <p>{t('modalP5')}</p>
        <h3>{t('modalH5')}</h3>
        <p>{t('modalP6', { N: totalRecords })}</p>
      </div>
    </div>
  );
}
