// ============================================================
// WorkTrack Mobile - Écran Rapports
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Platform, Linking,
} from 'react-native';
import { reportService } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme/colors';

const FILE_ICONS = {
  pdf: '📄',
  doc: '📝',
  docx: '📝',
  xls: '📊',
  xlsx: '📊',
  png: '🖼',
  jpg: '🖼',
  jpeg: '🖼',
  default: '📎',
};

function ReportCard({ report, onDownload }) {
  const ext = report.filename?.split('.').pop()?.toLowerCase() || 'default';
  const icon = FILE_ICONS[ext] || FILE_ICONS.default;
  const date = report.created_at ? new Date(report.created_at).toLocaleDateString('fr-FR') : '—';

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.fileIconBox}>
          <Text style={styles.fileIcon}>{icon}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{report.filename || 'Rapport'}</Text>
          <Text style={styles.cardTask} numberOfLines={1}>Tâche : {report.task_title || '—'}</Text>
          <Text style={styles.cardDate}>{date}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.downloadBtn} onPress={() => onDownload(report)}>
        <Text style={styles.downloadIcon}>⬇</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ReportsScreen() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const data = await reportService.getMyReports();
      setReports(data.reports || data || []);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les rapports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); loadReports(); }, [loadReports]);

  const handleDownload = useCallback(async (report) => {
    try {
      const { url } = await reportService.getDownloadUrl(report.id);
      await Linking.openURL(url);
    } catch {
      Alert.alert('Erreur', 'Impossible de télécharger le fichier');
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Rapports</Text>
        <Text style={styles.headerSub}>{reports.length} document(s) joint(s)</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyTitle}>Aucun rapport</Text>
          <Text style={styles.emptyText}>Vous n'avez pas encore joint de rapport sur vos tâches.</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ReportCard report={item} onDownload={handleDownload} />}
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
  },
  headerTitle: { fontSize: Typography.fontSizes.xxl, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: Typography.fontSizes.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSizes.lg, fontWeight: '700', color: Colors.primary },
  emptyText: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
  listContent: { padding: Spacing.base, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  fileIconBox: { width: 48, height: 48, borderRadius: BorderRadius.lg, backgroundColor: Colors.grayExtraLight, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  fileIcon: { fontSize: 24 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: Typography.fontSizes.sm, fontWeight: '700', color: Colors.textPrimary },
  cardTask: { fontSize: Typography.fontSizes.xs, color: Colors.accent, marginTop: 2 },
  cardDate: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  downloadBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  downloadIcon: { fontSize: 18 },
});
