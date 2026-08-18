import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Clock, ShieldCheck, User, Phone, Hash, CreditCard, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { formatIndianCurrency } from '../../utils/numberToWords';
import { formatDate, formatTimestamp } from '../../utils/dateUtils';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminUpiVerificationModal({ isOpen, onClose, onReceiptCreated }) {
  const { t } = useLanguage();
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/upi/pending');
      setPendingList(res.pending_contributions || []);
    } catch (err) {
      console.error('Fetch pending UPI error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPending();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = async (item) => {
    if (!window.confirm(`दात्याचे नाव: ${item.donor_name}\nरक्कम: ₹${item.amount}\nUTR: ${item.upi_ref_no}\n\nही UPI वर्गणी पडताळून अधिकृत पावती तयार करायची आहे का?`)) {
      return;
    }

    try {
      setActionLoadingId(item.id);
      const res = await apiRequest(`/upi/${item.id}/verify`, { method: 'POST' });
      alert(res.message || 'वर्गणी पडताळणी पूर्ण झाली व अधिकृत पावती तयार झाली!');
      await fetchPending();
      if (onReceiptCreated) {
        onReceiptCreated(res.receipt);
      }
    } catch (err) {
      alert(err.message || 'पडताळणी करताना त्रुटी आली.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (item) => {
    const reason = window.prompt(`UTR: ${item.upi_ref_no} अमान्य करण्याचे कारण लिहा:`, 'बँक खात्यात रक्कम जमा झालेली नाही किंवा अयोग्य UTR.');
    if (reason === null) return;

    try {
      setActionLoadingId(item.id);
      await apiRequest(`/upi/${item.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      alert('UPI वर्गणी अमान्य केली गेली.');
      await fetchPending();
    } catch (err) {
      alert(err.message || 'त्रुटी आली.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header theme-maroon" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="#fde047" />
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#ffffff', fontWeight: 900 }}>
                {t('adminUpiPendingTitle')}
              </h3>
              <span style={{ fontSize: '10.5px', color: '#fef08a' }}>
                ऑनलाइन आलेली UPI वर्गणी पडताळा आणि एका क्लिकवर पावती जारी करा
              </span>
            </div>
          </div>
          <button
            className="btn btn-outline-white btn-icon-only"
            onClick={onClose}
            style={{ border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
              प्रलंबित नोंदी: {pendingList.length}
            </span>
            <button
              type="button"
              onClick={fetchPending}
              className="btn btn-outline-white"
              style={{ padding: '4px 8px', fontSize: '11px', color: '#7f1d1d', borderColor: '#fed7aa', background: '#fffbeb' }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>ताजे करा</span>
            </button>
          </div>

          {loading ? (
            <div className="empty-state-text">माहिती लोड होत आहे...</div>
          ) : pendingList.length === 0 ? (
            <div className="devotional-empty-box" style={{ padding: '30px 16px' }}>
              <span className="devotional-empty-icon">✨</span>
              <div className="devotional-empty-title">कोणतीही प्रलंबित UPI वर्गणी नाही</div>
              <div className="devotional-empty-desc">
                सर्व प्राप्त ऑनलाइन वर्गणी नोंदी पडताळल्या गेल्या आहेत.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #fed7aa',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>{item.donor_name}</span>
                        <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                          {item.payment_app || 'UPI'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {item.donor_mobile && <span>मो: {item.donor_mobile}</span>}
                        <span>वेळ: {formatTimestamp(item.submitted_at)}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '17px', fontWeight: 900, color: '#059669' }}>
                        {formatIndianCurrency(item.amount)}
                      </div>
                      <span style={{ fontSize: '10px', color: '#d97706', fontWeight: 800, background: '#fffbeb', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                        पडताळणी बाकी
                      </span>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', fontSize: '11.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>UTR / Ref No: </span>
                      <strong style={{ color: '#7f1d1d', fontFamily: 'monospace' }}>{item.upi_ref_no}</strong>
                    </div>
                    {item.notes && (
                      <span style={{ color: '#475569', fontSize: '11px', fontStyle: 'italic' }}>
                        "{item.notes}"
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-green"
                      style={{ fontSize: '11.5px', padding: '6px 12px' }}
                      disabled={actionLoadingId === item.id}
                      onClick={() => handleVerify(item)}
                    >
                      <CheckCircle size={14} />
                      <span>{t('approveUpiBtn')}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-dark"
                      style={{ fontSize: '11.5px', padding: '6px 12px', background: '#e2e8f0', color: '#475569', borderColor: '#cbd5e1' }}
                      disabled={actionLoadingId === item.id}
                      onClick={() => handleReject(item)}
                    >
                      <XCircle size={14} />
                      <span>{t('rejectUpiBtn')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
