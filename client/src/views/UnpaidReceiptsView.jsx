import React, { useState, useEffect } from 'react';
import { Clock, Search, Check, Eye, MessageCircle, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { apiRequest } from '../utils/api';
import { formatIndianCurrency } from '../utils/numberToWords';
import { formatDate } from '../utils/dateUtils';
import ReceiptCertificateModal from '../components/receipts/ReceiptCertificateModal';

export default function UnpaidReceiptsView({ onNavigate }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { refreshStats } = useData();

  const canChangeStatus = user && (user.role === 'ADMIN' || user.can_change_payment_status === 1);

  const [receipts, setReceipts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  const fetchUnpaidReceipts = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/receipts?status=unpaid&search=${encodeURIComponent(search)}`);
      setReceipts(res.receipts || []);
    } catch (err) {
      console.error('Fetch unpaid receipts error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnpaidReceipts();
  }, [search]);

  const handleMarkAsPaid = async (receipt) => {
    if (!window.confirm(`पावती क्र. ${receipt.receipt_no} (रक्कम ₹${receipt.amount}) 'जमा (PAID)' म्हणून नोंद करायची आहे का?`)) {
      return;
    }

    try {
      await apiRequest(`/receipts/${receipt.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ payment_status: 'Paid' })
      });
      await refreshStats();
      await fetchUnpaidReceipts();
    } catch (err) {
      alert(err.message || 'स्थिती बदलताना त्रुटी आली.');
    }
  };

  const totalUnpaidAmount = receipts.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div>
      {/* Banner */}
      <div className="hero-card theme-brown" style={{ marginBottom: '14px', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h1 className="hero-title" style={{ fontSize: '17px' }}>{t('unpaidReceipts')}</h1>
            <p className="hero-subtitle" style={{ fontSize: '10.5px' }}>
              पेंडींग / बाकी वर्गणी पावत्यांची यादी व जमा नोंदणी
            </p>
          </div>
          <div style={{ textAlign: 'right', background: 'rgba(0,0,0,0.25)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(254, 240, 138, 0.2)' }}>
            <span style={{ fontSize: '10.5px', color: '#fed7aa', display: 'block' }}>एकूण येणे बाकी:</span>
            <strong style={{ fontSize: '16px', color: '#fde047', fontFeatureSettings: 'tnum' }}>
              {formatIndianCurrency(totalUnpaidAmount)}
            </strong>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="section-card" style={{ padding: '10px 14px', marginBottom: '12px' }}>
        <div className="input-wrapper">
          <span className="input-icon"><Search size={16} /></span>
          <input
            type="text"
            className="form-input"
            placeholder="पावती क्र., दात्याचे नाव किंवा मोबाईल शोधा..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="input-search-unpaid"
          />
        </div>
      </div>

      {/* List Card */}
      <div className="section-card">
        {loading ? (
          <div className="devotional-empty-box">
            <span className="devotional-empty-icon">⏳</span>
            <div className="devotional-empty-title">माहिती लोड होत आहे...</div>
          </div>
        ) : receipts.length === 0 ? (
          <div className="devotional-empty-box">
            <span className="devotional-empty-icon">✨</span>
            <div className="devotional-empty-title">कोणतीही येणे बाकी / पेंडींग पावती नाही</div>
            <div className="devotional-empty-desc">
              सर्व वर्गणी जमा झालेली आहे. सर्व देणगीदार खाती सुरक्षित व निर्दोष आहेत.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {receipts.map((r) => (
              <div
                key={r.id}
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="receipt-no-chip">{r.receipt_no}</span>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{r.donor_name}</strong>
                    <span className="status-chip unpaid">बाकी (Unpaid)</span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                    {r.donor_mobile && `मो: ${r.donor_mobile} • `}
                    पत्ता: {r.address_galli || 'उचगाव'} • तारीख: {formatDate(r.issue_date)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ color: '#b45309', fontSize: '13.5px', fontFeatureSettings: 'tnum' }}>
                      {formatIndianCurrency(r.amount)}
                    </strong>
                  </div>

                  {canChangeStatus && (
                    <button
                      className="btn btn-green"
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                      onClick={() => handleMarkAsPaid(r)}
                      title="जमा करा (Mark as Paid)"
                    >
                      <Check size={13} />
                      <span>जमा</span>
                    </button>
                  )}

                  <button
                    className="action-icon-btn view"
                    onClick={() => {
                      setSelectedReceipt(r);
                      setIsCertModalOpen(true);
                    }}
                    title="पावती पहा"
                  >
                    <Eye size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ReceiptCertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        receipt={selectedReceipt}
      />
    </div>
  );
}
