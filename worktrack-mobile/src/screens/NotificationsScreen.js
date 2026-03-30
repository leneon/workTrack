// ============================================================
// WorkTrack Mobile - Écran Notifications
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { notificationService } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme/colors';

const NOTIF_TYPES = {
  task_assigned: { icon: '📋', color: Colors.accent, bg: Colors.infoLight, label: 'Nouvelle tâche' },
  task_validated: { icon: '✅', color: Colors.statusDone, bg: Colors.statusDoneBg, label: 'Tâche validée' },
  task_reminder: { icon: '⏰', color: Colors.statusPending, bg: Colors.statusPendingBg, label: 'Rappel' },
  evaluation: { icon: '⭐', color: Colors.warning, bg: Colors.warningLight, label: 'Évaluation' },
  default: { icon: '🔔', color: Colors.primary, bg: Colors.grayExtraLight, label: 'Notification' },
};

function NotifItem({ notif, onPress, onMarkRead }) {
  const cfg = NOTIF_TYPES[notif.type] || NOTIF_TYPES.default;
  const timeAgo = (date) => {
    if (!date) return '';
    const diff = Math.floor((Date.now() - new Date(date)) / 60000);
    if (diff < 1) return 'À l\'instant';
    if (diff < 60) return `Il y a ${diff} min`;
    if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`;
    return new Date(date).toLocaleDateString('fr-FR');
  };

  return (
    <TouchableOpacity
      style={[styles.notifCard, !notif.is_read && styles.notifUnread]}
      onPress={() => onPress(notif)}
      activeOpacity={0.8}
    >
      <View style={[styles.notifIconBox, { backgroundColor: cfg.bg }]}>
        <Text style={styles.notifIcon}>{cfg.icon}</Text>
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifHeader}>
          <Text style={[styles.notifType, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={styles.notifTime}>{timeAgo(notif.created_at)}</Text>
        </View>
        <Text style={styles.notifTitle} numberOfLines={1}>{notif.title}</Text>
        <Text style={styles.notifMessage} numberOfLines={2}>{notif.message}</Text>
      </View>
      {!notif.is_read && (
        <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />
      )}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationService.getNotifications();
      const notifs = data.notifications || data || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.is_read).length);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); loadNotifications(); }, [loadNotifications]);

  const handleMarkRead = useCallback(async (notif) => {
    if (notif.is_read) return;
    try {
      await notificationService.markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      Alert.alert('Erreur', 'Impossible de marquer toutes les notifications');
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} non lue(s)</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🔕</Text>
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptyText}>Vous serez notifié des nouvelles tâches et validations.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <NotifItem notif={item} onPress={handleMarkRead} onMarkRead={handleMarkRead} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 20,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: { fontSize: Typography.fontSizes.xxl, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: Typography.fontSizes.sm, color: Colors.accent, marginTop: 4 },
  markAllBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.full, paddingHorizontal: 14, paddingVertical: 8 },
  markAllText: { color: Colors.white, fontSize: Typography.fontSizes.sm, fontWeight: '600' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSizes.lg, fontWeight: '700', color: Colors.primary },
  emptyText: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
  listContent: { padding: Spacing.base, paddingBottom: 32 },
  notifCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...Shadows.sm,
  },
  notifUnread: { borderLeftWidth: 3, borderLeftColor: Colors.accent },
  notifIconBox: { width: 46, height: 46, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md, flexShrink: 0 },
  notifIcon: { fontSize: 22 },
  notifContent: { flex: 1 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  notifType: { fontSize: Typography.fontSizes.xs, fontWeight: '700', textTransform: 'uppercase' },
  notifTime: { fontSize: Typography.fontSizes.xs, color: Colors.textLight },
  notifTitle: { fontSize: Typography.fontSizes.sm, fontWeight: '700', color: Colors.textPrimary },
  notifMessage: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
});
