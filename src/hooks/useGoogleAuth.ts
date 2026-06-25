/**
 * useGoogleAuth
 *
 * Google Sign-In hook — usa el SDK nativo (@react-native-google-signin).
 * NO abre navegador, NO usa redirect URIs, NO necesita configurar schemes.
 * Usa directamente Google Play Services (Android) / Sign-In framework (iOS).
 *
 * .env:
 *   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID – Web client ID (obligatorio)
 *
 * El plugin en app.json ya está: "@react-native-google-signin/google-signin"
 */

import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
const TOKEN_KEY = "google_access_token";
const USER_KEY = "google_user_info";

// ---------------------------------------------------------------------------
export interface GoogleUser {
  sub: string;
  email: string;
  name: string;
  picture: string;
  email_verified?: boolean;
}

// ---------------------------------------------------------------------------
let configured = false;

function ensureConfigured() {
  if (configured) return;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
  if (!webClientId) {
    console.error("❌ Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en .env");
    return;
  }
  GoogleSignin.configure({
    webClientId,
  });
  configured = true;
}

// ---------------------------------------------------------------------------
export function useGoogleAuth(): {
  user: GoogleUser | null;
  accessToken: string | null;
  loading: boolean;
  isSignedIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
} {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ---- Restore session on mount ----
  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const [tok, saved] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (c) return;
        if (tok && saved) {
          setAccessToken(tok);
          setUser(JSON.parse(saved));
        }
      } catch (err) {
        console.warn("Restore failed:", err);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  // ---- signIn ----
  const signIn = useCallback(async () => {
    ensureConfigured();
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const at = response.data.idToken;
        if (!at) {
          console.error("No idToken in response");
          return;
        }

        // El SDK ya nos da el perfil; no hace falta llamar a userinfo
        const u = response.data.user;
        const googleUser: GoogleUser = {
          sub: u.id,
          email: u.email,
          name: u.name ?? u.email,
          picture: u.photo ?? "",
        };

        // Persistir
        await Promise.all([
          SecureStore.setItemAsync(TOKEN_KEY, at),
          SecureStore.setItemAsync(USER_KEY, JSON.stringify(googleUser)),
        ]);

        setAccessToken(at);
        setUser(googleUser);
      }
    } catch (err) {
      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.IN_PROGRESS:
            console.log("Sign-in already in progress");
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            console.error("Google Play Services not available");
            break;
          case statusCodes.SIGN_IN_CANCELLED:
            console.log("User cancelled sign-in");
            break;
          default:
            console.error("Sign-in error:", err.code, err.message);
        }
      } else {
        console.error("Sign-in failed:", err);
      }
    }
  }, []);

  // ---- signOut ----
  const signOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
    } catch (err) {
      console.warn("Native sign-out warning:", err);
    }
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    setAccessToken(null);
    setUser(null);
  }, []);

  return {
    user,
    accessToken,
    loading,
    isSignedIn: !!user && !!accessToken,
    signIn,
    signOut,
  };
}
