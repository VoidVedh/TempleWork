import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, RefreshCw, Medal, Shield } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { apiRequest } from '../utils/api';
import HeroBanner from '../components/layout/HeroBanner';
import LeaderboardCard from '../components/members/LeaderboardCard';
import MemberTable from '../components/members/MemberTable';
import AddMemberModal from '../components/members/AddMemberModal';

export default function MemberPerformanceView() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { refreshStats } = useData();

  const isAdmin = user && user.role === 'ADMIN';

  const [members, setMembers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchMembersAndLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const [membersRes, leaderboardRes] = await Promise.all([
        apiRequest('/members'),
        apiRequest('/members/leaderboard')
      ]);
      setMembers(membersRes.members || []);
      setLeaderboard(leaderboardRes.leaderboard || []);
    } catch (err) {
      console.error('Fetch members error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembersAndLeaderboard();
  }, [fetchMembersAndLeaderboard]);

  const handleRefreshData = async () => {
    setSyncing(true);
    await fetchMembersAndLeaderboard();
    await refreshStats();
    setTimeout(() => setSyncing(false), 300);
  };

  const handleMemberSaved = async () => {
    await fetchMembersAndLeaderboard();
    await refreshStats();
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setIsAddModalOpen(true);
  };

  const handleDeleteMember = async (member) => {
    if (!window.confirm(`सदस्य ${member.name} (+91 ${member.mobile}) हटवायचा आहे का?`)) {
      return;
    }

    try {
      await apiRequest(`/members/${member.id}`, { method: 'DELETE' });
      await fetchMembersAndLeaderboard();
      await refreshStats();
    } catch (err) {
      alert(err.message || 'सदस्य हटवताना त्रुटी आली.');
    }
  };

  return (
    <div>
      {/* 1. Hero Banner */}
      <HeroBanner
        theme="brown"
        tag="॥ संघटन हेच सामर्थ्य ॥ • EKDANT MITRA MANDAL"
        title={t('memberTitle')}
        subtitle={t('memberSub')}
        actions={
          <>
            <button
              className="btn btn-outline-white"
              onClick={handleRefreshData}
              id="btn-refresh-members"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              <span>ताजे करा (Refresh)</span>
            </button>

            {isAdmin && (
              <button
                className="btn btn-gold"
                onClick={() => {
                  setEditingMember(null);
                  setIsAddModalOpen(true);
                }}
                id="btn-open-add-member"
              >
                <UserPlus size={16} />
                <span>{t('addNewMemberBtn')}</span>
              </button>
            )}
          </>
        }
      />

      {/* 2. Leaderboard Card */}
      <LeaderboardCard leaderboard={leaderboard} />

      {/* 3. Member Directory & Permissions Table */}
      <MemberTable
        members={members}
        isAdmin={isAdmin}
        onEditMember={handleEditMember}
        onDeleteMember={handleDeleteMember}
      />

      {/* Add / Edit Member Modal */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingMember(null);
        }}
        editingMember={editingMember}
        onMemberSaved={handleMemberSaved}
      />
    </div>
  );
}
