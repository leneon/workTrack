// ============================================================
// WorkTrack Mobile - Contexte d'Authentification JWT
// ============================================================

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, deviceService } from '../services/api';

// ─── État initial ───────────────────────────────────────────
const initialState = {
  user: null,
  accessToken: null,
  isLoading: true,   // vrai pendant la vérification initiale du token
  isAuthenticated: false,
  error: null,
};

// ─── Actions ────────────────────────────────────────────────
const AUTH_ACTIONS = {
  RESTORE_TOKEN: 'RESTORE_TOKEN',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
};

// ─── Reducer ────────────────────────────────────────────────
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.RESTORE_TOKEN:
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.token,
        isAuthenticated: !!action.payload.token,
        isLoading: false,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
      };

    case AUTH_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };

    case AUTH_ACTIONS.UPDATE_USER:
      return { ...state, user: { ...state.user, ...action.payload } };

    default:
      return state;
  }
}

// ─── Création du contexte ───────────────────────────────────
const AuthContext = createContext(null);

// ─── Provider ───────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restauration du token au démarrage de l'app
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const [token, userJson] = await AsyncStorage.multiGet([
          'access_token',
          'user',
        ]);
        const accessToken = token[1];
        const user = userJson[1] ? JSON.parse(userJson[1]) : null;

        if (accessToken && user) {
          // Vérification que le token est encore valide
          try {
            const freshUser = await authService.getMe();
            await AsyncStorage.setItem('user', JSON.stringify(freshUser));
            dispatch({
              type: AUTH_ACTIONS.RESTORE_TOKEN,
              payload: { token: accessToken, user: freshUser },
            });
          } catch {
            // Token invalide → déconnexion silencieuse
            await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
            dispatch({ type: AUTH_ACTIONS.RESTORE_TOKEN, payload: { token: null, user: null } });
          }
        } else {
          dispatch({ type: AUTH_ACTIONS.RESTORE_TOKEN, payload: { token: null, user: null } });
        }
      } catch (e) {
        dispatch({ type: AUTH_ACTIONS.RESTORE_TOKEN, payload: { token: null, user: null } });
      }
    };

    bootstrapAsync();
  }, []);

  // ─── Actions exposées ──────────────────────────────────────
  const login = useCallback(async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
    try {
      const data = await authService.login(email, password);
      const { access_token, refresh_token, user } = data;

      await AsyncStorage.multiSet([
        ['access_token', access_token],
        ['refresh_token', refresh_token || ''],
        ['user', JSON.stringify(user)],
      ]);

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { token: access_token, user },
      });

      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Identifiants incorrects. Veuillez réessayer.';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: message });
      return { success: false, error: message };
    }
  }, []);

  const register = useCallback(async (payload) => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
    try {
      const data = await authService.register(payload);
      const { access_token, refresh_token, user } = data;

      await AsyncStorage.multiSet([
        ['access_token', access_token],
        ['refresh_token', refresh_token || ''],
        ['user', JSON.stringify(user)],
      ]);

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { token: access_token, user },
      });

      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Erreur lors de l'inscription.";
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: message });
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {}
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  }, []);

  const updateUser = useCallback((userData) => {
    dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: userData });
    AsyncStorage.getItem('user').then((json) => {
      const existing = json ? JSON.parse(json) : {};
      AsyncStorage.setItem('user', JSON.stringify({ ...existing, ...userData }));
    });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  const registerPushToken = useCallback(async (token, platform = 'android') => {
    try {
      await deviceService.registerPushToken({ token, platform });
    } catch (e) {
      console.warn('Push token registration failed:', e.message);
    }
  }, []);

  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    clearError,
    registerPushToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook personnalisé ──────────────────────────────────────
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }
  return context;
}

export default AuthContext;
