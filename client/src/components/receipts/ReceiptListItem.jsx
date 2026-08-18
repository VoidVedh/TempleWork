import React from 'react';
import { Eye, MessageCircle } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { formatIndianCurrency } from '../../utils/numberToWords';

export default function ReceiptListItem({ receipt, onViewReceipt, onShareWhatsApp }) {
  return (
    <div className="receipt-list-item">
      <div className="receipt-item-left">
        <div className="receipt-item-title-row">
          <span className="receipt-no-chip">{receipt.receipt_no}</span>
          <span className="receipt-donor-name">{receipt.donor_name}</span>
          <span className={`status-chip ${receipt.payment_status === 'Paid' ? 'paid' : 'unpaid'}`}>
            {receipt.payment_status === 'Paid' ? 'जमा (Paid)' : 'पेंडींग (Unpaid)'}
          </span>
        </div>
        <div className="receipt-meta-sub">
          {receipt.donor_mobile && `मो: ${receipt.donor_mobile} • `}
          पेमेंट: {receipt.payment_mode} • कार्यकर्ता: {receipt.collector_name}
        </div>
      </div>

      <div className="receipt-item-right">
        <div style={{ textAlign: 'right' }}>
          <div className="receipt-amount-text">{formatIndianCurrency(receipt.amount)}</div>
          <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>{formatDate(receipt.issue_date)}</div>
        </div>

        <button
          className="action-icon-btn view"
          onClick={() => onViewReceipt(receipt)}
          title="पावती पहा (View Certificate)"
        >
          <Eye size={14} />
        </button>

        <button
          className="action-icon-btn share"
          onClick={() => onShareWhatsApp(receipt)}
          title="व्हॉट्सअ‍ॅप शेअर (Share on WhatsApp)"
        >
          <MessageCircle size={14} />
        </button>
      </div>
    </div>
  );
}
