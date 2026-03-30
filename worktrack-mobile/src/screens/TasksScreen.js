// ============================================================
// WorkTrack Mobile - Écran Mes Tâches
// Filtrage : pending | in_progress | done
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { taskService } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme/colors';

// ─── Constantes ───────────────────────────────────────────
const STATUS_FILTERS = [
  { key: 'all', label: 'Toutes', icon: '📋' },
  { key: 'pending', label: 'En attente', icon: '⏳' },
  { key: 'in_progress', label: 'En cours', icon: '🔄' },
  { key: 'done', label: 'Terminées', icon: '✅' },
];

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: Colors.statusPending, bg: Colors.statusPendingBg, next: 'in_progress', nextLabel: 'Démarrer' },
  in_progress: { label: 'En cours', color: Colors.statusInProgress, bg: Colors.statusInProgressBg, next: 'done', nextLabel: 'Terminer' },
  done: { label: 'Terminée', color: Colors.statusDone, bg: Colors.statusDoneBg, next: null, nextLabel: null },
};

const PRIORITY_CONFIG = {
  high: { label: 'Haute', color: Colors.error },
  medium: { label: 'Moyenne', color: Colors.warning },
  low: { label: 'Basse', color: Colors.success },
};

// ─── Composant TaskCard ────────────────────────────────────
function TaskCard({ task, onPress, onStatusChange }) {
  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const prio = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  return (
    <TouchableOpacity style={styles.taskCard} onPress={() => onPress(task)} activeOpacity={0.85}>
      {/* Header de la carte */}
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        {task.priority && (
          <View style={styles.priorityBadge}>
            <Text style={[styles.priorityText, { color: prio.color }]}>
              ● {prio.label}
            </Text>
          </View>
        )}
      </View>

      {/* Titre */}
      <Text style={styles.cardTitle} numberOfLines={2}>{task.title}</Text>
      {task.description ? (
        <Text style={styles.cardDescription} numberOfLines={2}>{task.description}</Text>
      ) : null}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.cardDue}>
          {task.due_date
            ? `📅 ${new Date(task.due_date).toLocaleDateString('fr-FR')}`
            : '📅 Pas d\'échéance'}
        </Text>
        {cfg.next && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: cfg.color }]}
            onPress={() => onStatusChange(task.id, cfg.next)}
          >
            <Text style={styles.actionButtonText}>{cfg.nextLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Rapport joint */}
      {task.has_report && (
        <View style={styles.reportTag}>
          <Text style={styles.reportTagText}>📎 Rapport joint</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Modale Détail Tâche ──────────────────────────────────
function TaskDetailModal({ task, visible, onClose, onStatusChange, onAttachReport }) {
  if (!task) return null;
  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        {/* Header modale */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Détail de la tâche</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Statut */}
          <View style={[styles.modalStatusBanner, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.modalStatusText, { color: cfg.color }]}>
              {cfg.label}
            </Text>
          </View>

          {/* Titre */}
          <Text style={styles.modalTaskTitle}>{task.title}</Text>

          {/* Description */}
          {task.description && (
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionLabel}>Description</Text>
              <Text style={styles.modalSectionText}>{task.description}</Text>
            </View>
          )}

          {/* Informations */}
          <View style={styles.modalInfoGrid}>
            <View style={styles.modalInfoItem}>
              <Text style={styles.modalInfoLabel}>Échéance</Text>
              <Text style={styles.modalInfoValue}>
                {task.due_date ? new Date(task.due_date).toLocaleDateString('fr-FR') : '—'}
              </Text>
            </View>
            <View style={styles.modalInfoItem}>
              <Text style={styles.modalInfoLabel}>Priorité</Text>
              <Text style={[styles.modalInfoValue, { color: PRIORITY_CONFIG[task.priority]?.color }]}>
                {PRIORITY_CONFIG[task.priority]?.label || '—'}
              </Text>
            </View>
            <View style={styles.modalInfoItem}>
              <Text style={styles.modalInfoLabel}>Assignée par</Text>
              <Text style={styles.modalInfoValue}>{task.assigned_by || '—'}</Text>
            </View>
            <View style={styles.modalInfoItem}>
              <Text style={styles.modalInfoLabel}>Créée le</Text>
              <Text style={styles.modalInfoValue}>
                {task.created_at ? new Date(task.created_at).toLocaleDateString('fr-FR') : '—'}
              </Text>
            </View>
          </View>

          {/* Actions */}
          {cfg.next && (
            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: cfg.color }]}
              onPress={() => { onStatusChange(task.id, cfg.next); onClose(); }}
            >
              <Text style={styles.modalActionBtnText}>
                {cfg.nextLabel === 'Démarrer' ? '▶ Démarrer la tâche' : '✅ Marquer comme terminée'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Joindre rapport */}
          {task.status !== 'pending' && (
            <TouchableOpacity
              style={styles.modalAttachBtn}
              onPress={() => { onAttachReport(task); onClose(); }}
            >
              <Text style={styles.modalAttachBtnText}>📎 Joindre un rapport</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Écran Principal ───────────────────────────────────────
export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const loadTasks = useCallback(async () => {
    try {
      const params = {};
      if (activeFilter !== 'all') params.status = activeFilter;
      const data = await taskService.getMyTasks(params);
      setTasks(data.tasks || []);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les tâches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    setLoading(true);
    loadTasks();
  }, [activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTasks();
  }, [loadTasks]);

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    setUpdatingId(taskId);
    try {
      const updated = await taskService.updateTaskStatus(taskId, newStatus);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      Alert.alert('Succès', `Tâche mise à jour : ${STATUS_CONFIG[newStatus].label}`);
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour la tâche');
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const handleAttachReport = useCallback((task) => {
    Alert.alert(
      'Joindre un rapport',
      `Souhaitez-vous joindre un document pour la tâche "${task.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Choisir un fichier',
          onPress: () => {
            // DocumentPicker à intégrer avec react-native-document-picker
            Alert.alert('Info', 'Intégrez react-native-document-picker pour cette fonctionnalité');
          },
        },
      ]
    );
  }, []);

  // Filtrage local par recherche
  const filteredTasks = tasks.filter((t) =>
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const renderTask = useCallback(
    ({ item }) => (
      <TaskCard
        task={item}
        onPress={(t) => { setSelectedTask(t); setModalVisible(true); }}
        onStatusChange={handleStatusChange}
      />
    ),
    [handleStatusChange]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Tâches</Text>
        <Text style={styles.headerSub}>{filteredTasks.length} tâche(s)</Text>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une tâche..."
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={styles.filterIcon}>{f.icon}</Text>
            <Text style={[styles.filterLabel, activeFilter === f.key && styles.filterLabelActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Liste des tâches */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : filteredTasks.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>Aucune tâche</Text>
          <Text style={styles.emptyText}>
            {search ? 'Aucun résultat pour votre recherche' : 'Aucune tâche dans cette catégorie'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTask}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
          }
        />
      )}

      {/* Modale Détail */}
      <TaskDetailModal
        task={selectedTask}
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setSelectedTask(null); }}
        onStatusChange={handleStatusChange}
        onAttachReport={handleAttachReport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // ─── Header ──────────────────────────────────────────────
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 20,
    paddingHorizontal: Spacing.base,
  },
  headerTitle: { fontSize: Typography.fontSizes.xxl, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: Typography.fontSizes.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  // ─── Recherche ────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    height: 48,
    ...Shadows.sm,
  },
  searchIcon: { fontSize: 16, marginRight: Spacing.sm },
  searchInput: { flex: 1, fontSize: Typography.fontSizes.sm, color: Colors.textPrimary },
  searchClear: { fontSize: 14, color: Colors.textSecondary, padding: 4 },

  // ─── Filtres ──────────────────────────────────────────────
  filterRow: { marginTop: Spacing.md },
  filterContent: { paddingHorizontal: Spacing.base, gap: Spacing.sm },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 4,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterIcon: { fontSize: 14 },
  filterLabel: { fontSize: Typography.fontSizes.sm, fontWeight: '500', color: Colors.textSecondary },
  filterLabelActive: { color: Colors.white, fontWeight: '700' },

  // ─── Liste ────────────────────────────────────────────────
  listContent: { padding: Spacing.base, paddingBottom: 32 },

  // ─── TaskCard ─────────────────────────────────────────────
  taskCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: Typography.fontSizes.xs, fontWeight: '700' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4 },
  priorityText: { fontSize: Typography.fontSizes.xs, fontWeight: '600' },
  cardTitle: { fontSize: Typography.fontSizes.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  cardDescription: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  cardDue: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary },
  actionButton: { borderRadius: BorderRadius.full, paddingHorizontal: 14, paddingVertical: 6 },
  actionButtonText: { color: Colors.white, fontSize: Typography.fontSizes.xs, fontWeight: '700' },
  reportTag: { marginTop: Spacing.sm, alignSelf: 'flex-start', backgroundColor: Colors.accentLight + '22', borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  reportTagText: { fontSize: Typography.fontSizes.xs, color: Colors.accent },

  // ─── Empty / Loading ──────────────────────────────────────
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSizes.lg, fontWeight: '700', color: Colors.primary },
  emptyText: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },

  // ─── Modale Détail ────────────────────────────────────────
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 16,
    paddingHorizontal: Spacing.base,
  },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  modalTitle: { color: Colors.white, fontSize: Typography.fontSizes.base, fontWeight: '700' },
  modalContent: { padding: Spacing.base },
  modalStatusBanner: { borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.base },
  modalStatusText: { fontSize: Typography.fontSizes.base, fontWeight: '700' },
  modalTaskTitle: { fontSize: Typography.fontSizes.xl, fontWeight: '800', color: Colors.primary, marginBottom: Spacing.base },
  modalSection: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md, ...Shadows.sm },
  modalSectionLabel: { fontSize: Typography.fontSizes.xs, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 6 },
  modalSectionText: { fontSize: Typography.fontSizes.sm, color: Colors.textPrimary, lineHeight: 22 },
  modalInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  modalInfoItem: { width: '47%', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadows.sm },
  modalInfoLabel: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, marginBottom: 4 },
  modalInfoValue: { fontSize: Typography.fontSizes.sm, fontWeight: '700', color: Colors.textPrimary },
  modalActionBtn: { borderRadius: BorderRadius.xl, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, ...Shadows.md },
  modalActionBtnText: { color: Colors.white, fontSize: Typography.fontSizes.base, fontWeight: '700' },
  modalAttachBtn: { height: 52, borderRadius: BorderRadius.xl, borderWidth: 2, borderColor: Colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  modalAttachBtnText: { color: Colors.accent, fontSize: Typography.fontSizes.base, fontWeight: '700' },
});
