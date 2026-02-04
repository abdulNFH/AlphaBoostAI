import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  Image,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "@/constants/colors";
import { speak } from "@/lib/tts";
import ConfettiBurst from "@/components/ConfettiBurst";
import { saveGameHighScore, getLetterProgress } from "@/lib/progress";

const CHIP_SIZE = 76;
const PER_ROW = 4;
const GAP = 12;
const HIT_PAD = 8;
const EAT_MS = 220;
const OPTIONS_COUNT = 12;
const GRID_EXTRA_PAD = 24;
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const HS_KEY = "monster_high_score_v1"; // legacy key for migration

const ri = (n: number) => Math.floor(Math.random() * n);
const shuffle = <T,>(a: T[]) => {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = ri(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
function buildOptions(target: string, count = OPTIONS_COUNT): string[] {
  const set = new Set<string>([target]);
  while (set.size < count) {
    const L = ABC[ri(ABC.length)];
    set.add(Math.random() < 0.5 ? L : L.toLowerCase());
  }
  return shuffle([...set]);
}
const describeCase = (ch: string) =>
  ch === ch.toUpperCase() ? `capital ${ch}` : `small ${ch}`;

/* ---------------- Audio Helpers ---------------- */
async function playSound(asset: any, maxMs?: number) {
  const { sound } = await Audio.Sound.createAsync(asset);
  sound.setOnPlaybackStatusUpdate((s: any) => {
    if (s.isLoaded && s.didJustFinish) sound.unloadAsync();
  });
  try {
    await sound.playAsync();
  } catch {
    await sound.unloadAsync();
  }
  if (maxMs && maxMs > 0) {
    setTimeout(async () => {
      try {
        const st: any = await sound.getStatusAsync();
        if (st.isLoaded && !st.didJustFinish) await sound.stopAsync();
      } finally {
        await sound.unloadAsync();
      }
    }, maxMs);
  }
}
const playChomp = () => playSound(require("../../assets/sounds/monster_eating.mp3"));
const playWrong = () => playSound(require("../../assets/sounds/monster2.wav"), 2000);
const playCheer = () => playSound(require("../../assets/sounds/cheers.wav"));
/* ------------------------------------------------ */

export default function MonsterFeeding() {
  const { letter } = useLocalSearchParams<{ letter: string }>();
  const letterId = (letter ?? "a").toLowerCase();

  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [target, setTarget] = useState("N");
  const [options, setOptions] = useState<string[]>(() => buildOptions("N"));
  const [panelW, setPanelW] = useState(0);
  const [panelH, setPanelH] = useState(0);
  const [monsterBox, setMonsterBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const monsterCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const monsterScale = useRef(new Animated.Value(1)).current;
  const [showConfetti, setShowConfetti] = useState(false);

  /* ---------------- Load & migrate high score ---------------- */
  useEffect(() => {
    (async () => {
      const progress = await getLetterProgress(letterId);
      let savedScore = progress.monsterHighScore ?? 0;

      const oldRaw = await AsyncStorage.getItem(HS_KEY);
      const oldScore = oldRaw ? Number(oldRaw) || 0 : 0;
      if (oldScore > savedScore) {
        await saveGameHighScore(letterId, "monster", oldScore);
        savedScore = oldScore;
      }
      setHighScore(savedScore);
    })();
  }, [letterId]);

  /* ---------------- Intro voice prompt ---------------- */
  useEffect(() => {
    if (gameOver) return;
    if (round === 1) {
      speak("Monster is hungry! Feed the monster otherwise it will be angry!");
      setTimeout(() => speak(`Feed me ${describeCase(target)}`), 2000);
    } else {
      speak(`Feed me ${describeCase(target)}`);
    }
  }, [round, target, gameOver]);

  const bounceMonster = () => {
    Animated.sequence([
      Animated.timing(monsterScale, { toValue: 1.1, duration: 120, useNativeDriver: false }),
      Animated.timing(monsterScale, { toValue: 1.0, duration: 160, useNativeDriver: false }),
    ]).start();
  };

  const newRound = () => {
    const U = ABC[ri(ABC.length)];
    const nxt = Math.random() < 0.5 ? U : U.toLowerCase();
    setTarget(nxt);
    setOptions(buildOptions(nxt));
    setRound((r) => r + 1);
  };

  const homes = useMemo(() => {
    if (!panelW || !panelH) return [];
    const rows = Math.ceil(options.length / PER_ROW);
    const totalW = PER_ROW * CHIP_SIZE + (PER_ROW - 1) * GAP;
    const totalH = rows * CHIP_SIZE + (rows - 1) * GAP;
    const left = Math.max(0, (panelW - totalW) / 2);
    const topStart = Math.max(0, panelH - totalH - GRID_EXTRA_PAD);
    return options.map((_, i) => {
      const row = Math.floor(i / PER_ROW);
      const col = i % PER_ROW;
      return { x: left + col * (CHIP_SIZE + GAP), y: topStart + row * (CHIP_SIZE + GAP) };
    });
  }, [panelW, panelH, options]);

  /* ---------------- End game ---------------- */
  const endGameIfNeeded = async (remainingLives: number, currentScore: number) => {
    if (remainingLives <= 0) {
      const newHigh = Math.max(highScore, currentScore);
      const isNew = newHigh > highScore;

      setHighScore(newHigh);
      await saveGameHighScore(letterId, "monster", newHigh);
      setGameOver(true);

      if (isNew) {
        speak("New high score! Amazing!");
        playCheer();
      } else {
        speak("Game over!");
      }
    }
  };

  /* ---------------- Drop handler ---------------- */
  const handleDrop = (
    cx: number,
    cy: number,
    label: string,
    snapBack: () => void,
    flyTo: (to: { x: number; y: number }, done: () => void) => void,
    setWrong?: (v: boolean) => void
  ) => {
    if (gameOver || !monsterBox) return snapBack();

    const inMonster =
      cx >= monsterBox.x - HIT_PAD &&
      cx <= monsterBox.x + monsterBox.w + HIT_PAD &&
      cy >= monsterBox.y - HIT_PAD &&
      cy <= monsterBox.y + monsterBox.h + HIT_PAD;

    const correct = label === target;

    if (correct && inMonster) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      speak("Yum!");
      playChomp();
      bounceMonster();
      setScore((s) => s + 1);
      setShowConfetti(true);
      flyTo(monsterCenter.current, () => {
        setTimeout(() => setShowConfetti(false), 700);
        newRound();
      });
      return;
    }

    if (setWrong) {
      setWrong(true);
      setTimeout(() => setWrong(false), 400);
    }
    playWrong();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const nextLives = lives - 1;
    setLives(nextLives);
    snapBack();
    endGameIfNeeded(nextLives, score);
  };

  const resetGame = () => {
    setScore(0);
    setLives(3);
    setGameOver(false);
    setRound(1);
    const U = ABC[ri(ABC.length)];
    const nxt = Math.random() < 0.5 ? U : U.toLowerCase();
    setTarget(nxt);
    setOptions(buildOptions(nxt));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: "Monster Feeding" }} />
      {showConfetti && <ConfettiBurst />}

      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Text style={{ color: COLORS.navy, fontWeight: "900" }}>Round {round}</Text>
          <Text style={{ fontSize: 18 }}>
            {Array.from({ length: 3 }).map((_, i) => (i < lives ? "❤️" : "🖤")).join(" ")}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          <Text style={{ color: COLORS.teal, fontWeight: "900" }}>⭐ Score {score}</Text>
          <Text style={{ color: COLORS.navy, fontWeight: "900" }}>🏆 High {highScore}</Text>
        </View>
      </View>

      {/* Play Area */}
      <View
        onLayout={(e: LayoutChangeEvent) => {
          setPanelW(e.nativeEvent.layout.width);
          setPanelH(e.nativeEvent.layout.height);
        }}
        style={{ flex: 1, position: "relative", paddingHorizontal: 12 }}
      >
        <LinearGradient colors={["#E7F5FF", "#FFE0E0"]} style={{ position: "absolute", inset: 0 }} />

        {/* Monster */}
        <Animated.View
          style={{ alignItems: "center", marginTop: 8, transform: [{ scale: monsterScale }] }}
          onLayout={(e) => {
            const { x, y, width, height } = e.nativeEvent.layout;
            setMonsterBox({ x, y, w: width, h: height });
            monsterCenter.current = { x: x + width / 2 - CHIP_SIZE / 2, y: y + height / 2 - CHIP_SIZE / 2 };
          }}
        >
          <Image source={require("../../assets/images/monster.png")} style={{ width: 220, height: 220 }} resizeMode="contain" />
        </Animated.View>

        {/* Sound Button */}
        <View style={{ alignItems: "flex-start", marginTop: 20, marginLeft: 20 }}>
          <Pressable
            onPress={async () => {
              await Haptics.selectionAsync();
              speak(`Feed me ${describeCase(target)}`);
            }}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#FFF7C2",
              borderWidth: 2,
              borderColor: "#E0C200",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 36 }}>🔊</Text>
          </Pressable>
        </View>

        {/* Draggable letters */}
        {homes.length > 0 &&
          options.map((label, i) => (
            <DraggableLetter
              key={`${round}-${label}-${i}`}
              label={label}
              baseX={homes[i].x}
              baseY={homes[i].y}
              onDrop={handleDrop}
              disabled={gameOver}
            />
          ))}

        {/* Game Over Overlay */}
        {gameOver && (
          <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <View style={{ width: "86%", borderRadius: 20, backgroundColor: "#fff", padding: 20, alignItems: "center", borderWidth: 2, borderColor: COLORS.navy }}>
              <Text style={{ fontSize: 24, fontWeight: "900", color: COLORS.navy, marginBottom: 8 }}>Game Over</Text>
              <Text style={{ fontSize: 18, marginBottom: 4 }}>Score: <Text style={{ fontWeight: "900" }}>{score}</Text></Text>
              <Text style={{ fontSize: 18, marginBottom: 16 }}>High Score: <Text style={{ fontWeight: "900" }}>{highScore}</Text></Text>
              <Pressable onPress={resetGame} style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, backgroundColor: COLORS.teal }}>
                <Text style={{ color: "#fff", fontWeight: "900" }}>Play Again</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

