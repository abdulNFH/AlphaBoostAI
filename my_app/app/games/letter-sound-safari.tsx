// app/games/letter-sound-safari.tsx
import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  FlatList,
  Modal,
} from "react-native";

import { COLORS } from "../../constants/colors";
import { speak } from "../../lib/tts";
import ConfettiBurst from "../../components/ConfettiBurst";

const ROUNDS = 5;       // 3 x 5 rounds (3x3 grid each)
const GRID = 9;          // 3x3
const ROUND_TIME = 10;
const PRAISES = ["Great!", "Awesome!", "Super!", "Well done!", "Nice!"];

const LEXICON: Record<string, { word: string; emoji: string }> = {
  A: { word: "Apple", emoji: "🍎" },
  B: { word: "Ball", emoji: "⚽" },
  C: { word: "Cat", emoji: "🐱" },
  D: { word: "Dog", emoji: "🐶" },
  E: { word: "Elephant", emoji: "🐘" },
  F: { word: "Fish", emoji: "🐟" },
  G: { word: "Grapes", emoji: "🍇" },
  H: { word: "Hat", emoji: "🎩" },
  I: { word: "Ice cream", emoji: "🍦" },
  J: { word: "Jam", emoji: "🍓" },
  K: { word: "Kite", emoji: "🪁" },
  L: { word: "Lion", emoji: "🦁" },
  M: { word: "Monkey", emoji: "🐒" },
  N: { word: "Nest", emoji: "🪺" },
  O: { word: "Orange", emoji: "🍊" },
  P: { word: "Panda", emoji: "🐼" },
  Q: { word: "Queen", emoji: "👑" },
  R: { word: "Rabbit", emoji: "🐰" },
  S: { word: "Sun", emoji: "🌞" },
  T: { word: "Tiger", emoji: "🐯" },
  U: { word: "Umbrella", emoji: "☂️" },
  V: { word: "Violin", emoji: "🎻" },
  W: { word: "Whale", emoji: "🐳" },
  X: { word: "Box (X)", emoji: "📦" },
  Y: { word: "Yo-yo", emoji: "🪀" },
  Z: { word: "Zebra", emoji: "🦓" },
};
const LETTERS = Object.keys(LEXICON);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const coin = () => Math.random() < 0.5;

