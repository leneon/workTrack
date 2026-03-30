// ============================================================
// WorkTrack Mobile - Écran de Connexion
// Couleurs Hyundai : #002C5F (bleu) | #00AAD2 (accent)
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
  Dimensions,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const passwordRef = useRef(null);

  // ─── Validation ────────────────────────────────────────────
  const validate = () => {
    const errors = {};
    if (!email.trim()) errors.email = "L'email est requis";
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Email invalide';
    if (!password) errors.password = 'Le mot de passe est requis';
    else if (password.length < 6) errors.password = '6 caractères minimum';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Soumission ────────────────────────────────────────────
  const handleLogin = async () => {
    clearError();
    if (!validate()) return;
    setSubmitting(true);
    const result = await login(email.trim().toLowerCase(), password);
    setSubmitting(false);
    if (!result.success) {
      Alert.alert('Connexion échouée', result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header wave Hyundai */}
      <View style={styles.headerWave}>
        {/* Logo Hyundai WorkTrack */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoH}>H</Text>
          </View>
          <Text style={styles.logoTitle}>WorkTrack</Text>
          <Text style={styles.logoSubtitle}>Hyundai Motor Company</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <Text style={styles.welcomeTitle}>Bienvenue</Text>
          <Text style={styles.welcomeSub}>Connectez-vous à votre espace employé</Text>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Adresse email</Text>
            <View style={[styles.inputWrapper, fieldErrors.email && styles.inputError]}>
              <Text style={styles.inputIcon}>✉</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => { setEmail(t); setFieldErrors((e) => ({ ...e, email: '' })); }}
                placeholder="votre@email.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
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
                value={password}
                onChangeText={(t) => { setPassword(t); setFieldErrors((e) => ({ ...e, password: '' })); }}
                placeholder="••••••••"
                placeholderTextColor={Colors.textLight}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁' : '👁‍🗨'}</Text>
              </TouchableOpacity>
            </View>
            {fieldErrors.password ? <Text style={styles.errorText}>{fieldErrors.password}</Text> : null}
          </View>

          {/* Mot de passe oublié */}
          <TouchableOpacity style={styles.forgotContainer}>
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          {/* Bouton connexion */}
          <TouchableOpacity
            style={[styles.loginButton, submitting && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          {/* Séparateur */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Lien inscription */}
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>Créer un compte</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>WorkTrack v1.0 · Hyundai Motor</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  // ─── Header Wave ──────────────────────────────────────────
  headerWave: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...Shadows.md,
  },
  logoH: {
    fontSize: 38,
    fontWeight: Typography.fontWeights.extrabold,
    color: Colors.white,
    fontStyle: 'italic',
  },
  logoTitle: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
    letterSpacing: 1,
  },
  logoSubtitle: {
    fontSize: Typography.fontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // ─── Scroll ────────────────────────────────────────────────
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },

  // ─── Form Card ────────────────────────────────────────────
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    ...Shadows.lg,
  },
  welcomeTitle: {
    fontSize: Typography.fontSizes.xxxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },

  // ─── Champs ───────────────────────────────────────────────
  fieldGroup: {
    marginBottom: Spacing.base,
  },
  label: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
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
  inputError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 4,
  },
  eyeIcon: {
    fontSize: 18,
  },
  errorText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 4,
  },

  // ─── Mot de passe oublié ──────────────────────────────────
  forgotContainer: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.xl,
  },
  forgotText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.accent,
    fontWeight: Typography.fontWeights.medium,
  },

  // ─── Bouton Connexion ─────────────────────────────────────
  loginButton: {
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  loginButtonDisabled: {
    backgroundColor: Colors.grayLight,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 0.5,
  },

  // ─── Séparateur ───────────────────────────────────────────
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textLight,
    marginHorizontal: Spacing.sm,
  },

  // ─── Bouton Inscription ────────────────────────────────────
  registerButton: {
    height: 54,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 0.5,
  },

  versionText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
