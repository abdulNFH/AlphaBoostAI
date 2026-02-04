// app/games/catch-letter.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Dimensions,
  Animated,
  Easing,
  StyleSheet,
  Modal,
  Pressable,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { COLORS } from "../../constants/colors";
import { speak } from "../../lib/tts";
import ConfettiBurst from "../../components/ConfettiBurst";
import { safeBack } from "../../lib/nav";

const { width: W } = Dimensions.get("window");

const PRAISES = ["Great!", "Awesome!", "Super!", "Well done!", "Nice!"];
const ITEM_SIZE = 64;

const TARGET_GOAL_PER_ROUND = [6, 8, 10, 12];
const FALL_MS = [7000, 6000, 5000, 4000];
const SPAWN_MS = [1200, 1000, 850, 700];

const SUCCESS_COLOR = "#22c55e";
const ERROR_COLOR = "#ef4444";
const SHAKE_AMPL = 7;
const HIT_RADIUS = 44;

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const CONFUSION_SETS = [
  ["b", "d"],
  ["p", "q"],
  ["m", "n"],
  ["u", "v"],
  ["i", "l"],
  ["c", "e"],
  ["g", "q"],
  ["t", "f"],
];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const uc = (s: string) => s.toUpperCase();
const lc = (s: string) => s.toLowerCase();

type Drop = {
  id: string;
  letter: string;
  x0: number;
  xVal: Animated.Value;   // <-- keep translateX base value off-render
  anim: Animated.Value;
  fade: Animated.Value;
  scale: Animated.Value;
  shake: Animated.Value;
  alive: boolean;
  color: string;
  startedAt: number;
};

type Task = {
  round: number;
  instruction: string;
  targets: string[];
  spawnLetters: () => string;
};

