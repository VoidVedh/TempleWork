import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  XCircle,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Ban,
  Search,
  MessageCircle,
  Eye,
  Clock
} from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { formatIndianCurrency } from '../../utils/numberToWords';
import { formatTimestamp } from '../../utils/dateUtils';
import { useLanguage } from '../../context/LanguageContext';
import ReceiptCertificateModal from '../receipts/ReceiptCertificateModal';

export default function AdminUpiVerificationModal({ isOpen, onClose, onReceiptCreated }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'verified'
  const [pendingList, setPendingList] = useState([]);
  const [allList, setAllList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Verification Review Confirmation State
  const [verifyingItem, setVerifyingItem] = useState(null);

  // Reject Dialog Modal State
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('बँक खात्यात रक्कम जमा झालेली नाही किंवा चुकीचा UTR.');

  // View Certificate Modal State
  const [viewingReceipt, setViewingReceipt] = useState(null);

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

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/upi/all');
      setAllList(res.contributions || []);
    } catch (err) {
      console.error('Fetch all UPI error:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshCurrentTab = () => {
    if (activeTab === 'pending') fetchPending();
    else fetchAll();
  };

  useEffect(() => {
    if (isOpen) {
      refreshCurrentTab();
      setSearchQuery('');
      setVerifyingItem(null);
      setRejectingItem(null);
    }
  }, [isOpen, activeTab]);

  // Smart Polling: When on 'verified' tab, if any items are QUEUED or PROCESSING, poll every 3.5s
  useEffect(() => {
    if (!isOpen || activeTab !== 'verified') return;

    const hasPendingDispatch = allList.some(
      item => item.whatsapp_status === 'QUEUED' || item.whatsapp_status === 'PROCESSING'
    );

    if (hasPendingDispatch) {
      const timer = setTimeout(() => {
        apiRequest('/upi/all')
          .then(res => setAllList(res.contributions || []))
          .catch(() => {});
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab, allList]);

  if (!isOpen) return null;

  const currentList = activeTab === 'pending' ? pendingList : allList;

  const filteredList = currentList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (item.donor_name && item.donor_name.toLowerCase().includes(q)) ||
      (item.donor_mobile && item.donor_mobile.includes(q)) ||
      (item.upi_ref_no && item.upi_ref_no.toLowerCase().includes(q)) ||
      (item.intent_ref && item.intent_ref.toLowerCase().includes(q)) ||
      (item.receipt_id && item.receipt_id.toLowerCase().includes(q))
    );
  });

  const handleConfirmVerify = async () => {
    if (!verifyingItem) return;
    const item = verifyingItem;

    try {
      setActionLoadingId(item.id);
      const res = await apiRequest(`/upi/${item.id}/verify`, { method: 'POST' });
      alert(res.message || 'वर्गणी पडताळणी यशस्वी! अधिकृत पावती तयार झाली.');
      setVerifyingItem(null);
      await fetchPending();
      if (onReceiptCreated) {
        onReceiptCreated(res.receipt);
      }
      // Switch to verified tab to view the newly minted receipt & outbox status
      setActiveTab('verified');
    } catch (err) {
      alert(err.message || 'पडताळणी करताना त्रुटी आली.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRejectDialog = (item) => {
    setRejectingItem(item);
    setRejectionReason('बँक खात्यात रक्कम प्राप्त झालेली नाही किंवा चुकीचा UTR.');
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;

    try {
      setActionLoadingId(rejectingItem.id);
      await apiRequest(`/upi/${rejectingItem.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectionReason.trim() })
      });
      alert('UPI वर्गणी नोंद अमान्य / रद्द केली गेली.');
      setRejectingItem(null);
      await fetchPending();
    } catch (err) {
      alert(err.message || 'त्रुटी आली.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRetryWhatsApp = async (item) => {
    try {
      setActionLoadingId(item.id);
      const res = await apiRequest(`/upi/${item.id}/retry-whatsapp`, { method: 'POST' });
      alert(res.message || 'व्हॉट्सअ‍ॅप पावती पुन्हा पाठवण्यासाठी शेड्यूल केली आहे (Retry queued).');
      await fetchAll();
    } catch (err) {
      alert(err.message || 'व्हॉट्सअ‍ॅप पुन्हा पाठवताना त्रुटी आली.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenReceiptModal = async (item) => {
    if (!item.receipt_id) return;
    try {
      const res = await apiRequest(`/receipts/${item.receipt_id}`);
      if (res.receipt) {
        setViewingReceipt(res.receipt);
      }
    } catch (err) {
      alert('पावती तपशील लोड करताना त्रुटी आली.');
    }
  };

  const renderWhatsAppBadge = (status, errorMsg, attemptCount) => {
    switch (status) {
      case 'QUEUED':
        return (
          <span style={{ fontSize: '11px', color: '#b45309', background: '#fef3c7', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> रांगेत आहे (QUEUED)
          </span>
        );
      case 'PROCESSING':
        return (
          <span style={{ fontSize: '11px', color: '#1d4ed8', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={12} className="animate-spin" /> पाठवत आहे (PROCESSING)
          </span>
        );
      case 'SENT':
        return (
          <span style={{ fontSize: '11px', color: '#0369a1', background: '#e0f2fe', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, border: '1px solid #bae6fd', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            🚀 मेटाने स्वीकारले (SENT)
          </span>
        );
      case 'DELIVERED':
        return (
          <span style={{ fontSize: '11px', color: '#047857', background: '#dcfce7', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ✅ पोहोचले (DELIVERED)
          </span>
        );
      case 'READ':
        return (
          <span style={{ fontSize: '11px', color: '#4338ca', background: '#e0e7ff', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, border: '1px solid #c7d2fe', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            👁️ वाचले (READ)
          </span>
        );
      case 'FAILED':
        return (
          <span 
            title={errorMsg || 'डिलिव्हरी अयशस्वी'} 
            style={{ fontSize: '11px', color: '#b91c1c', background: '#fee2e2', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            ⚠️ अयशस्वी (FAILED) {attemptCount > 1 ? `(#${attemptCount})` : ''}
          </span>
        );
      default:
        return (
          <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
            नोंद नाही (Unsent)
          </span>
        );
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-container"
          style={{ maxWidth: '780px', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header theme-maroon" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={22} color="#fde047" />
              <div>
                <h3 style={{ margin: 0, fontSize: '15.5px', color: '#ffffff', fontWeight: 900 }}>
                  ऑनलाइन वर्गणी व व्हॉट्सअ‍ॅप पावती प्रशासन (UPI & WhatsApp Hub)
                </h3>
                <span style={{ fontSize: '10.5px', color: '#fef08a' }}>
                  बँक खात्याशी पडताळणी, अधिकृत पावती जारी करणे व व्हॉट्सअ‍ॅप डिलिव्हरी
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

          {/* Sub-Header Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #fed7aa', backgroundColor: '#fffbeb', padding: '6px 16px 0 16px', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              style={{
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: 800,
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'pending' ? '3px solid #b45309' : '3px solid transparent',
                color: activeTab === 'pending' ? '#92400e' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🟡 प्रलंबित पडताळणी</span>
              <span style={{ background: '#d97706', color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: '10px' }}>
                {pendingList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('verified')}
              style={{
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: 800,
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'verified' ? '3px solid #059669' : '3px solid transparent',
                color: activeTab === 'verified' ? '#065f46' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🟢 पडताळलेल्या व व्हॉट्सअ‍ॅप पावत्या</span>
              <span style={{ background: '#059669', color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: '10px' }}>
                {allList.filter(x => x.verification_status === 'VERIFIED').length}
              </span>
            </button>
          </div>

          {/* Content Body */}
          <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
            {activeTab === 'pending' && (
              /* Verification Warning Banner */
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '14px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start'
                }}
              >
                <AlertTriangle size={20} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '11.5px', color: '#78350f', lineHeight: 1.45 }}>
                  <strong style={{ display: 'block', marginBottom: '2px', color: '#92400e' }}>
                    ⚠️ महत्त्वाची आर्थिक सुरक्षा सूचना (Evidence-Based Verification Rule):
                  </strong>
                  दात्याने दिलेला UTR क्रमांक हा पुरावा नाही. मंडळाच्या <strong>बँक खाते किंवा व्यापारी UPI ॲपमध्ये</strong> प्रत्यक्ष रक्कम जमा झाल्याची खात्री करूनच <strong>'पडताळणी मंजूर करा'</strong>.
                </div>
              </div>
            )}

            {/* Search & Refresh Controls Bar */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder={activeTab === 'pending' ? 'नाव, मोबाईल किंवा UTR द्वारे शोधा...' : 'नाव, मोबाईल, पावती किंवा UTR शोधा...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '12px', height: '34px' }}
                />
              </div>
              <button
                type="button"
                onClick={refreshCurrentTab}
                className="btn btn-outline-white"
                style={{ padding: '6px 12px', fontSize: '11.5px', color: '#7f1d1d', borderColor: '#fed7aa', background: '#fffbeb', fontWeight: 700, height: '34px' }}
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                <span>ताजे करा ({filteredList.length})</span>
              </button>
            </div>

            {loading ? (
              <div className="empty-state-text">माहिती लोड होत आहे...</div>
            ) : filteredList.length === 0 ? (
              <div className="devotional-empty-box" style={{ padding: '36px 16px' }}>
                <span className="devotional-empty-icon">✨</span>
                <div className="devotional-empty-title">
                  {searchQuery ? 'शोध परिणामात कोणतीही नोंद सापडली नाही' : activeTab === 'pending' ? 'कोणतीही प्रलंबित UPI वर्गणी नाही' : 'कोणतीही नोंद सापडली नाही'}
                </div>
                <div className="devotional-empty-desc">
                  {activeTab === 'pending' ? 'सर्व प्राप्त ऑनलाइन वर्गणी नोंदी पडताळल्या गेल्या आहेत.' : 'पडताळणी केलेल्या नोंदी येथे दिसतील.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredList.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: activeTab === 'pending' ? '1.5px solid #fed7aa' : '1.5px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '14px',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>{item.donor_name}</span>
                          <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                            {item.payment_app || 'UPI'}
                          </span>
                        </div>

                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <span>📱 मो: <strong>{item.donor_mobile || 'N/A'}</strong></span>
                          <span>⏰ वेळ: {formatTimestamp(item.submitted_at || item.created_at)}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#059669' }}>
                          {formatIndianCurrency(item.amount)}
                        </div>
                        {item.verification_status === 'VERIFIED' ? (
                          <span style={{ fontSize: '10px', color: '#047857', fontWeight: 800, background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', border: '1px solid #86efac' }}>
                            🟢 पडताळणी पूर्ण (PAID)
                          </span>
                        ) : item.verification_status === 'REJECTED' ? (
                          <span style={{ fontSize: '10px', color: '#b91c1c', fontWeight: 800, background: '#fee2e2', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fca5a5' }}>
                            🔴 अमान्य (REJECTED)
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', color: '#d97706', fontWeight: 800, background: '#fffbeb', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                            🟡 पडताळणी बाकी
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reference Details Box */}
                    <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>संदर्भ क्र. (Intent): </span>
                        <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{item.intent_ref || 'N/A'}</strong>
                      </div>

                      <div>
                        <span style={{ color: '#64748b' }}>दाव्याचा UTR क्र.: </span>
                        <strong style={{ color: '#7f1d1d', fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.5px' }}>{item.upi_ref_no}</strong>
                      </div>

                      {item.notes && (
                        <div style={{ width: '100%', color: '#475569', fontSize: '11px', fontStyle: 'italic', borderTop: '1px dashed #e2e8f0', paddingTop: '4px' }}>
                          संकल्प / नोंद: "{item.notes}"
                        </div>
                      )}
                    </div>

                    {/* Verified Details & WhatsApp Delivery Row */}
                    {item.verification_status === 'VERIFIED' && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11.5px', color: '#166534', fontWeight: 700 }}>
                            व्हॉट्सअ‍ॅप स्थिती:
                          </span>
                          {renderWhatsAppBadge(item.whatsapp_status, item.whatsapp_error, item.whatsapp_attempt_count)}
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          {item.receipt_id && (
                            <button
                              type="button"
                              onClick={() => handleOpenReceiptModal(item)}
                              className="btn btn-outline"
                              style={{ fontSize: '11px', padding: '4px 8px', background: '#fff' }}
                            >
                              <Eye size={12} />
                              <span>पावती पहा</span>
                            </button>
                          )}

                          {item.whatsapp_status === 'FAILED' && (
                            <button
                              type="button"
                              onClick={() => handleRetryWhatsApp(item)}
                              disabled={actionLoadingId === item.id}
                              className="btn btn-crimson"
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                              <RefreshCw size={12} className={actionLoadingId === item.id ? 'animate-spin' : ''} />
                              <span>पुन्हा पाठवा (Retry)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons for Pending items */}
                    {activeTab === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '2px' }}>
                        <button
                          type="button"
                          className="btn btn-green"
                          style={{ fontSize: '12px', padding: '7px 14px', fontWeight: 800 }}
                          disabled={actionLoadingId === item.id}
                          onClick={() => setVerifyingItem(item)}
                          id={`btn-verify-upi-${item.id}`}
                        >
                          <CheckCircle size={15} />
                          <span>पडताळणी करा (Verify & Issue Receipt)</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-dark"
                          style={{ fontSize: '12px', padding: '7px 12px', background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1', fontWeight: 700 }}
                          disabled={actionLoadingId === item.id}
                          onClick={() => openRejectDialog(item)}
                          id={`btn-reject-upi-${item.id}`}
                        >
                          <XCircle size={15} />
                          <span>अमान्य करा (Reject)</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verification Review & Confirmation Sub-Modal */}
          {verifyingItem && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1100,
                padding: '16px'
              }}
              onClick={() => setVerifyingItem(null)}
            >
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '20px',
                  maxWidth: '460px',
                  width: '100%',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                  border: '2px solid #b45309'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', marginBottom: '10px' }}>
                  <ShieldCheck size={24} color="#b45309" />
                  <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 900 }}>
                    वर्गणी बँक पडताळणी पुष्टी (Confirm Bank Receipt)
                  </h4>
                </div>

                <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, marginBottom: '14px' }}>
                  कृपया बँक खात्यात प्रत्यक्ष जमा झालेली रक्कम व दिलेला UTR तपासूनच खात्री करा:
                </p>

                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', marginBottom: '14px', fontSize: '12.5px' }}>
                  <div style={{ marginBottom: '6px' }}>👤 दाता नाव: <strong>{verifyingItem.donor_name}</strong></div>
                  <div style={{ marginBottom: '6px' }}>📱 मोबाईल: <strong>{verifyingItem.donor_mobile || 'N/A'}</strong></div>
                  <div style={{ marginBottom: '6px' }}>💰 रक्कम: <strong style={{ color: '#059669', fontSize: '15px' }}>₹{verifyingItem.amount}</strong></div>
                  <div style={{ marginBottom: '6px' }}>📌 UTR क्रमांक: <strong style={{ color: '#991b1b', fontFamily: 'monospace' }}>{verifyingItem.upi_ref_no}</strong></div>
                  <div>💬 नोंद / संकल्प: <em>{verifyingItem.notes || 'N/A'}</em></div>
                </div>

                <div style={{ fontSize: '11px', color: '#15803d', background: '#f0fdf4', padding: '8px 10px', borderRadius: '6px', marginBottom: '14px', border: '1px solid #bbf7d0' }}>
                  ✨ <strong>पावती व व्हॉट्सअ‍ॅप:</strong> पडताळणी करताच अधिकृत पावती क्र. तयार होईल आणि भाविकाच्या मोबाईलवर व्हॉट्सअ‍ॅप संदेश व PDF पाठवली जाईल.
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setVerifyingItem(null)}
                    style={{ fontSize: '12px' }}
                  >
                    रद्द करा
                  </button>

                  <button
                    type="button"
                    className="btn btn-green"
                    onClick={handleConfirmVerify}
                    style={{ fontSize: '12.5px', fontWeight: 800 }}
                    disabled={actionLoadingId === verifyingItem.id}
                  >
                    {actionLoadingId === verifyingItem.id ? 'नोंद होत आहे...' : 'होय, रक्कम जमा झाली (Verify & Issue)'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reject Dialog Sub-Modal */}
          {rejectingItem && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1100,
                padding: '16px'
              }}
              onClick={() => setRejectingItem(null)}
            >
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '20px',
                  maxWidth: '440px',
                  width: '100%',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', marginBottom: '10px' }}>
                  <Ban size={20} />
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 900 }}>
                    UPI वर्गणी नोंद अमान्य करा
                  </h4>
                </div>

                <p style={{ fontSize: '12px', color: '#475569', marginBottom: '12px' }}>
                  दाता: <strong>{rejectingItem.donor_name}</strong> | UTR: <strong>{rejectingItem.upi_ref_no}</strong> | रक्कम: <strong>₹{rejectingItem.amount}</strong>
                </p>

                <div className="form-group">
                  <label className="form-label">* अमान्य करण्याचे कारण (REASON):</label>
                  <textarea
                    rows={3}
                    className="form-input"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    style={{ resize: 'none', fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setRejectingItem(null)}
                    style={{ fontSize: '12px' }}
                  >
                    रद्द करा
                  </button>

                  <button
                    type="button"
                    className="btn btn-crimson"
                    onClick={handleConfirmReject}
                    style={{ fontSize: '12px' }}
                    disabled={actionLoadingId === rejectingItem.id}
                  >
                    {actionLoadingId === rejectingItem.id ? 'प्रक्रिया सुरू आहे...' : 'होय, अमान्य करा'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Certificate Viewer Modal */}
      {viewingReceipt && (
        <ReceiptCertificateModal
          isOpen={Boolean(viewingReceipt)}
          onClose={() => setViewingReceipt(null)}
          receipt={viewingReceipt}
        />
      )}
    </>
  );
}
