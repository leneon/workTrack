// ============================================================
// WorkTrack Mobile - Dashboard Employé
// Couleurs Hyundai #002C5F / #00AAD2
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { taskService, notificationService, employeeService } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme/colors';

// ─── Composant Carte Statistique ──────────────────────────
function StatCard({ count, label, color, bg, icon }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Composant Tâche récente ───────────────────────────────
function RecentTaskItem({ task, onPress }) {
  const statusConfig = {
    pending: { label: 'En attente', color: Colors.statusPending, bg: Colors.statusPendingBg },
    in_progress: { label: 'En cours', color: Colors.statusInProgress, bg: Colors.statusInProgressBg },
    done: { label: 'Terminée', color: Colors.statusDone, bg: Colors.statusDoneBg },
  };
  const cfg = statusConfig[task.status] || statusConfig.pending;

  return (
    <TouchableOpacity style={styles.taskItem} onPress={() => onPress(task)} activeOpacity={0.8}>
      <View style={[styles.taskStatusDot, { backgroundColor: cfg.color }]} />
      <View style={styles.taskInfo}>
        <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
        <Text style={styles.taskDue}>
          {task.due_date ? `Échéance : ${new Date(task.due_date).toLocaleDateString('fr-FR')}` : 'Pas d\'échéance'}
        </Text>
      </View>
      <View style={[styles.taskBadge, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.taskBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ pending: 0, in_progress: 0, done: 0, total: 0 });
  const [recentTasks, setRecentTasks] = useState([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [averageRating, setAverageRating] = useState(null);

  // ─── Chargement des données ────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [tasksData, notifsData] = await Promise.all([
        taskService.getMyTasks({ limit: 20 }),
        notificationService.getUnreadCount(),
      ]);

      const tasks = tasksData.tasks || [];
      const pending = tasks.filter((t) => t.status === 'pending').length;
      const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
      const done = tasks.filter((t) => t.status === 'done').length;

      setStats({ pending, in_progress: inProgress, done, total: tasks.length });
      setRecentTasks(tasks.slice(0, 5));
      setUnreadNotifs(notifsData.count || 0);

      if (user?.id) {
        try {
          const ratingData = await employeeService.getMyAverage(user.id);
          setAverageRating(ratingData.average);
        } catch {}
      }
    } catch (error) {
      console.error('Dashboard load error:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // ─── Heure du jour ─────────────────────────────────────
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header Hyundai */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{user?.name || 'Employé'}</Text>
          <Text style={styles.userRole}>{user?.role || 'Employé'} · Hyundai Motor</Text>
        </View>
        <TouchableOpacity
          style={styles.notifButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.notifIcon}>🔔</Text>
          {unreadNotifs > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Section Statistiques */}
        <Text style={styles.sectionTitle}>Aperçu de mes tâches</Text>
        <View style={styles.statsRow}>
          <StatCard
            count={stats.pending}
            label="En attente"
            color={Colors.statusPending}
            bg={Colors.statusPendingBg}
            icon="⏳"
          />
          <StatCard
            count={stats.in_progress}
            label="En cours"
            color={Colors.statusInProgress}
            bg={Colors.statusInProgressBg}
            icon="🔄"
          />
          <StatCard
            count={stats.done}
            label="Terminées"
            color={Colors.statusDone}
            bg={Colors.statusDoneBg}
            icon="✅"
          />
        </View>

        {/* Barre de progression globale */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Taux de complétion</Text>
            <Text style={styles.progressPercent}>
              {stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${stats.total > 0 ? (stats.done / stats.total) * 100 : 0}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressSub}>
            {stats.done} tâche(s) terminée(s) sur {stats.total}
          </Text>
        </View>

        {/* Évaluation */}
        {averageRating !== null && (
          <View style={styles.ratingCard}>
            <Text style={styles.ratingIcon}>⭐</Text>
            <View style={styles.ratingInfo}>
              <Text style={styles.ratingTitle}>Ma note globale</Text>
              <Text style={styles.ratingValue}>{averageRating.toFixed(1)} / 5</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.ratingLink}
            >
              <Text style={styles.ratingLinkText}>Voir →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Accès rapide */}
        <Text style={styles.sectionTitle}>Accès rapide</Text>
        <View style={styles.quickActions}>
          {[
            { icon: '📋', label: 'Mes Tâches', screen: 'Tasks', color: Colors.primary },
            { icon: '📎', label: 'Rapports', screen: 'Reports', color: Colors.accent },
            { icon: '🔔', label: 'Notifications', screen: 'Notifications', color: Colors.statusPending },
            { icon: '👤', label: 'Profil', screen: 'Profile', color: Colors.statusDone },
          ].map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={[styles.quickCard, { borderTopColor: item.color }]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.8}
            >
              <Text style={styles.quickIcon}>{item.icon}</Text>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tâches récentes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tâches récentes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
            <Text style={styles.seeAll}>Voir tout →</Text>
          </TouchableOpacity>
        </View>

        {recentTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Aucune tâche assignée pour le moment</Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {recentTasks.map((task) => (
              <RecentTaskItem
                key={task.id}
                task={task}
                onPress={() => navigation.navigate('Tasks', { taskId: task.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: 12, color: Colors.textSecondary, fontSize: Typography.fontSizes.sm },

  // ─── Header ──────────────────────────────────────────────
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 28,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  greeting: { fontSize: Typography.fontSizes.md, color: 'rgba(255,255,255,0.75)' },
  userName: { fontSize: Typography.fontSizes.xxl, fontWeight: '700', color: Colors.white, marginTop: 2 },
  userRole: { fontSize: Typography.fontSizes.xs, color: Colors.accent, marginTop: 4, fontWeight: '500' },
  notifButton: { position: 'relative', width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  notifIcon: { fontSize: 22 },
  notifBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: Colors.error, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notifBadgeText: { fontSize: 9, color: Colors.white, fontWeight: '700' },

  // ─── Scroll ──────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.base, paddingBottom: 32 },

  sectionTitle: { fontSize: Typography.fontSizes.base, fontWeight: '700', color: Colors.primary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  seeAll: { fontSize: Typography.fontSizes.sm, color: Colors.accent, fontWeight: '600' },

  // ─── Stats ────────────────────────────────────────────────
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, borderRadius: BorderRadius.xl, padding: Spacing.md, alignItems: 'center', ...Shadows.sm },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statCount: { fontSize: Typography.fontSizes.xxxl, fontWeight: '800' },
  statLabel: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },

  // ─── Progress ─────────────────────────────────────────────
  progressCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.base, marginTop: Spacing.md, ...Shadows.sm },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  progressTitle: { fontSize: Typography.fontSizes.sm, fontWeight: '600', color: Colors.textPrimary },
  progressPercent: { fontSize: Typography.fontSizes.sm, fontWeight: '700', color: Colors.primary },
  progressBarBg: { height: 8, backgroundColor: Colors.grayExtraLight, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  progressSub: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, marginTop: 6 },

  // ─── Rating ───────────────────────────────────────────────
  ratingCard: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, padding: Spacing.base, marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', ...Shadows.md },
  ratingIcon: { fontSize: 30, marginRight: Spacing.md },
  ratingInfo: { flex: 1 },
  ratingTitle: { fontSize: Typography.fontSizes.sm, color: 'rgba(255,255,255,0.75)' },
  ratingValue: { fontSize: Typography.fontSizes.xl, fontWeight: '700', color: Colors.white },
  ratingLink: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 6 },
  ratingLinkText: { color: Colors.white, fontWeight: '600', fontSize: Typography.fontSizes.sm },

  // ─── Quick Actions ────────────────────────────────────────
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickCard: { width: '47%', backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.base, alignItems: 'center', borderTopWidth: 3, ...Shadows.sm },
  quickIcon: { fontSize: 28, marginBottom: 6 },
  quickLabel: { fontSize: Typography.fontSizes.sm, fontWeight: '600', color: Colors.textPrimary },

  // ─── Task List ────────────────────────────────────────────
  taskList: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.sm },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  taskStatusDot: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.md },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: Typography.fontSizes.sm, fontWeight: '600', color: Colors.textPrimary },
  taskDue: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  taskBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  taskBadgeText: { fontSize: Typography.fontSizes.xs, fontWeight: '700' },

  // ─── Empty ────────────────────────────────────────────────
  emptyCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 40, alignItems: 'center', ...Shadows.sm },
  emptyIcon: { fontSize: 40, marginBottom: Spacing.md },
  emptyText: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, textAlign: 'center' },
});
