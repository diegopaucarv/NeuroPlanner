import "./global.css";
import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import NavBar from "./src/NavBar";
import { Vista } from "./src/lib/types";
import Main from "./src/Main";
import { ViewProvider, useView } from "./src/lib/ViewContext";
import { db, runMigrations } from "./src/db/db";
import { useUserStore } from "./src/stores/useUserStore";
import { useObjectiveStore } from "./src/stores/useObjectiveStore";
import { useHabitStore } from "./src/stores/useHabitStore";
import { UserRepository } from "./src/db/repositories";
import { useGoogleAuth } from "./src/hooks/useGoogleAuth";
import { theme } from "./src/lib/theme";

const BootScreen = ({
  onGoogleSignIn,
  onEmailRegister,
  onEmailLogin,
  bootMessage,
  showForm,
}: any) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email y contraseña son obligatorios.");
      return;
    }
    if (mode === "register" && !name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (mode === "register")
        await onEmailRegister(email.trim(), password, name.trim());
      else await onEmailLogin(email.trim(), password);
    } catch (e: any) {
      setError(e?.message ?? "Error inesperado.");
    } finally {
      setBusy(false);
    }
  };

  if (!showForm) {
    return (
      <View style={styles.boot}>
        <Text style={styles.bootTitle}>NeuroPlanner</Text>
        <Text style={styles.bootSub}>{bootMessage}</Text>
      </View>
    );
  }
  return (
    <KeyboardAvoidingView
      style={styles.boot}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.bootTitle}>NeuroPlanner</Text>
      <Text style={styles.bootSub}>{bootMessage}</Text>
      <View style={styles.form}>
        {mode === "register" && (
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={busy}
        >
          <Text style={styles.primaryBtnText}>
            {busy
              ? "Procesando…"
              : mode === "register"
                ? "Crear cuenta"
                : "Iniciar sesión"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          <Text style={styles.switchText}>
            {mode === "login"
              ? "¿No tienes cuenta? Regístrate"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>o</Text>
        <View style={styles.dividerLine} />
      </View>
      <TouchableOpacity style={styles.googleBtn} onPress={onGoogleSignIn}>
        <Text style={styles.googleBtnText}>Iniciar sesión con Google</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const AppContent = () => {
  const { currentView, changeView } = useView();
  const {
    user: googleUser,
    accessToken: googleToken,
    loading: googleLoading,
    signIn,
  } = useGoogleAuth();
  const [bootMessage, setBootMessage] = useState("Iniciando...");
  const [ready, setReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const loadUser = useUserStore((s) => s.loadUser);
  const createUser = useUserStore((s) => s.createUser);
  const registerWithEmail = useUserStore((s) => s.registerWithEmail);
  const loginWithEmail = useUserStore((s) => s.loginWithEmail);
  const storeError = useUserStore((s) => s.error);
  const loadObjectives = useObjectiveStore((s) => s.loadAll);
  const loadTemplates = useHabitStore((s) => s.loadTemplates);
  const loadDailyInstances = useHabitStore((s) => s.loadDailyInstances);

  const hydrateStores = async () => {
    setBootMessage("Cargando objetivos y hábitos...");
    await Promise.allSettled([
      loadObjectives(),
      loadTemplates().then(() => loadDailyInstances()),
    ]);
    setReady(true);
  };

  useEffect(() => {
    if (googleLoading) return;
    let c = false;
    (async () => {
      try {
        setBootMessage("Preparando base de datos...");
        await runMigrations();
        if (c) return;
        const userRepo = new UserRepository(db);
        if (googleUser) {
          setBootMessage("Buscando tu perfil...");
          const existing = await userRepo.findByGoogleId(googleUser.sub);
          if (existing) {
            setBootMessage("Cargando tu perfil...");
            await loadUser(existing.id);
          } else {
            setBootMessage("Creando tu perfil con Google...");
            await createUser({
              id: `google-${googleUser.sub}`,
              name: googleUser.name,
              chronotype: "moderate",
              routineFlexibility: 50,
              initialBattery: 100,
              recoveryRate: 5,
              googleId: googleUser.sub,
              picture: googleUser.picture,
            });
          }
          if (c) return;
          await hydrateStores();
        } else {
          setBootMessage("Buscando perfil...");
          const existingUsers = await db
            .selectFrom("entities")
            .selectAll()
            .where("type", "=", "User")
            .execute();
          if (existingUsers.length > 0) {
            setBootMessage("Cargando tu perfil...");
            await loadUser(existingUsers[0].id as string);
            if (c) return;
            await hydrateStores();
          } else {
            setBootMessage("Bienvenido a NeuroPlanner");
            setShowForm(true);
          }
        }
      } catch (err) {
        console.error("Boot failed:", err);
        if (!c) setBootMessage("Error al iniciar. Reinicia la app.");
      }
    })();
    return () => {
      c = true;
    };
  }, [googleLoading, googleUser]);

  if (!ready)
    return (
      <SafeAreaView style={styles.safeArea}>
        <BootScreen
          bootMessage={bootMessage}
          showForm={showForm}
          onGoogleSignIn={signIn}
          onEmailRegister={async (e: string, p: string, n: string) => {
            setBootMessage("Creando cuenta...");
            await registerWithEmail({ email: e, password: p, name: n });
            if (!storeError) await hydrateStores();
          }}
          onEmailLogin={async (e: string, p: string) => {
            setBootMessage("Iniciando sesión...");
            await loginWithEmail(e, p);
            if (!storeError) await hydrateStores();
          }}
        />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={styles.safeArea}>
      <Main accessToken={googleToken ?? undefined} />
      <NavBar onViewChange={changeView} initialView={currentView} />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ViewProvider defaultView={Vista.Tareas}>
        <AppContent />
      </ViewProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.black },
  boot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.black,
    gap: 16,
    paddingHorizontal: 32,
  },
  bootTitle: { fontSize: 28, fontWeight: "700", color: "#f0f0f0" },
  bootSub: { fontSize: 14, color: "#aaa", textAlign: "center" },
  form: { width: "100%", gap: 10, marginTop: 12 },
  input: {
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#f0f0f0",
  },
  errorText: { color: "#e74c3c", fontSize: 13, textAlign: "center" },
  primaryBtn: {
    backgroundColor: theme["bright-lavender"],
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: theme.black, fontSize: 15, fontWeight: "600" },
  switchText: {
    color: theme["bright-lavender"],
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 10,
    marginTop: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#333" },
  dividerText: { color: "#888", fontSize: 13 },
  googleBtn: {
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  googleBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