/* ---------- Draggable ---------- */
function DraggableLetter({ label, baseX, baseY, onDrop, disabled }: any) {
  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [wrong, setWrong] = useState(false);
  const committed = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });

  const snapBack = () => {
    Animated.parallel([
      Animated.spring(translate, { toValue: committed.current, useNativeDriver: false, bounciness: 8 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: false }),
    ]).start();
  };

  const flyTo = (to: { x: number; y: number }, done: () => void) => {
    const dx = to.x - baseX;
    const dy = to.y - baseY;
    Animated.parallel([
      Animated.timing(translate, { toValue: { x: dx, y: dy }, duration: EAT_MS, useNativeDriver: false }),
      Animated.timing(scale, { toValue: 0.6, duration: EAT_MS, useNativeDriver: false }),
    ]).start(() => {
      committed.current = { x: dx, y: dy };
      done();
    });
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: () => {
        const tx = (translate.x as any)._value;
        const ty = (translate.y as any)._value;
        dragStart.current = { x: tx, y: ty };
        Animated.spring(scale, { toValue: 1.08, useNativeDriver: false }).start();
      },
      onPanResponderMove: (_e, g) => {
        translate.setValue({ x: dragStart.current.x + g.dx, y: dragStart.current.y + g.dy });
      },
      onPanResponderRelease: () => {
        const tx = (translate.x as any)._value;
        const ty = (translate.y as any)._value;
        const cx = baseX + tx + CHIP_SIZE / 2;
        const cy = baseY + ty + CHIP_SIZE / 2;
        onDrop(cx, cy, label, snapBack, flyTo, setWrong);
      },
      onPanResponderTerminate: snapBack,
    })
  ).current;

  return (
    <Animated.View
      {...pan.panHandlers}
      style={{
        position: "absolute",
        width: CHIP_SIZE,
        height: CHIP_SIZE,
        left: baseX,
        top: baseY,
        transform: [{ translateX: translate.x }, { translateY: translate.y }, { scale }],
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: 20,
          backgroundColor: wrong ? "#fecaca" : "#fff",
          borderWidth: 2,
          borderColor: wrong ? "#dc2626" : "#15314b",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 34, fontWeight: "900", color: wrong ? "#dc2626" : "#15314b" }}>
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}