export default function CatchLetter() {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [caughtThisRound, setCaughtThisRound] = useState(0);
  const [task, setTask] = useState<Task | null>(null);
  const [hearts, setHearts] = useState(10);

  const [showConfetti, setShowConfetti] = useState(false);
  const [fieldH, setFieldH] = useState(500);
  const [lastMissLetter, setLastMissLetter] = useState<string | null>(null);
  const [showMissBanner, setShowMissBanner] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const dropsRef = useRef<Drop[]>([]);
  const [, force] = useState(0);
  const spawnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("catchHigh");
      if (saved) setHighScore(parseInt(saved, 10));
    })();
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      AsyncStorage.setItem("catchHigh", score.toString());
    }
  }, [score, highScore]);

  function buildTaskForRound(r: number): Task {
    if (r === 1) {
      const base = pick(LETTERS);
      const given = Math.random() < 0.5 ? uc(base) : lc(base);
      return {
        round: r,
        instruction: `Tap all ${given}s!`,
        targets: [given],
        spawnLetters: () => (Math.random() < 0.35 ? given : pick(LETTERS)),
      };
    }
    if (r === 2) {
      const base = pick(LETTERS);
      const shown = uc(base);
      return {
        round: r,
        instruction: `Shown ${shown} — tap small ${lc(base)}s!`,
        targets: [lc(base)],
        spawnLetters: () => (Math.random() < 0.35 ? lc(base) : pick(LETTERS)),
      };
    }
    if (r === 3) {
      const pair = pick(CONFUSION_SETS);
      const target = pick(pair);
      return {
        round: r,
        instruction: `Tap ${uc(target)}!`,
        targets: [target],
        spawnLetters: () =>
          Math.random() < 0.4 ? target : pick(pair.concat(LETTERS)),
      };
    }
    const base = pick(LETTERS);
    return {
      round: r,
      instruction: `Tap ${uc(base)} (any case)!`,
      targets: [lc(base), uc(base)],
      spawnLetters: () =>
        Math.random() < 0.45
          ? Math.random() < 0.5
            ? lc(base)
            : uc(base)
          : pick(LETTERS),
    };
  }

  useEffect(() => {
    if (gameOver) return;

    setCaughtThisRound(0);
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);

    const t = buildTaskForRound(round);
    setTask(t);
    speak(t.instruction);

    spawnOne(t);
    spawnTimerRef.current = setInterval(() => {
      spawnOne(t);
    }, SPAWN_MS[round - 1]);

    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    };
  }, [round, gameOver]);

  useEffect(() => {
    if (!task || gameOver) return;
    if (caughtThisRound >= TARGET_GOAL_PER_ROUND[round - 1]) {
      setTimeout(() => {
        if (round >= 4) {
          endGame();
        } else {
          setRound((r) => r + 1);
        }
      }, 600);
    }
  }, [caughtThisRound, round, task, gameOver]);

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    };
  }, []);

  function endGame() {
    if (spawnTimerRef.current) {
      clearInterval(spawnTimerRef.current);
      spawnTimerRef.current = null;
    }
    setGameOver(true);
    speak(`Game over! You scored ${score}`);
  }

  function resetGame() {
    dropsRef.current = [];
    setScore(0);
    setHearts(10);
    setRound(1);
    setCaughtThisRound(0);
    setTask(null);
    setShowConfetti(false);
    setLastMissLetter(null);
    setShowMissBanner(false);
    setGameOver(false);
  }

  function isTargetLetter(t: Task, letter: string) {
    return t.targets.includes(letter);
  }

  // ONLY penalize if a MISSED letter was a TARGET
  function spawnOne(t: Task) {
    if (unmountedRef.current || gameOver) return;
    const L = t.spawnLetters();
    const id = `${L}-${Math.random().toString(36).slice(2, 8)}`;
    const anim = new Animated.Value(0);
    const fade = new Animated.Value(1);
    const scale = new Animated.Value(1);
    const shake = new Animated.Value(0);
    const x0 = 16 + Math.random() * (W - 16 - ITEM_SIZE);
    const xVal = new Animated.Value(x0); // <-- created once per drop

    const d: Drop = {
      id,
      letter: L,
      x0,
      xVal,
      anim,
      fade,
      scale,
      shake,
      alive: true,
      color: COLORS.navy,
      startedAt: Date.now(),
    };
    dropsRef.current.push(d);
    force((n) => n + 1);

    Animated.timing(anim, {
      toValue: 1,
      duration: FALL_MS[round - 1],
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;

      if (d.alive && !gameOver) {
        d.alive = false;

        const wasTarget = isTargetLetter(t, d.letter);

        if (wasTarget) {
          // Missed a target → banner, voice, lose half-heart
          d.color = ERROR_COLOR;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setLastMissLetter(d.letter);
          setShowMissBanner(true);
          speak(`Missed ${d.letter.toUpperCase()}`);
          Animated.sequence([
            Animated.spring(d.scale, { toValue: 1.08, useNativeDriver: true }),
            Animated.timing(d.fade, { toValue: 0, duration: 420, useNativeDriver: true }),
          ]).start(() => {
            dropsRef.current = dropsRef.current.filter((x) => x.id !== d.id);
            force((n) => n + 1);
          });
          setHearts((h) => {
            const nh = h - 1;
            if (nh <= 0) {
              endGame();
              return 0;
            }
            return nh;
          });
          setTimeout(() => setShowMissBanner(false), 700);
        } else {
          // Non-target fell → no penalty, quiet fade
          Animated.timing(d.fade, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
            dropsRef.current = dropsRef.current.filter((x) => x.id !== d.id);
            force((n) => n + 1);
          });
        }
      }
    });
  }

  function handleTouch(x: number, y: number) {
    if (!task || gameOver) return;
    const now = Date.now();
    let best: { d: Drop; dist: number; prog: number } | null = null;

    for (const d of dropsRef.current) {
      if (!d.alive) continue;
      const elapsed = now - d.startedAt;
      const dur = FALL_MS[round - 1];
      const p = Math.max(0, Math.min(1, elapsed / dur));
      const yTop = (fieldH - (ITEM_SIZE + 22)) * p;
      const cx = d.x0 + ITEM_SIZE / 2;
      const cy = yTop + (ITEM_SIZE + 22) - ITEM_SIZE / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist <= HIT_RADIUS) {
        if (!best || dist < best.dist || (Math.abs(dist - best.dist) < 1 && p > best.prog)) {
          best = { d, dist, prog: p };
        }
      }
    }

    if (best) handleTap(best.d);
  }

  function handleTap(d: Drop) {
    if (!task || !d.alive || gameOver) return;
    d.alive = false;

    if (isTargetLetter(task, d.letter)) {
      d.color = SUCCESS_COLOR;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore((s) => s + 1);
      setCaughtThisRound((c) => c + 1);
      speak(pick(PRAISES));
      setShowConfetti(true);
      Animated.sequence([
        Animated.spring(d.scale, { toValue: 1.22, useNativeDriver: true }),
        Animated.timing(d.fade, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        setShowConfetti(false);
        dropsRef.current = dropsRef.current.filter((x) => x.id !== d.id);
        force((n) => n + 1);
      });
    } else {
      d.color = ERROR_COLOR;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      speak("Oops!");
      Animated.sequence([
        Animated.timing(d.shake, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(d.shake, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(d.shake, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(d.shake, { toValue: 0, duration: 60, useNativeDriver: true }),
        Animated.spring(d.scale, { toValue: 1.08, useNativeDriver: true }),
        Animated.timing(d.fade, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        setHearts((h) => {
          const nh = h - 1;
          if (nh <= 0) {
            endGame();
            return 0;
          }
          return nh;
        });
        dropsRef.current = dropsRef.current.filter((x) => x.id !== d.id);
        force((n) => n + 1);
      });
    }
    force((n) => n + 1);
  }

  function renderHearts() {
    const full = Math.floor(hearts / 2);
       const half = hearts % 2;
    const empties = 5 - full - (half ? 1 : 0);
    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < full; i++) nodes.push(<Text key={`f${i}`}>❤️</Text>);
    if (half) nodes.push(<Text key="h">🧡</Text>);
    for (let i = 0; i < empties; i++) nodes.push(<Text key={`e${i}`}>🤍</Text>);
    return <View style={{ flexDirection: "row", gap: 4 }}>{nodes}</View>;
  }

  function onFieldLayout(e: LayoutChangeEvent) {
    setFieldH(e.nativeEvent.layout.height);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: "Tap the Letter" }} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{task ? task.instruction : "Ready"}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          {renderHearts()}
          <Text style={{ color: COLORS.text }}>
            Round {round}/4 • Score {score} • High {highScore}
          </Text>
        </View>
      </View>

      {/* Field */}
      <View
        style={styles.field}
        onLayout={onFieldLayout}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          const { locationX, locationY } = e.nativeEvent;
          handleTouch(locationX, locationY);
        }}
      >
        {/* Miss banner */}
        {showMissBanner && lastMissLetter && (
          <View style={styles.missBanner} pointerEvents="none">
            <Text style={styles.missText}>Missed: {lastMissLetter}</Text>
          </View>
        )}

        {/* Drops */}
        {dropsRef.current.map((d) => {
          const translateY = d.anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, Math.max(0, fieldH - (ITEM_SIZE + 8))],
          });
          const shakeX = d.shake.interpolate({
            inputRange: [-1, 1],
            outputRange: [-SHAKE_AMPL, SHAKE_AMPL],
          });
          return (
            <Animated.View
              key={d.id}
              pointerEvents="none"
              style={[
                styles.drop,
                {
                  opacity: d.fade,
                  transform: [
                    { translateX: Animated.add(d.xVal, shakeX) }, // <-- uses stored xVal
                    { translateY },
                    { scale: d.scale },
                  ],
                },
              ]}
            >
              <Text style={styles.parachute}>🪂</Text>
              <View style={[styles.chip, { borderColor: d.color }]}>
                <Text style={[styles.letter, { color: d.color }]}>{d.letter}</Text>
              </View>
            </Animated.View>
          );
        })}

        {showConfetti && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <ConfettiBurst count={18} duration={700} />
          </View>
        )}
      </View>

      {/* Game Over modal */}
      <Modal visible={gameOver} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Game Over</Text>
            <Text style={styles.modalScore}>Score: {score}</Text>
            <Text style={styles.modalHigh}>High Score: {highScore}</Text>
            <View style={{ height: 16 }} />
            <View style={styles.modalRow}>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={resetGame}>
                <Text style={styles.btnTextPrimary}>Play Again</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={safeBack}>
                <Text style={styles.btnTextGhost}>Back</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 6 },
  title: { fontSize: 18, fontWeight: "900", color: COLORS.navy },
  field: { flex: 1, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border },
  drop: { position: "absolute", width: ITEM_SIZE, height: ITEM_SIZE + 22, alignItems: "center" },
  parachute: { fontSize: 22, marginBottom: 2 },
  chip: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  letter: { fontSize: 30, fontWeight: "900" },

  // Miss banner
  missBanner: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  missText: { color: "#b91c1c", fontWeight: "800", fontSize: 14 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    backgroundColor: "#fff",
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: { fontSize: 22, fontWeight: "900", color: COLORS.navy, textAlign: "center" },
  modalScore: { fontSize: 18, fontWeight: "700", color: COLORS.text, textAlign: "center", marginTop: 8 },
  modalHigh: { fontSize: 14, color: COLORS.text /* or COLORS.textDim if you added it */, textAlign: "center", marginTop: 4 },
  modalRow: { flexDirection: "row", gap: 12, justifyContent: "center" },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnPrimary: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  btnGhost: { backgroundColor: "#fff", borderColor: COLORS.border },
  btnTextPrimary: { color: "#fff", fontWeight: "800" },
  btnTextGhost: { color: COLORS.navy, fontWeight: "800" },
});
