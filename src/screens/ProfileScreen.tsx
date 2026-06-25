/**
 * ProfileScreen
 *
 * Dedicated screen for viewing and editing the user's data after
 * signing in with Google.  Reads from useUserStore + useGoogleAuth,
 * writes changes through the UserRepository.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useUserStore } from "../stores/useUserStore";
import { useObjectiveStore } from "../stores/useObjectiveStore";
import { useHabitStore } from "../stores/useHabitStore";
import { useReflectionStore } from "../stores/useReflectionStore";
import { useSkillStore } from "../stores/useSkillStore";
import { UserRepository } from "../db/repositories";
import { db } from "../db/db";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { theme } from "../lib/theme";

// ---------------------------------------------------------------------------
// Types for the screen's local UI state
// ---------------------------------------------------------------------------

type Chronotype = "morning" | "evening" | "moderate";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.card}>{children}</View>
);

const Row = ({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value ?? "—"}</Text>
  </View>
);

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export const ProfileScreen: React.FC = () => {
  // ---- Stores ----
  const userId = useUserStore((s) => s.userId);
  const userName = useUserStore((s) => s.userName);
  const chronotype = useUserStore((s) => s.chronotype);
  const routineFlexibility = useUserStore((s) => s.routineFlexibility);
  const socialBattery = useUserStore((s) => s.socialBattery);
  const supportContacts = useUserStore((s) => s.supportContacts);
  const profileData = useUserStore((s) => s.profileData);
  const todayMetrics = useUserStore((s) => s.todayMetrics);
  const loadUser = useUserStore((s) => s.loadUser);
  const adjustBattery = useUserStore((s) => s.adjustBattery);

  // Deduce Google info from profileData (stored at creation time)
  const googleId = (profileData as Record<string, unknown> | null)?.googleId as
    | string
    | undefined;
  const googlePicture = (profileData as Record<string, unknown> | null)
    ?.picture as string | undefined;

  // ---- Local editing state ----
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(userName);
  const [chronoDraft, setChronoDraft] = useState<Chronotype>(chronotype);
  const [flexDraft, setFlexDraft] = useState(String(routineFlexibility));
  const [saving, setSaving] = useState(false);

  // ---- Change password ----
  const changePassword = useUserStore((s) => s.changePassword);
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");

  const handleChangePassword = async () => {
    if (!oldPwd || !newPwd) {
      setPwdMsg("Ambos campos son obligatorios.");
      return;
    }
    if (newPwd.length < 4) {
      setPwdMsg("Mínimo 4 caracteres.");
      return;
    }
    setPwdBusy(true);
    setPwdMsg("");
    try {
      await changePassword(oldPwd, newPwd);
      setPwdMsg("✅ Contraseña cambiada.");
      setOldPwd("");
      setNewPwd("");
      setShowPwdForm(false);
    } catch (e: any) {
      setPwdMsg(e?.message ?? "Error.");
    } finally {
      setPwdBusy(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSaving(true);

    try {
      const repo = new UserRepository(db);
      const flex = Math.max(0, Math.min(100, Number(flexDraft) || 50));

      await repo.patch(userId, {
        name: nameDraft,
        chronotype: chronoDraft,
        routineFlexibility: flex,
      });

      // Reload to sync the store
      await loadUser(userId);
    } catch (err) {
      Alert.alert("Error", "No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
      setEditingName(false);
    }
  };

  // ---- Sign out ----
  const handleSignOut = () => {
    Alert.alert(
      "Cerrar sesión",
      "¿Quieres cerrar sesión de Google? Tus datos locales se conservarán.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: async () => {
            await signOut();
            Alert.alert(
              "Sesión cerrada",
              "Reinicia la app para continuar sin Google.",
            );
          },
        },
      ],
    );
  };

  // ---- Delete account ----
  const handleDeleteAccount = () => {
    Alert.alert(
      "Eliminar cuenta",
      "¿Estás seguro? Se eliminarán TODOS tus datos locales y se revocará el acceso a Google. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar todo",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Revocar el token en Google
              if (accessToken) {
                await fetch("https://oauth2.googleapis.com/revoke", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: `token=${accessToken}`,
                });
              }

              // 2. Borrar TODAS las tablas locales
              const tables = [
                "entities",
                "time_series",
                "images",
                "objectives",
                "objective_links",
                "habit_templates",
                "habit_instances",
                "rewards",
                "reward_redemptions",
                "social_battery",
                "calendar_items",
                "skills",
                "drills",
                "drill_sessions",
                "reflections",
                "support_contacts",
                "health_metrics_daily",
              ];
              for (const table of tables) {
                await db.deleteFrom(table as any).execute();
              }

              // 3. Sign out from Google native SDK
              await signOut();

              // 4. Reset all Zustand stores
              resetUser();
              resetObjectives();
              resetHabits();
              resetReflections();
              resetSkills();

              Alert.alert(
                "Cuenta eliminada",
                "Todos tus datos han sido borrados. Reinicia la app.",
              );
            } catch (err) {
              console.error("Delete account failed:", err);
              Alert.alert("Error", "No se pudo eliminar la cuenta.");
            }
          },
        },
      ],
    );
  };

  // ---- Google Auth (for sign out + revoke) ----
  const { signOut, accessToken } = useGoogleAuth();

  // ---- Reset all stores ----
  const resetUser = useUserStore((s) => s.reset);
  const resetObjectives = useObjectiveStore((s) => s.reset);
  const resetHabits = useHabitStore((s) => s.reset);
  const resetReflections = useReflectionStore((s) => s.reset);
  const resetSkills = useSkillStore((s) => s.reset);

  // ---- Battery quick actions ----
  const handleBatteryBoost = () => adjustBattery(10);
  const handleBatteryDrain = () => adjustBattery(-10);

  // ==================================================================
  // Render
  // ==================================================================

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Google Profile ───────────────────────────── */}
      <SectionHeader title="Cuenta de Google" />
      <Card>
        {googlePicture ? (
          <Image source={{ uri: googlePicture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Row label="Nombre" value={userName} />
        <Row
          label="Email"
          value={
            ((profileData as Record<string, unknown> | null)
              ?.email as string) ?? "—"
          }
        />
        <Row
          label="Google ID"
          value={googleId ? googleId.slice(0, 12) + "…" : "No vinculado"}
        />
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Cerrar sesión de Google</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.deleteText}>Eliminar cuenta</Text>
        </TouchableOpacity>
      </Card>

      {/* ── Preferences ──────────────────────────────── */}
      <SectionHeader title="Preferencias" />
      <Card>
        {/* Name */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Nombre</Text>
          {editingName ? (
            <TextInput
              style={styles.input}
              value={nameDraft}
              onChangeText={setNameDraft}
              autoFocus
            />
          ) : (
            <TouchableOpacity onPress={() => setEditingName(true)}>
              <Text style={styles.rowValue}>{userName}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Chronotype */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Cronotipo</Text>
          <View style={styles.chipRow}>
            {(["morning", "moderate", "evening"] as Chronotype[]).map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, chronoDraft === c && styles.chipActive]}
                onPress={() => setChronoDraft(c)}
              >
                <Text
                  style={[
                    styles.chipText,
                    chronoDraft === c && styles.chipTextActive,
                  ]}
                >
                  {c === "morning"
                    ? "🌅 Mañana"
                    : c === "evening"
                      ? "🌙 Noche"
                      : "☀️ Moderado"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Routine Flexibility */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Flexibilidad de rutina</Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderValue}>{flexDraft}%</Text>
            <TextInput
              style={styles.inputSmall}
              value={flexDraft}
              onChangeText={setFlexDraft}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSaveProfile}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Text>
        </TouchableOpacity>
      </Card>

      {/* ── Change Password ──────────────────────────── */}
      <SectionHeader title="Seguridad" />
      <Card>
        {!showPwdForm ? (
          <TouchableOpacity
            onPress={() => {
              setShowPwdForm(true);
              setPwdMsg("");
            }}
          >
            <Text style={styles.linkText}>Cambiar contraseña</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 8 }}>
            <TextInput
              style={styles.inputFull}
              placeholder="Contraseña actual"
              placeholderTextColor="#999"
              value={oldPwd}
              onChangeText={setOldPwd}
              secureTextEntry
            />
            <TextInput
              style={styles.inputFull}
              placeholder="Nueva contraseña"
              placeholderTextColor="#999"
              value={newPwd}
              onChangeText={setNewPwd}
              secureTextEntry
            />
            {pwdMsg ? (
              <Text
                style={{
                  color: pwdMsg.startsWith("✅") ? "#27ae60" : "#e74c3c",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                {pwdMsg}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                style={[styles.pwdBtn, pwdBusy && { opacity: 0.6 }]}
                onPress={handleChangePassword}
                disabled={pwdBusy}
              >
                <Text style={styles.pwdBtnText}>
                  {pwdBusy ? "…" : "Guardar"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pwdCancelBtn}
                onPress={() => {
                  setShowPwdForm(false);
                  setPwdMsg("");
                }}
              >
                <Text style={styles.pwdCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Card>

      {/* ── Social Battery ───────────────────────────── */}
      <SectionHeader title="Batería Social" />
      <Card>
        <Row
          label="Nivel actual"
          value={socialBattery ? `${socialBattery.currentLevel} / 100` : "—"}
        />
        <Row
          label="Tasa de recuperación"
          value={
            socialBattery?.recoveryRate != null
              ? `${socialBattery.recoveryRate} pts/día`
              : "—"
          }
        />
        <Row
          label="Última actualización"
          value={
            socialBattery
              ? new Date(socialBattery.lastUpdated).toLocaleString()
              : "—"
          }
        />
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleBatteryDrain}
          >
            <Text style={styles.actionBtnText}>−10 Drenar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleBatteryBoost}
          >
            <Text style={styles.actionBtnText}>+10 Recargar</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* ── Today's Metrics ──────────────────────────── */}
      <SectionHeader title="Métricas de Hoy" />
      <Card>
        <Row label="Estrés" value={todayMetrics?.stress} />
        <Row label="Ansiedad" value={todayMetrics?.anxiety} />
        <Row label="Ansiedad social" value={todayMetrics?.social_anxiety} />
        <Row
          label="Recuperación"
          value={
            todayMetrics?.recovery_pct != null
              ? `${todayMetrics.recovery_pct}%`
              : null
          }
        />
        <Row
          label="Iniciativa social"
          value={todayMetrics?.social_initiative}
        />
      </Card>

      {/* ── Support Contacts ─────────────────────────── */}
      <SectionHeader title="Contactos de Apoyo" />
      <Card>
        {supportContacts.length === 0 ? (
          <Text style={styles.emptyText}>
            No hay contactos de apoyo registrados.
          </Text>
        ) : (
          supportContacts.map((c) => (
            <View key={c.id} style={styles.contactRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactDetail}>{c.relation}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.contactDetail}>{c.phone}</Text>
                <Text style={styles.contactDetail}>{c.email}</Text>
              </View>
            </View>
          ))
        )}
      </Card>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

// ======================================================================
// Styles
// ======================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.black,
  },
  content: {
    padding: 16,
    gap: 8,
  },

  // Sections
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: theme["bright-lavender"],
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 6,
    paddingHorizontal: 4,
  },

  // Cards
  card: {
    backgroundColor: "#2a2a2a",
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Rows
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 32,
  },
  rowLabel: {
    fontSize: 14,
    color: "#aaa",
    flex: 1,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#f0f0f0",
    textAlign: "right",
    flex: 1,
  },

  // Avatar
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: "center",
    marginBottom: 4,
  },
  avatarPlaceholder: {
    backgroundColor: "#4285F4",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
  },

  // Inputs
  input: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a2e",
    textAlign: "right",
    borderBottomWidth: 1,
    borderBottomColor: "#4285F4",
    paddingVertical: 2,
    minWidth: 120,
  },
  inputFull: {
    backgroundColor: "#f5f5f7",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1a1a2e",
  },

  // Link
  linkText: {
    color: "#4285F4",
    fontSize: 14,
    fontWeight: "500",
  },

  // Password buttons
  pwdBtn: {
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: "center",
    flex: 1,
  },
  pwdBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  pwdCancelBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    flex: 1,
  },
  pwdCancelText: { color: "#666", fontSize: 14 },
  inputSmall: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a2e",
    borderBottomWidth: 1,
    borderBottomColor: "#4285F4",
    paddingVertical: 2,
    width: 60,
    textAlign: "center",
  },

  // Chips
  chipRow: {
    flexDirection: "row",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#eee",
  },
  chipActive: {
    backgroundColor: "#4285F4",
  },
  chipText: {
    fontSize: 12,
    color: "#555",
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },

  // Slider
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sliderValue: {
    fontSize: 14,
    color: "#1a1a2e",
    fontWeight: "500",
  },

  // Buttons
  saveBtn: {
    backgroundColor: "#4285F4",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  signOutBtn: {
    alignSelf: "center",
    marginTop: 4,
  },
  signOutText: {
    color: "#e74c3c",
    fontSize: 13,
    fontWeight: "500",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ddd",
    marginVertical: 8,
  },
  deleteBtn: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e74c3c",
  },
  deleteText: {
    color: "#e74c3c",
    fontSize: 13,
    fontWeight: "600",
  },
  actionBtn: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 4,
  },

  // Contacts
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  contactName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  contactDetail: {
    fontSize: 12,
    color: "#888",
  },

  // Empty
  emptyText: {
    fontSize: 13,
    color: "#aaa",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
});
