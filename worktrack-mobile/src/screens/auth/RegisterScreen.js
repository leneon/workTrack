// ============================================================
// WorkTrack Mobile - Écran d'Inscription
// ============================================================

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/colors';

export default function RegisterScreen({ navigation }) {
  const { register, clearError } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const updateField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Le nom complet est requis';
    if (!form.email.trim()) errors.email = "L'email est requis";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Email invalide';
    if (!form.password) errors.password = 'Le mot de passe est requis';
    else if (form.password.length < 6) errors.password = '6 caractères minimum';
    if (form.password !== form.confirmPassword) errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    clearError();
    if (!validate()) return;
    setSubmitting(true);
    const result = await register({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    setSubmitting(false);
    if (!result.success) {
      Alert.alert('Erreur', result.error);
    }
  };

  const fields = [
    { key: 'name', label: 'Nom complet', icon: '👤', placeholder: 'Jean Dupont', keyboard: 'default', next: emailRef, capitalize: 'words' },
    { key: 'email', label: 'Adresse email', icon: '✉', placeholder: 'votre@email.com', keyboard: 'email-address', next: passwordRef, ref: emailRef },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoH}>H</Text>
          </View>
          <Text style={styles.headerTitle}>Créer un compte</Text>
          <Text style={styles.headerSub}>Rejoignez WorkTrack Hyundai</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          {/* Nom complet */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nom complet</Text>
            <View style={[styles.inputWrapper, fieldErrors.name && styles.inputError]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(t) => updateField('name', t)}
                placeholder="Jean Dupont"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
            {fieldErrors.name ? <Text style={styles.errorText}>{fieldErrors.name}</Text> : null}
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Adresse email</Text>
            <View style={[styles.inputWrapper, fieldErrors.email && styles.inputError]}>
              <Text style={styles.inputIcon}>✉</Text>
              <TextInput
                ref={emailRef}
                style={styles.input}
                value={form.email}
                onChangeText={(t) => updateField('email', t)}
                placeholder="votre@email.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
            {fieldErrors.email ? <Text style={styles.errorText}>{fieldErrors.email}</Text> : null}
          </View>

          {/* Mot de passe */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={[styles.inputWrapper, fieldErrors.password && styles.inputError]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                value={form.password}
                onChangeText={(t) => updateField('password', t)}
                placeholder="••••••••"
                placeholderTextColor={Colors.textLight}
                secureTextEntry={!showPassword}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Text style={styles.eyeIcon}>{showPassword ? '👁' : '👁‍🗨'}</Text>
              </TouchableOpacity>
            </View>
            {fieldErrors.password ? <Text style={styles.errorText}>{fieldErrors.password}</Text> : null}
          </View>

          {/* Confirmer mot de passe */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <View style={[styles.inputWrapper, fieldErrors.confirmPassword && styles.inputError]}>
              <Text style={styles.inputIcon}>🔐</Text>
              <TextInput
                ref={confirmRef}
                style={styles.input}
                value={form.confirmPassword}
                onChangeText={(t) => updateField('confirmPassword', t)}
                placeholder="••••••••"
                placeholderTextColor={Colors.textLight}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </View>
            {fieldErrors.confirmPassword ? <Text style={styles.errorText}>{fieldErrors.confirmPassword}</Text> : null}
          </View>

          {/* Bouton S'inscrire */}
          <TouchableOpacity
            style={[styles.registerButton, submitting && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.registerButtonText}>Créer mon compte</Text>
            )}
          </TouchableOpacity>

          {/* Lien connexion */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              Déjà un compte ? <Text style={styles.loginLinkBold}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },

  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: Spacing.base,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  backIcon: { fontSize: 22, color: Colors.white, fontWeight: 'bold' },
  headerContent: { alignItems: 'center' },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoH: { fontSize: 30, fontWeight: '800', color: Colors.white, fontStyle: 'italic' },
  headerTitle: { fontSize: Typography.fontSizes.xxl, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: Typography.fontSizes.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  scrollContent: { flexGrow: 1, padding: Spacing.base, paddingBottom: 40 },

  formCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    ...Shadows.lg,
  },

  fieldGroup: { marginBottom: Spacing.base },
  label: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  inputError: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  inputIcon: { fontSize: 16, marginRight: Spacing.sm },
  input: { flex: 1, fontSize: Typography.fontSizes.base, color: Colors.textPrimary },
  eyeButton: { padding: 4 },
  eyeIcon: { fontSize: 18 },
  errorText: { fontSize: Typography.fontSizes.xs, color: Colors.error, marginTop: 4, marginLeft: 4 },

  registerButton: {
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    ...Shadows.md,
  },
  buttonDisabled: { backgroundColor: Colors.grayLight },
  registerButtonText: { color: Colors.white, fontSize: Typography.fontSizes.base, fontWeight: '700' },

  loginLink: { alignItems: 'center', marginTop: Spacing.lg },
  loginLinkText: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary },
  loginLinkBold: { color: Colors.primary, fontWeight: '700' },
});
