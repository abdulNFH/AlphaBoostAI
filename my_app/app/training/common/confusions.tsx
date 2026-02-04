import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Animated, useWindowDimensions, Modal } from "react-native";
import { Stack, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../../constants/colors";
import { speak } from "../../../lib/tts";
import ConfettiBurst from "../../../components/ConfettiBurst";
import { addConfusionPairResult, getAllConfusionPairResults } from "../../../lib/progress";

const ROUNDS = 6;
const GRID_COUNT = 12;

const CONFUSION_SETS = [
  ["b", "d"], ["p", "q"], ["m", "n"], ["u", "v"], ["c", "o"], ["i", "l"],
  ["t", "f"], ["g", "q"], ["a", "o"], ["e", "c"], ["w", "m"], ["s", "z"],
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

function buildRound(pair: string[]) {
  const [a, b] = pair;
  const target = Math.random() < 0.5 ? a : b;
  const minTargets = 3 + Math.floor(Math.random() * 3);
  const grid: string[] = [];
  let count = 0;
  for (let i = 0; i < GRID_COUNT; i++) {
    if (count < minTargets) { grid.push(target); count++; }
    else grid.push(Math.random() < 0.5 ? target : (target === a ? b : a));
  }
  return { pair, target, grid: shuffle(grid) };
}

export default function ConfusionGame() {
  const { width } = useWindowDimensions();
  const [round, setRound] = useState(1);
  const [pairsForSession, setPairsForSession] = useState<string[][]>([]);
  const [currentPair, setCurrentPair] = useState<string[]>(["b", "d"]);
  const [{ target, grid }, setQ] = useState(buildRound(["b", "d"]));
  const [selected, setSelected] = useState<number[]>([]);
  const [checking, setChecking] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // 🧠 Select adaptive pairs
  useEffect(() => {
    (async () => {
      const saved = await getAllConfusionPairResults();
      const trainedPairs = saved.map((p) => p.pair);
      const untrained = CONFUSION_SETS.filter(
        ([a, b]) => !trainedPairs.includes(`${a}/${b}`)
      );

      let chosen: string[][];
      if (untrained.length >= ROUNDS) chosen = shuffle(untrained).slice(0, ROUNDS);
      else if (untrained.length > 0) {
        const remaining = saved.sort((a, b) => a.accuracy - b.accuracy)
          .slice(0, ROUNDS - untrained.length)
          .map((p) => p.pair.split("/"));
        chosen = [...untrained, ...remaining];
      } else {
        chosen = saved.sort((a, b) => a.accuracy - b.accuracy)
          .slice(0, ROUNDS)
          .map((p) => p.pair.split("/"));
      }

      setPairsForSession(chosen);
      const first = chosen[0] ?? ["b", "d"];
      setCurrentPair(first);
      setQ(buildRound(first));
    })();
  }, []);

  const scales = useMemo(() => grid.map(() => new Animated.Value(1)), [round]);
  useEffect(() => speak(`Select all ${target}'s`), [target, round]);

  const toggle = (i: number) => {
    if (checking) return;
    Haptics.selectionAsync();
    Animated.sequence([
      Animated.timing(scales[i], { toValue: 0.95, duration: 60, useNativeDriver: true }),
      Animated.spring(scales[i], { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    setSelected((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  };

  const checkAnswer = async () => {
    if (checking) return;
    setChecking(true);

    const correct = selected.filter((i) => grid[i] === target).length;
    const wrong = selected.filter((i) => grid[i] !== target).length;
    await addConfusionPairResult(`${currentPair[0]}/${currentPair[1]}`, correct, wrong);

    if (wrong === 0 && correct > 0) {
      speak("Great job!");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowConfetti(true);
    } else {
      speak("Try again");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setTimeout(() => {
      if (round >= ROUNDS) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        speak("Session complete! Great work!");
        setShowPopup(true);
        setTimeout(() => {
          setShowPopup(false);
          router.replace("/training/common");
        }, 2000);
      } else {
        const next = pairsForSession[round] ?? pick(CONFUSION_SETS);
        setRound((r) => r + 1);
        setCurrentPair(next);
        setQ(buildRound(next));
        setSelected([]);
        setChecking(false);
      }
    }, 800);
  };

  const columns = width > 720 ? 4 : 3;
  const gap = 12;
  const totalGap = gap * (columns - 1);
  const tileWidth = Math.floor((width - 32 - totalGap) / columns);
  const tileHeight = Math.max(88, Math.floor(tileWidth * 0.9));

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: "Confusing Letters 🔠" }} />
      <View style={{ padding: 16 }}>
        <Text style={{ fontWeight: "900", fontSize: 18, color: COLORS.navy }}>
          Round {round} of {ROUNDS} — Tap all {target}'s
        </Text>
      </View>

      <View style={{
        flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16
      }}>
        {grid.map((ch, idx) => {
          const isSel = selected.includes(idx);
          const bg = isSel ? "#ECFDF5" : "#fff";
          return (
            <Animated.View
              key={idx}
              style={{
                width: tileWidth, height: tileHeight, marginBottom: gap,
                transform: [{ scale: scales[idx] }],
              }}>
              <Pressable
                disabled={checking}
                onPress={() => toggle(idx)}
                style={{
                  flex: 1, alignItems: "center", justifyContent: "center",
                  borderRadius: 16, borderWidth: 2, borderColor: COLORS.border,
                  backgroundColor: bg,
                }}>
                <Text style={{ fontSize: 38, fontWeight: "900", color: COLORS.navy }}>{ch}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <View style={{ padding: 16 }}>
        <Pressable onPress={checkAnswer} disabled={checking}
          style={{
            paddingVertical: 14, borderRadius: 12,
            borderWidth: 2, borderColor: COLORS.navy,
            backgroundColor: COLORS.yellow, alignItems: "center",
          }}>
          <Text style={{ fontWeight: "900", color: COLORS.navy }}>Check Answer</Text>
        </Pressable>
      </View>

      {showConfetti && <ConfettiBurst count={24} duration={1300} onDone={() => setShowConfetti(false)} />}

      {/* 🎉 Popup */}
      <Modal visible={showPopup} transparent animationType="fade">
        <View style={{
          flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "center", alignItems: "center", padding: 24,
        }}>
          <View style={{
            backgroundColor: "#fff", borderRadius: 20, padding: 24,
            alignItems: "center", maxWidth: 320, shadowColor: "#000",
            shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
          }}>
            <Text style={{ fontSize: 46, marginBottom: 8 }}>🎉</Text>
            <Text style={{
              fontSize: 20, fontWeight: "900", color: COLORS.navy, textAlign: "center",
            }}>
              Session Complete!
            </Text>
            <Text style={{
              fontSize: 16, color: COLORS.text, textAlign: "center", marginTop: 8,
            }}>
              You’ve finished all 6 confusing letter rounds.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
