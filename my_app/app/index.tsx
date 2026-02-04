// app/index.tsx
import { Link } from "expo-router";
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ViewShot, { captureRef } from "react-native-view-shot";
import { BlurView } from "expo-blur";

import DrawingCanvas, { DrawingCanvasRef } from "../components/DrawingCanvas";
import { predictFromUri } from "../services/predictionService";
import { speakLetter } from "../lib/tts";
import { COLORS } from "../constants/colors";

/* ---------- Small UI helpers ---------- */
function Tile({
  title,
  subtitle,
  href,
  emoji,
}: {
  title: string;
  subtitle: string;
  href: any;
  emoji: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        style={{
          flexBasis: "48%",
          flexGrow: 1,
          padding: 16,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.card,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
          minHeight: 120,
          justifyContent: "center",
          marginHorizontal: 6,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "900", color: COLORS.navy }}>
          {emoji} {title}
        </Text>
        <Text style={{ color: COLORS.text, marginTop: 4 }}>{subtitle}</Text>
      </Pressable>
    </Link>
  );
}

function ActionButton({
  title,
  emoji,
  onPress,
  disabled,
  tone = "yellow",
}: {
  title: string;
  emoji: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "blue" | "green" | "gray" | "yellow";
}) {
  const map = {
    blue: "#3b82f6",
    green: "#22c55e",
    gray: "#94a3b8",
    yellow: COLORS.yellow,
  } as const;
  const bg = map[tone] ?? map.yellow;
  const bgDisabled = "#cbd5e1";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: disabled ? bgDisabled : bg,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "900", color: "#0C2D57" }}>
        {emoji} {title}
      </Text>
    </Pressable>
  );
}

