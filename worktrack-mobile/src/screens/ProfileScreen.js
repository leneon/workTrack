// ============================================================
// WorkTrack Mobile - Écran Profil & Évaluations
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { employeeService, taskService } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme/colors';

// ─── Barre d'étoiles ──────────────────────────────────────
function StarRating({ value, max = 5 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <Text key={i} style={{ fontSize: 18, color: i < Math.round(value) ? '#F39C12' : Colors.grayLight }}>
          ★
        </Text>
      ))}
    </View>
  );
}

// ─── Carte d'évaluation ───────────────────────────────────
function RatingCard({ rating }) {
  return (
    <View style={styles.ratingCard}>
      <View style={styles.ratingCardHeader}>
        <Text style={styles.ratingManager}>👤 {rating.manager_name || 'Manager'}</Text>
        <Text style={styles.ratingDate}>
          {rating.created_at ? new Date(rating.created_at).toLocaleDateString('fr-FR') : '—'}
        </Text>
      </View>
      <StarRating value={rating.score} />
      <Text style={styles.ratingScore}>{rating.score}/5</Text>
      {rating.comment && (
        <Text style={styles.ratingComment}>" {rating.comment} "</Text>
      )}
    </View>
  );
}

// ─── Section Info ─────────────────────────────────────────
function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const [ratings, setRatings] = useState([]);
  const [average, setAverage] = useState(null);
  const [taskStats, setTaskStats] = useState({ total: 0, done: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const [ratingsData, avgData, tasksData] = await Promise.all([
        employeeService.getMyRatings(user.id),
        employeeService.getMyAverage(user.id),
        taskService.getMyTasks({ limit: 100 }),
      ]);

      setRatings(ratingsData.ratings || ratingsData || []);
      setAverage(avgData.average);

      const tasks = tasksData.tasks || [];
      setTaskStats({ total: tasks.length, done: tasks.filter((t) => t.status === 'done').length });
    } catch {
      // Silence — données partielles acceptées
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: logout },
      ]
    );
  };

  const completionRate = taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0;

  const LEVEL_COLORS = {
    junior: Colors.statusPending,
    senior: Colors.statusInProgress,
    manager: Colors.statusDone,
  };
  const levelColor = LEVEL_COLORS[user?.level?.toLowerCase()] || Colors.accent;

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Avatar */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || 'EM'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Employé'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
        <View style={[styles.levelBadge, { backgroundColor: levelColor + '25', borderColor: levelColor }]}>
          <Text style={[styles.levelText, { color: levelColor }]}>
            {user?.level || 'Employé'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Statistiques résumées */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{taskStats.total}</Text>
            <Text style={styles.statLabel}>Tâches</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMiddle]}>
            <Text style={styles.statValue}>{taskStats.done}</Text>
            <Text style={styles.statLabel}>Terminées</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{completionRate}%</Text>
            <Text style={styles.statLabel}>Complétion</Text>
          </View>
        </View>

        {/* Note globale */}
        {average !== null && (
          <View style={styles.avgCard}>
            <View style={styles.avgLeft}>
              <Text style={styles.avgTitle}>Note globale</Text>
              <StarRating value={average} />
              <Text style={styles.avgRatingsCount}>{ratings.length} évaluation(s)</Text>
            </View>
            <View style={styles.avgRight}>
              <Text style={styles.avgScore}>{average.toFixed(1)}</Text>
              <Text style={styles.avgMax}>/5</Text>
            </View>
          </View>
        )}

        {/* Infos personnelles */}
        <Text style={styles.sectionTitle}>Informations personnelles</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="👤" label="Nom complet" value={user?.name} />
          <View style={styles.infoDivider} />
          <InfoRow icon="✉" label="Email" value={user?.email} />
          <View style={styles.infoDivider} />
          <InfoRow icon="🏢" label="Département" value={user?.department} />
          <View style={styles.infoDivider} />
          <InfoRow icon="📅" label="Membre depuis" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '—'} />
        </View>

        {/* Historique des évaluations */}
        <Text style={styles.sectionTitle}>Historique des évaluations</Text>
        {ratings.length === 0 ? (
          <View style={styles.emptyRatings}>
            <Text style={styles.emptyIcon}>⭐</Text>
            <Text style={styles.emptyText}>Aucune évaluation pour le moment</Text>
          </View>
        ) : (
          ratings.map((r) => <RatingCard key={r.id} rating={r} />)
        )}

        {/* Bouton Déconnexion */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>WorkTrack v1.0 · Hyundai Motor Company</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ─── Header Profil ────────────────────────────────────────
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 36,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { fontSize: Typography.fontSizes.xxxl, fontWeight: '800', color: Colors.white },
  userName: { fontSize: Typography.fontSizes.xl, fontWeight: '700', color: Colors.white },
  userEmail: { fontSize: Typography.fontSizes.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  levelBadge: {
    marginTop: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  levelText: { fontSize: Typography.fontSizes.sm, fontWeight: '700', textTransform: 'capitalize' },

  scrollContent: { padding: Spacing.base, paddingBottom: 40 },
  sectionTitle: { fontSize: Typography.fontSizes.base, fontWeight: '700', color: Colors.primary, marginTop: Spacing.lg, marginBottom: Spacing.sm },

  // ─── Stats ────────────────────────────────────────────────
  statsRow: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.sm, marginTop: Spacing.base },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: Spacing.base },
  statBoxMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.borderLight },
  statValue: { fontSize: Typography.fontSizes.xxl, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, marginTop: 4 },

  // ─── Note Globale ─────────────────────────────────────────
  avgCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadows.md,
  },
  avgLeft: { flex: 1 },
  avgTitle: { fontSize: Typography.fontSizes.sm, color: 'rgba(255,255,255,0.75)', marginBottom: 6 },
  avgRatingsCount: { fontSize: Typography.fontSizes.xs, color: 'rgba(255,255,255,0.6)', marginTop: 6 },
  avgRight: { flexDirection: 'row', alignItems: 'flex-end' },
  avgScore: { fontSize: 52, fontWeight: '800', color: Colors.white, lineHeight: 56 },
  avgMax: { fontSize: Typography.fontSizes.lg, color: 'rgba(255,255,255,0.6)', marginBottom: 8, marginLeft: 2 },

  // ─── Infos Card ───────────────────────────────────────────
  infoCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base },
  infoIcon: { fontSize: 20, marginRight: Spacing.md, width: 28 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: Typography.fontSizes.sm, fontWeight: '600', color: Colors.textPrimary, marginTop: 2 },
  infoDivider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: Spacing.base + 28 + Spacing.md },

  // ─── Ratings ──────────────────────────────────────────────
  ratingCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  ratingCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  ratingManager: { fontSize: Typography.fontSizes.sm, fontWeight: '600', color: Colors.textPrimary },
  ratingDate: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary },
  ratingScore: { fontSize: Typography.fontSizes.sm, fontWeight: '700', color: Colors.warning, marginTop: 4 },
  ratingComment: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, fontStyle: 'italic', marginTop: 8, lineHeight: 20 },

  // ─── Empty Ratings ────────────────────────────────────────
  emptyRatings: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 32, alignItems: 'center', ...Shadows.sm },
  emptyIcon: { fontSize: 36, marginBottom: Spacing.sm },
  emptyText: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary },

  // ─── Logout ───────────────────────────────────────────────
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    height: 54,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.error,
    gap: Spacing.sm,
  },
  logoutIcon: { fontSize: 20 },
  logoutText: { fontSize: Typography.fontSizes.base, fontWeight: '700', color: Colors.error },

  versionText: { fontSize: Typography.fontSizes.xs, color: Colors.textLight, textAlign: 'center', marginTop: Spacing.lg },
});
