import React, { useState, useEffect } from 'react';
import {
  FilePlus,
  TrendingDown,
  RefreshCw,
  TrendingUp,
  Clock,
  Wallet,
  ArrowRight,
  Sparkles,
  QrCode,
  ShieldCheck,
  Bell
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import HeroBanner from '../components/layout/HeroBanner';
import StatCard from '../components/common/StatCard';
import ProgressBar from '../components/common/ProgressBar';
import ReceiptListItem from '../components/receipts/ReceiptListItem';
import ReceiptCertificateModal from '../components/receipts/ReceiptCertificateModal';
import RecordExpenseModal from '../components/expenses/RecordExpenseModal';
import AdminUpiVerificationModal from '../components/upi/AdminUpiVerificationModal';
import { formatIndianCurrency } from '../utils/numberToWords';
import { formatDate } from '../utils/dateUtils';

export default function DashboardView({ onNavigate }) {
  const { stats, recentReceipts, recentExpenses, loading, refreshStats } = useData();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [pendingUpiCount, setPendingUpiCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const fetchPendingUpi = async () => {
    if (user && user.role === 'ADMIN') {
      try {
        const res = await apiRequest('/upi/pending');
        setPendingUpiCount(res.pending_contributions ? res.pending_contributions.length : 0);
      } catch (err) {
        // silent
      }
    }
  };

  useEffect(() => {
    fetchPendingUpi();
  }, [user]);

  const handleRefresh = async () => {
    setSyncing(true);
    await Promise.all([refreshStats(), fetchPendingUpi()]);
    setTimeout(() => setSyncing(false), 400);
  };

  const handleViewReceipt = (receipt) => {
    setSelectedReceipt(receipt);
    setIsReceiptModalOpen(true);
  };

  const handleShareWhatsApp = (receipt) => {
    setSelectedReceipt(receipt);
    setIsReceiptModalOpen(true);
  };

  const handleReceiptCreatedFromUpi = async (newReceipt) => {
    await refreshStats();
    await fetchPendingUpi();
    if (newReceipt) {
      setSelectedReceipt(newReceipt);
      setIsReceiptModalOpen(true);
    }
  };

  return (
    <div>
      {/* 1. Hero Banner */}
      <HeroBanner
        theme="maroon"
        tag="॥ श्री गणेशाय नमः ॥ • सार्वजनिक गणेशोत्सव २०२४"
        title={t('mandalName')}
        subtitle={`${t('mandalLocation')} • ${t('regNo')}`}
        actions={
          <>
            <button
              className="btn btn-gold"
              onClick={() => onNavigate('pay_vargani')}
              id="btn-hero-pay-vargani"
              style={{ boxShadow: '0 4px 10px rgba(234, 179, 8, 0.35)' }}
            >
              <QrCode size={15} />
              <span>{t('payVargani')}</span>
            </button>

            <button
              className="btn btn-outline-white"
              onClick={() => onNavigate('new_receipt')}
              id="btn-hero-add-receipt"
            >
              <FilePlus size={15} />
              <span>{t('newReceiptBtn')}</span>
            </button>

            <button
              className="btn btn-crimson"
              onClick={() => setIsExpenseModalOpen(true)}
              id="btn-hero-record-expense"
            >
              <TrendingDown size={15} />
              <span>{t('recordExpenseBtn')}</span>
            </button>

            <button
              className="btn btn-outline-white btn-icon-only"
              onClick={handleRefresh}
              title="Refresh / Sync"
              id="btn-hero-refresh"
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            </button>
          </>
        }
      />

      {/* Admin UPI Pending Verification Alert Banner */}
      {user && user.role === 'ADMIN' && pendingUpiCount > 0 && (
        <div
          onClick={() => setIsUpiModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            padding: '10px 16px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.2)'
          }}
          id="banner-admin-upi-pending"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} color="#92400e" className="animate-bounce" />
            <div>
              <strong style={{ fontSize: '12.5px', color: '#78350f' }}>
                {pendingUpiCount} नवीन UPI वर्गणी पडताळणी प्रलंबित आहे
              </strong>
              <div style={{ fontSize: '10.5px', color: '#92400e' }}>
                दात्यांनी पाठवलेले UTR तपासा आणि पावती देण्यासाठी येथे क्लिक करा ➔
              </div>
            </div>
          </div>

          <span
            style={{
              backgroundColor: '#b45309',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 900,
              padding: '4px 10px',
              borderRadius: '9999px'
            }}
          >
            पडताळा ({pendingUpiCount})
          </span>
        </div>
      )}

      {/* 2. Four Stat Cards Grid */}
      <div className="stat-cards-grid">
        {/* Card 1: Paid Collection */}
        <StatCard
          title={t('totalPaidCollection')}
          amount={stats.total_paid}
          countText={`${stats.paid_count} ${t('paidReceiptsCount')}`}
          highlightText={`${t('todayPaid')} ${formatIndianCurrency(stats.today_paid)}`}
          highlightColor="green"
          icon={TrendingUp}
          iconColor="green"
        />

        {/* Card 2: Unpaid / Pending */}
        <StatCard
          title={t('totalUnpaid')}
          amount={stats.total_unpaid}
          countText={`${stats.unpaid_count} ${t('unpaidReceiptsCount')}`}
          linkText={t('detailsLink')}
          onClickLink={() => onNavigate('unpaid_receipts')}
          icon={Clock}
          iconColor="amber"
        />

        {/* Card 3: Mandal Expenses */}
        <StatCard
          title={t('totalExpenses')}
          amount={stats.total_expenses}
          countText={`${stats.expense_count} ${t('expenseRecordsCount')}`}
          highlightText={`${t('todayExp')} ${formatIndianCurrency(stats.today_expenses)}`}
          highlightColor="red"
          icon={TrendingDown}
          iconColor="red"
        />

        {/* Card 4: Remaining Balance */}
        <StatCard
          title={t('remainingBalance')}
          amount={stats.net_balance}
          countText={t('netBalanceSub')}
          highlightText={t('safePill')}
          highlightColor="blue"
          icon={Wallet}
          iconColor="blue"
        />
      </div>

      {/* 3. Budget & Expense Progress */}
      <ProgressBar
        totalExpenses={stats.total_expenses}
        budgetTotal={stats.budget_total}
        usedPercentage={stats.budget_used_pct}
        remainingPercentage={stats.budget_remaining_pct}
      />

      {/* 4. Recent Receipts Section */}
      <div className="section-card">
        <div className="section-header-row">
          <div className="section-title">
            <span>📜</span>
            <span>{t('recentReceipts')}</span>
          </div>
          <button
            className="section-link"
            onClick={() => onNavigate('new_receipt')}
            id="link-add-receipt"
          >
            {t('newReceiptBtn')}
          </button>
        </div>

        {recentReceipts.length === 0 ? (
          <div className="devotional-empty-box">
            <span className="devotional-empty-icon">🪔</span>
            <div className="devotional-empty-title">अद्याप कोणतीही पावती दिलेली नाही</div>
            <div className="devotional-empty-desc">
              पहिली वर्गणी पावती तयार करण्यासाठी वरील <strong>'+ नवीन पावती'</strong> किंवा <strong>'वर्गणी भरा (UPI)'</strong> बटनावर क्लिक करा.
            </div>
          </div>
        ) : (
          <div>
            {recentReceipts.map((r) => (
              <ReceiptListItem
                key={r.id}
                receipt={r}
                onViewReceipt={handleViewReceipt}
                onShareWhatsApp={handleShareWhatsApp}
              />
            ))}
          </div>
        )}
      </div>

      {/* 5. Recent Expenses Section */}
      <div className="section-card">
        <div className="section-header-row">
          <div className="section-title">
            <span>📉</span>
            <span>{t('recentExpenses')}</span>
          </div>
          <button
            className="section-link"
            onClick={() => onNavigate('expenses')}
            id="link-view-all-expenses"
          >
            {t('viewAllLink')}
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="devotional-empty-box">
            <span className="devotional-empty-icon">🚩</span>
            <div className="devotional-empty-title">अद्याप कोणताही खर्च नोंदवलेला नाही</div>
            <div className="devotional-empty-desc">
              मंडपाचा खर्च नोंदवण्यासाठी <strong>'+ नवीन खर्च नोंदवा'</strong> बटनावर क्लिक करा.
            </div>
          </div>
        ) : (
          <div>
            {recentExpenses.map((exp) => (
              <div key={exp.id} className="receipt-list-item">
                <div className="receipt-item-left">
                  <div className="receipt-item-title-row">
                    <span className="voucher-code" style={{ fontSize: '10px' }}>{exp.voucher_no}</span>
                    <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{exp.title}</strong>
                    <span className="category-chip">{exp.category ? exp.category.split('(')[0] : 'खर्च'}</span>
                  </div>
                  <div className="receipt-meta-sub">
                    दिले: {exp.paid_to} • पेमेंट: {exp.payment_method} • अधिकार: {exp.authorized_by}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#be123c', fontWeight: 800, fontSize: '13px' }}>
                    {formatIndianCurrency(exp.amount)}
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>{formatDate(exp.expense_date)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generated Receipt Certificate Modal */}
      <ReceiptCertificateModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={selectedReceipt}
      />

      {/* Record Expense Modal */}
      <RecordExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onExpenseCreated={refreshStats}
      />

      {/* Admin UPI Verification Modal */}
      <AdminUpiVerificationModal
        isOpen={isUpiModalOpen}
        onClose={() => setIsUpiModalOpen(false)}
        onReceiptCreated={handleReceiptCreatedFromUpi}
      />
    </div>
  );
}