/* ==================== MAIN ==================== */
export default function Home() {
  const level = 1;
  const points = 80;
  const target = 200;
  const streak = 2;
  const progressPct = Math.min(100, Math.round((points / target) * 100));

  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pred, setPred] = useState<{ label: string; prob: number } | null>(null);
  const shotRef = useRef<ViewShot>(null);
  const canvasRef = useRef<DrawingCanvasRef>(null);
  const [showResult, setShowResult] = useState(false);

  const [showSheet, setShowSheet] = useState(false);
  const W = Dimensions.get("window").width;
  const H = Dimensions.get("window").height;
  const SHEET_HEIGHT = Math.round(H * 0.6);
  const CANVAS_HEIGHT = Math.max(240, Math.min(320, Math.round(SHEET_HEIGHT * 0.45)));

  const onPredict = async () => {
    try {
      const hasDrawing = canvasRef.current?.hasDrawing?.();
      if (!hasDrawing) {
        Alert.alert("✍️ Please write something first!", "Try drawing a letter before predicting.");
        return;
      }

      setBusy(true);
      const uri = await captureRef(shotRef, {
        format: "jpg",
        quality: 0.7,
        result: "tmpfile",
      });
      setPreview(uri);

      const data = await predictFromUri(uri);
      setPred(data.top1);
      speakLetter(data.top1.label);

      setShowResult(true);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not predict");
    } finally {
      setBusy(false);
    }
  };

  const onClear = () => {
    canvasRef.current?.clear();
    setPred(null);
    setPreview(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28, flexGrow: 1 }}
      >
        {/* HERO */}
        <View
          style={{
            padding: 18,
            borderRadius: 20,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text style={{ fontSize: 26, fontWeight: "900", color: COLORS.navy }}>
            🌟 Welcome back!
          </Text>
          <Text style={{ color: COLORS.text, marginTop: 4 }}>
            ⭐ Level {level}   ·   🔥 Streak {streak}
          </Text>

          <View
            style={{
              height: 14,
              backgroundColor: "#D7EFEA",
              borderRadius: 999,
              overflow: "hidden",
              marginTop: 12,
            }}
          >
            <View
              style={{
                width: `${progressPct}%`,
                height: "100%",
                backgroundColor: COLORS.yellow,
              }}
            />
          </View>
          <Text style={{ marginTop: 6, color: COLORS.text }}>
            Progress: {points}/{target}
          </Text>

          <Link href="/reports" asChild>
            <Pressable
              style={{
                marginTop: 10,
                alignSelf: "flex-start",
                paddingVertical: 10,
                paddingHorizontal: 14,
                backgroundColor: COLORS.yellow,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.navy,
              }}
            >
              <Text style={{ fontWeight: "900", color: COLORS.navy }}>
                📈 View full report
              </Text>
            </Pressable>
          </Link>
        </View>

        {/* NAV TILES */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Tile title="Training" subtitle="Learn letters with AI" href="/training" emoji="🧑‍🏫" />
          </View>

          <View style={{ flex: 1, marginLeft: 6 }}>
            <Tile title="Games" subtitle="Play & test your skills" href="/games" emoji="🎮" />
          </View>
        </View>

        {/* Reports tile */}
        <View style={{ marginTop: 12 }}>
          <Tile title="Reports" subtitle="Parent/Teacher summary" href="/reports" emoji="📈" />
        </View>

        {/* Tap to practice */}
        <Pressable
          onPress={() => setShowSheet(true)}
          style={{
            padding: 28,
            borderRadius: 24,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: "#FFF3C4",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ fontSize: 36 }}>✍️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "900",
                color: COLORS.navy,
                marginBottom: 4,
              }}
            >
              Tap to practice
            </Text>
            <Text style={{ color: COLORS.text, fontSize: 16 }}>
              Open the half-screen pad and try writing a letter now!
            </Text>
          </View>
          <Text style={{ fontSize: 28, color: COLORS.teal }}>›</Text>
        </Pressable>

        {/* Result card */}
        {pred && (
          <View
            style={{
              padding: 16,
              borderRadius: 16,
              backgroundColor: COLORS.card,
              borderWidth: 1,
              borderColor: COLORS.border,
              alignItems: "center",
              gap: 8,
            }}
          >
            <Text style={{ color: COLORS.text }}>I think this is</Text>
            <Text style={{ fontSize: 64, fontWeight: "900", color: COLORS.navy }}>
              {pred.label}
            </Text>
            <Text style={{ color: COLORS.text }}>
              Confidence: {(pred.prob * 100).toFixed(0)}%
            </Text>

            {preview && (
              <View style={{ marginTop: 8, alignItems: "center" }}>
                <Text style={{ color: COLORS.text, marginBottom: 6 }}>Your drawing</Text>
                <Image
                  source={{ uri: preview }}
                  style={{
                    width: 160,
                    height: 160,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                />
              </View>
            )}
          </View>
        )}

        {/* Footer tip */}
        <View
          style={{
            padding: 14,
            borderRadius: 16,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text style={{ textAlign: "center", color: COLORS.text }}>
            Tip: Keep strokes big and slow. ⭐ for correct answers!
          </Text>
        </View>
      </ScrollView>

      {/* Practice Sheet Modal */}
      <Modal
        visible={showSheet}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSheet(false)}
      >
        <BlurView intensity={50} tint="light" style={{ flex: 1, justifyContent: "flex-end" }}>
          <View
            style={{
              height: SHEET_HEIGHT,
              backgroundColor: COLORS.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 16,
            }}
          >
            {/* sheet header */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "900",
                  color: COLORS.navy,
                  flex: 1,
                }}
              >
                ✍️ Practice
              </Text>
              <Pressable
                onPress={() => setShowSheet(false)}
                hitSlop={10}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "#f1f5f9",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "900", color: COLORS.navy }}>✕</Text>
              </Pressable>
            </View>

            {/* canvas */}
            <ViewShot ref={shotRef} style={{ alignItems: "center" }}>
              <View
                style={{
                  width: W - 32,
                  height: CANVAS_HEIGHT,
                  borderRadius: 16,
                  backgroundColor: COLORS.card,
                  borderWidth: 3,
                  borderColor: COLORS.teal,
                  overflow: "hidden",
                }}
              >
                <DrawingCanvas ref={canvasRef} />
              </View>
            </ViewShot>

            {/* buttons */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
              <ActionButton
                title={busy ? "Predicting…" : "Predict"}
                emoji="🔍"
                onPress={onPredict}
                disabled={busy}
                tone="yellow"
              />
              <ActionButton title="Clear" emoji="🧼" onPress={onClear} tone="gray" />
              <ActionButton
                title="Hear"
                emoji="🔊"
                onPress={() => pred && speakLetter(pred.label)}
                disabled={!pred}
                tone="green"
              />
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* 🟢 Result Popup Modal */}
      <Modal
        visible={showResult}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResult(false)}
      >
        <BlurView
          intensity={60}
          tint="light"
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <View
            style={{
              width: "70%",
              backgroundColor: COLORS.card,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: COLORS.border,
              paddingVertical: 50,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {pred && (
              <>
                <Text
                  style={{
                    fontSize: 22,
                    color: COLORS.text,
                    marginBottom: 8,
                  }}
                >
                  {pred.label === pred.label.toLowerCase()
                    ? `Small ${pred.label}`
                    : `Capital ${pred.label}`}
                </Text>

                <Text
                  style={{
                    fontSize: 140,
                    fontWeight: "900",
                    color: COLORS.navy,
                    marginTop: 4,
                  }}
                >
                  {pred.label}
                </Text>
              </>
            )}

            <Pressable
              onPress={() => {
                setShowResult(false);
                onClear();
              }}
              style={{
                marginTop: 24,
                backgroundColor: COLORS.yellow,
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 30,
                borderWidth: 1,
                borderColor: COLORS.navy,
              }}
            >
              <Text style={{ fontWeight: "900", color: COLORS.navy }}>OK</Text>
            </Pressable>
          </View>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}