export default function LetterSoundSafari() {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [target, setTarget] = useState<{ letter: string; spoken: string; word: string; emoji: string }>({
    letter: "M",
    spoken: "capital M",
    word: "Monkey",
    emoji: "🐒",
  });
  const [options, setOptions] = useState<string[]>([]);

  // timer state
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundLockedRef = useRef(false);

  const hintAnim = useRef(new Animated.Value(0)).current;

  const sayPrompt = (t = target) =>
    speak(`Find ${t.spoken}. ${t.letter} for ${t.word}.`);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    setTimeLeft(ROUND_TIME);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const nxt = t - 1;
        if (nxt === 3) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (nxt <= 0) {
          stopTimer();
          if (!roundLockedRef.current) {
            roundLockedRef.current = true;
            speak("Time’s up!");
            setTimeout(next, 300);
          }
          return 0;
        }
        return nxt;
      });
    }, 1000);
  };

  const buildRound = () => {
    roundLockedRef.current = false;

    const base = pick(LETTERS);
    const lower = coin();
    const letter = lower ? base.toLowerCase() : base.toUpperCase();
    const spoken = `${lower ? "small" : "capital"} ${base}`;
    const entry = LEXICON[base];

    const pool = new Set<string>([letter]);
    while (pool.size < GRID) {
      const b = pick(LETTERS);
      pool.add(coin() ? b.toLowerCase() : b.toUpperCase());
    }
    const opts = [...pool].sort(() => Math.random() - 0.5);

    setTarget({ letter, spoken, word: entry.word, emoji: entry.emoji });
    setOptions(opts);
    sayPrompt({ letter, spoken, word: entry.word, emoji: entry.emoji });
    startTimer();
  };

  useEffect(() => {
    buildRound();
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const onPick = (choice: string) => {
    if (roundLockedRef.current) return;
    const correct = choice === target.letter;

    roundLockedRef.current = true;  // lock either way
    stopTimer();

    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      speak(pick(PRAISES));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 600);
      setScore((s) => s + 1);
      setTimeout(next, 400);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      speak(`Oops! That was not ${target.spoken}.`);
      setTimeout(next, 400); // ⬅️ advance immediately on wrong
    }
  };

  const next = () => {
    if (round >= ROUNDS) {
      // finish → show results modal
      setShowResults(true);
      speak(`Safari complete! You scored ${score} out of ${ROUNDS}.`);
      return;
    }
    setRound((r) => r + 1);
  };

  const hint = () => {
    Animated.sequence([
      Animated.timing(hintAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.timing(hintAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(hintAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.timing(hintAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
    sayPrompt();
  };

  const askAgain = () => {
    // re-say without animation changes
    sayPrompt();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const restart = () => {
    stopTimer();
    setScore(0);
    setRound(1);
    setShowResults(false);
  };

  const progress = timeLeft / ROUND_TIME;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: "Letter Sound Safari" }} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text }}>Round {round} / {ROUNDS}</Text>
          <Text style={styles.title}>
            Find: <Text style={{ color: COLORS.teal }}>{target.spoken}</Text>
          </Text>
          <Text style={styles.subtitle}>
            {target.emoji} {target.word}
          </Text>
        </View>

        {/* Timer pill */}
        <View style={styles.timerWrap}>
          <View style={styles.timerBarBg}>
            <View style={[styles.timerBarFg, { width: `${Math.max(0, progress * 100)}%` }]} />
          </View>
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>

        {/* Controls */}
        <View style={{ gap: 6 }}>
          <Pressable style={styles.hintBtn} onPress={hint}>
            <Text style={styles.hintTxt}>💡 Hint</Text>
          </Pressable>
          <Pressable style={[styles.hintBtn, { backgroundColor: "#ffe6c7", borderColor: "#f4b76b" }]} onPress={askAgain}>
            <Text style={[styles.hintTxt, { color: COLORS.navy }]}>🔁 Ask again</Text>
          </Pressable>
        </View>
      </View>

      {/* Grid: always 3 columns → 3 rows for 9 items */}
      <FlatList
        data={options}
        keyExtractor={(item, i) => `${item}-${i}`}
        numColumns={3}
        contentContainerStyle={styles.gridList}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item: L }) => {
          const isCorrect = L === target.letter;
          const pulseStyle = isCorrect
            ? {
                transform: [
                  {
                    scale: hintAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.12],
                    }),
                  },
                ],
              }
            : null;

          return (
            <Animated.View style={[styles.tile, pulseStyle as any]}>
              <Pressable
                onPressIn={() => onPick(L)}
                hitSlop={16}
                style={styles.tilePress}
                android_ripple={{ color: "#00000011", borderless: true }}
              >
                <Text style={styles.letter}>{L}</Text>
              </Pressable>
            </Animated.View>
          );
        }}
      />

      {/* Confetti */}
      {showConfetti && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <ConfettiBurst count={20} duration={900} />
        </View>
      )}

      {/* Final Results Modal */}
      <Modal visible={showResults} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Safari Complete! 🐾</Text>
            <Text style={styles.modalScore}>
              You scored <Text style={{ color: COLORS.teal }}>{score}</Text> / {ROUNDS}
            </Text>

            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, { backgroundColor: COLORS.teal, borderColor: COLORS.teal }]} onPress={restart}>
                <Text style={[styles.modalBtnTxt, { color: "white" }]}>Play again</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: COLORS.yellow, borderColor: "#E0C200" }]} onPress={() => router.back()}>
                <Text style={[styles.modalBtnTxt, { color: COLORS.navy }]}>Exit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "900", color: COLORS.navy, marginTop: 4 },
  subtitle: { fontSize: 16, color: COLORS.text, marginTop: 2 },
  hintBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: COLORS.yellow,
    borderWidth: 1,
    borderColor: "#E0C200",
  },
  hintTxt: { fontWeight: "900", color: COLORS.navy },

  // Timer styles
  timerWrap: { alignItems: "center", gap: 6 },
  timerBarBg: {
    width: 84,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#00000010",
    overflow: "hidden",
  },
  timerBarFg: { height: "100%", backgroundColor: COLORS.teal },
  timerText: { fontWeight: "900", color: COLORS.navy },

  // Grid via FlatList
  gridList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    rowGap: 12,
  },
  gridRow: {
    columnGap: 12,
  },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 3,
    borderColor: COLORS.teal,
    justifyContent: "center",
    alignItems: "center",
  },
  tilePress: { flex: 1, justifyContent: "center", alignItems: "center", width: "100%" },
  letter: { color: COLORS.navy, fontSize: 36, fontWeight: "900" },

  // Results modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.teal,
    alignItems: "center",
    gap: 10,
  },
  modalTitle: { fontSize: 22, fontWeight: "900", color: COLORS.navy },
  modalScore: { fontSize: 18, color: COLORS.text, marginTop: 4 },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 10 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
  },
  modalBtnTxt: { fontWeight: "900", fontSize: 16 },
});
