import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ViewShot, { captureRef } from "react-native-view-shot";

import { COLORS } from "../../constants/colors";
import { speak } from "../../lib/tts";
import { safeBack } from "../../lib/nav";
import ConfettiBurst from "../../components/ConfettiBurst";
import DrawingCanvas, { DrawingCanvasRef } from "../../components/DrawingCanvas";
import { LETTERS } from "../../constants/letters";
import { predictFromUri } from "../../services/predictionService";
import { saveGardenHighScore } from "../../lib/progress";

const PLANTS = ["🌱", "🌸", "🌻", "🌳", "🦋"];
const PRAISES = ["Beautiful!", "Great drawing!", "Lovely!", "Nice work!", "Well done!"];
const TOTAL_CELLS = 9;
const STORAGE_KEY = "letterGardenHighScore";

type GridCell = { kind: "plant"; emoji: string } | { kind: "bomb" } | null;

/* Utility helpers */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pathLength(pts: { x: number; y: number }[]) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    d += Math.hypot(dx, dy);
  }
  return d;
}
function totalInk(strokes: { x: number; y: number }[][]) {
  return strokes.reduce((sum, s) => sum + pathLength(s), 0);
}

/* Press button with animation */
function PressBtn({ children, style, onPress }: any) {
  const scale = useMemo(() => new Animated.Value(1), []);
  const onIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPressIn={onIn} onPressOut={onOut} onPress={onPress} style={style}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function LetterGarden() {
  const canvasRef = useRef<DrawingCanvasRef>(null);
  const shotRef = useRef<ViewShot>(null);

  const [round, setRound] = useState(1);
  const [target, setTarget] = useState<string>("A");
  const [showGuide, setShowGuide] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [grid, setGrid] = useState<GridCell[]>(Array(TOTAL_CELLS).fill(null));
  const [showSummary, setShowSummary] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [busy, setBusy] = useState(false);

  /* Load Highscore */
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setHighScore(parseInt(stored, 10));
    })();
  }, []);

  /* Pick next target */
  const nextTarget = () => {
    const L = pick(LETTERS);
    const sym = Math.random() < 0.5 ? L.uc : L.lc;
    setTarget(sym);
    speak(`Draw ${sym === sym.toUpperCase() ? "capital" : "small"} ${sym}`);
  };

  useEffect(() => {
    nextTarget();
  }, [round]);

  const handleStrokeStart = () => setShowGuide(false);

  const handleClear = () => {
    canvasRef.current?.clear();
    setShowGuide(true);
  };

  const placeInGrid = (cell: GridCell) => {
    setGrid((prev) => {
      const next = [...prev];
      const idx = next.findIndex((c) => c === null);
      if (idx !== -1) next[idx] = cell;
      return next;
    });
  };

  const finishOrNext = async () => {
    const filled = grid.filter((c) => c !== null).length + 1;
    if (filled >= TOTAL_CELLS) {
      setTimeout(async () => {
        setShowSummary(true);
        speak("Garden complete!");
        const plantsNow = grid.filter((c) => c?.kind === "plant").length;
        if (plantsNow > highScore) {
          setHighScore(plantsNow);
          await AsyncStorage.setItem(STORAGE_KEY, String(plantsNow));
          await saveGardenHighScore("garden", plantsNow);
        }
      }, 400);
    } else {
      setTimeout(() => {
        canvasRef.current?.clear();
        setShowGuide(true);
        setRound((r) => r + 1);
      }, 380);
    }
  };

  const handleDone = async () => {
    try {
      if (busy) return;
      const strokes = canvasRef.current?.getStrokes() ?? [];
      const ink = totalInk(strokes);

      if (ink < 200) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        speak("Try again. Draw the whole letter.");
        placeInGrid({ kind: "bomb" });
        finishOrNext();
        return;
      }

      setBusy(true);
      const uri = await captureRef(shotRef, { format: "jpg", quality: 0.7, result: "tmpfile" });
      const data = await predictFromUri(uri);
      const pred = data?.top1?.label ?? "";

      if (pred?.toLowerCase() === target.toLowerCase()) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        speak(pick(PRAISES));
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 700);
        placeInGrid({ kind: "plant", emoji: pick(PLANTS) });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        speak("Wrong. Try again.");
        placeInGrid({ kind: "bomb" });
      }

      finishOrNext();
    } catch (err) {
      Alert.alert("Error", "Could not analyze the drawing");
    } finally {
      setBusy(false);
    }
  };

  const plantsCount = grid.filter((c) => c?.kind === "plant").length;
  const bombsCount = grid.filter((c) => c?.kind === "bomb").length;
  const filledCount = plantsCount + bombsCount;
  const progressPct = Math.max(6, Math.round((filledCount / TOTAL_CELLS) * 100));

  const resetGame = () => {
    setGrid(Array(TOTAL_CELLS).fill(null));
    setRound(1);
    setShowGuide(true);
    setShowSummary(false);
    canvasRef.current?.clear();
  };

  const guideOpacity = useMemo(() => new Animated.Value(1), []);
  useEffect(() => {
    Animated.timing(guideOpacity, {
      toValue: showGuide ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [showGuide]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: "Letter Garden" }} />
      {showConfetti && <ConfettiBurst />}

      {/* HUD */}
      <View style={styles.hudWrap}>
        <View style={styles.hudTopRow}>
          <Text style={styles.hudTitle}>
            Draw: <Text style={{ color: COLORS.teal }}>{target}</Text>
          </Text>
          <PressBtn onPress={() => speak(`Draw ${target}`)} style={styles.sayBtn}>
            <Text style={{ color: COLORS.navy, fontWeight: "900" }}>🔊 Repeat</Text>
          </PressBtn>
        </View>

        <View style={styles.badgesRow}>
          <View style={styles.badge}><Text style={styles.badgeTxt}>🌼 Score: {plantsCount}</Text></View>
          <View style={styles.badge}><Text style={styles.badgeTxt}>🏆 Highest: {highScore}</Text></View>
          <View style={styles.badge}><Text style={styles.badgeTxt}>💣 {bombsCount}</Text></View>
        </View>

        <View style={styles.progressWrap}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          <Text style={styles.progressTxt}>
            {Math.min(round, TOTAL_CELLS)} / {TOTAL_CELLS}
          </Text>
        </View>
      </View>

      {/* Stage */}
      <View style={styles.stage}>
        <ViewShot ref={shotRef} style={{ alignItems: "center", backgroundColor: "#fff" }}>
          <View style={styles.canvasBlock}>
            <Animated.View pointerEvents="none" style={[styles.ghostWrap, { opacity: guideOpacity }]}>
              <Text style={styles.ghostLetter}>{target}</Text>
            </Animated.View>

            <View style={styles.canvasWrap}>
              <DrawingCanvas
                ref={canvasRef}
                size={280}
                strokeWidth={10}
                strokeColor={COLORS.navy}
                onStrokeStart={handleStrokeStart}
              />
            </View>

            <View style={styles.controls}>
              <PressBtn onPress={handleClear} style={[styles.btn, styles.btnSecondary]}>
                <Text style={styles.btnTxtSecondary}>🧽 Clear</Text>
              </PressBtn>
              <PressBtn onPress={handleDone} style={[styles.btn, styles.btnPrimary]}>
                <Text style={styles.btnTxtPrimary}>{busy ? "⏳ Checking..." : "✅ I’m Done"}</Text>
              </PressBtn>
            </View>
          </View>
        </ViewShot>

        {/* Grid */}
        <View style={styles.gridWrap}>
          {Array.from({ length: TOTAL_CELLS }).map((_, i) => {
            const cell = grid[i];
            const style =
              cell?.kind === "plant"
                ? styles.gridCellPlant
                : cell?.kind === "bomb"
                ? styles.gridCellBomb
                : styles.gridCellEmpty;
            return (
              <View key={i} style={[styles.gridCell, style]}>
                {cell ? (
                  <Text style={styles.cellEmoji}>
                    {cell.kind === "plant" ? cell.emoji : "💣"}
                  </Text>
                ) : (
                  <Text style={styles.cellIndex}>{i + 1}</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* ✅ Summary Modal */}
      <Modal transparent visible={showSummary} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🌼 Garden Complete!</Text>
            <Text style={styles.modalScore}>Flowers: {plantsCount} / {TOTAL_CELLS}</Text>
            <Text style={styles.modalScore}>Bombs: {bombsCount}</Text>
            <Text style={styles.modalScore}>🏆 Highest: {highScore}</Text>

            <View style={styles.modalBtns}>
              <PressBtn onPress={resetGame} style={[styles.modalBtn, styles.playAgainBtn]}>
                <Text style={styles.playAgainTxt}>🔁 Play Again</Text>
              </PressBtn>
              <PressBtn onPress={safeBack} style={[styles.modalBtn, styles.doneBtn]}>
                <Text style={styles.doneTxt}>✅ Done</Text>
              </PressBtn>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  hudWrap: { paddingHorizontal: 16, paddingTop: 10 },
  hudTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hudTitle: { fontSize: 24, fontWeight: "900", color: COLORS.navy },
  sayBtn: {
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0C200",
  },
  badgesRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
  },
  badgeTxt: { color: COLORS.navy, fontWeight: "900" },
  progressWrap: {
    height: 26,
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    overflow: "hidden",
  },
  progressFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.teal,
  },
  progressTxt: { textAlign: "center", fontWeight: "900", color: COLORS.navy },
  stage: {
    flex: 1,
    margin: 16,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    paddingTop: 16,
  },
  canvasBlock: { alignItems: "center" },
  canvasWrap: {
    borderWidth: 2,
    borderColor: COLORS.teal,
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 6,
    overflow: "hidden",
  },
  ghostWrap: {
    position: "absolute",
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostLetter: { fontSize: 160, color: "rgba(12,45,87,0.12)", fontWeight: "900" },
  controls: { flexDirection: "row", gap: 12, marginTop: 12 },
  btn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, borderWidth: 2 },
  btnPrimary: { backgroundColor: COLORS.navy, borderColor: COLORS.teal },
  btnSecondary: { backgroundColor: "#fff", borderColor: COLORS.teal },
  btnTxtPrimary: { color: "#fff", fontWeight: "900" },
  btnTxtSecondary: { color: COLORS.navy, fontWeight: "900" },
  gridWrap: {
    width: "80%",
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
  },
  gridCell: {
    width: "28%",
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCellEmpty: { borderColor: COLORS.border, backgroundColor: "#fff", borderStyle: "dashed" },
  gridCellPlant: { borderColor: "#33a36b", backgroundColor: "#e6f7ee" },
  gridCellBomb: { borderColor: "#d14b4b", backgroundColor: "#fdeaea" },
  cellEmoji: { fontSize: 34 },
  cellIndex: { color: "#94a3b8", fontWeight: "700" },

  /* ✅ Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.teal,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  modalTitle: { fontSize: 26, fontWeight: "900", color: COLORS.navy, marginBottom: 10 },
  modalScore: { fontSize: 18, fontWeight: "700", color: COLORS.navy, marginBottom: 6 },
  modalBtns: { flexDirection: "row", gap: 14, marginTop: 24, width: "100%" },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  playAgainBtn: { backgroundColor: COLORS.navy },
  doneBtn: { backgroundColor: COLORS.yellow },
  playAgainTxt: { color: "#fff", fontWeight: "900", fontSize: 16 },
  doneTxt: { color: COLORS.navy, fontWeight: "900", fontSize: 16 },
});
