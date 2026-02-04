// app/games/letter-hero.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Dimensions,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { COLORS } from "../../constants/colors";
import { speak } from "../../lib/tts";
import ConfettiBurst from "../../components/ConfettiBurst";
import { awardArcadeStars, setHigh } from "../../lib/arcade";

const { width: W, height: H } = Dimensions.get("window");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/* ---------- tuning ---------- */
const ROUNDS = 10;

// multi-line grid
const ROWS = 3;
const PER_ROW = 4;
const ENEMIES_TOTAL = ROWS * PER_ROW;

const ENEMY_SIZE = 72;
const START_STAGGER_MS = 90;
const WAVE_GAP_MS = 700;

const ROUND_TIME_MS = 9000;          // per-round timer (slightly longer for multi-select)
const FLOAT_MS_BASE = 5200;          // enemy float time baseline
const FLOAT_MS_MIN = 3400;           // min after scaling
const FLOAT_MS_STEP = 180;           // speed up per correct

const PRAISES = ["Great!", "Awesome!", "Super!", "Well done!", "Nice!"];

/* confusing pairs */
const CONFUSION_SETS: string[][] = [
  ["b", "d"], ["p", "q"], ["m", "n"], ["u", "v"], ["i", "l"], ["c", "e"],
  ["g", "q"], ["h", "k"], ["t", "f"], ["o", "a"],
];

type Enemy = {
  id: string;
  letter: string;
  x: number;
  row: number;
  anim: Animated.Value;
  alive: boolean;
  hit?: boolean;
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const uc = (s: string) => s.toUpperCase();
const lc = (s: string) => s.toLowerCase();

/* ------- FX: StarBurst ------- */
const StarBurst: React.FC<{ x: number; y: number; onDone?: () => void }> = ({ x, y, onDone }) => {
  const N = 10;
  const items = React.useMemo(
    () =>
      Array.from({ length: N }).map(() => ({
        dx: rand(-36, 36),
        dy: rand(-36, 36),
        s: rand(0.8, 1.4),
        a: new Animated.Value(0),
      })),
    []
  );
  useEffect(() => {
    Animated.stagger(
      12,
      items.map((it) =>
        Animated.timing(it.a, { toValue: 1, duration: 360, useNativeDriver: true })
      )
    ).start(() => onDone?.());
  }, []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {items.map((it, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: x,
            top: y,
            transform: [
              { translateX: it.a.interpolate({ inputRange: [0, 1], outputRange: [0, it.dx] }) },
              { translateY: it.a.interpolate({ inputRange: [0, 1], outputRange: [0, it.dy] }) },
              { scale: it.s },
            ],
            opacity: it.a.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          }}
        >
          <Text style={{ fontSize: 16 }}>✨</Text>
        </Animated.View>
      ))}
    </View>
  );
};

/* ------- FX: HeartPop ------- */
const HeartPop: React.FC<{ x: number; y: number; onDone?: () => void }> = ({
  x,
  y,
  onDone,
}) => {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 600, useNativeDriver: true }).start(() =>
      onDone?.()
    );
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: [
          { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -36] }) },
          { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) },
        ],
        opacity: a.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
      }}
    >
      <Text style={{ fontSize: 22 }}>💔</Text>
    </Animated.View>
  );
};

/* ------- FX: TimerWarning ------- */
const TimerWarning: React.FC<{ show: boolean }> = ({ show }) => {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (show) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(a, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0, duration: 260, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      a.setValue(0);
    }
  }, [show]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: "rgba(220, 38, 38, 0.12)",
          opacity: a,
        },
      ]}
    />
  );
};

/* ------- UI: RoundBanner ------- */
const RoundBanner: React.FC<{ text: string; showKey: any }> = ({ text, showKey }) => {
  const ty = useRef(new Animated.Value(-80)).current;
  useEffect(() => {
    ty.setValue(-80);
    Animated.sequence([
      Animated.timing(ty, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(900),
      Animated.timing(ty, {
        toValue: -80,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [showKey]); // rerun each round
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        top: 8,
        transform: [{ translateY: ty }],
        alignItems: "center",
      }}
    >
      <View
        style={{
          paddingVertical: 10,
          paddingHorizontal: 16,
          backgroundColor: "#fff",
          borderWidth: 2,
          borderColor: COLORS.teal,
          borderRadius: 14,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 3,
        }}
      >
        <Text style={{ fontWeight: "900", color: COLORS.navy }}>{text}</Text>
      </View>
    </Animated.View>
  );
};

/* ------- UI: HeartsSplit (3 up, 3 down) ------- */
const HEART_SLOTS = 6;
const FULL_EMOJI = "❤️";
const HALF_EMOJI = "💖";
const EMPTY_EMOJI = "🖤";

function renderHearts(halves: number) {
  const full = Math.floor(halves / 2);
  const hasHalf = halves % 2 === 1;
  const out: string[] = [];
  for (let i = 0; i < HEART_SLOTS; i++) {
    if (i < full) out.push(FULL_EMOJI);
    else if (i === full && hasHalf) out.push(HALF_EMOJI);
    else out.push(EMPTY_EMOJI);
  }
  return out;
}

const HeartsSplit: React.FC<{ halves: number; size?: number }> = ({ halves, size = 18 }) => {
  const icons = renderHearts(halves); // 6 icons
  const top = icons.slice(0, 3);
  const bottom = icons.slice(3);
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {top.map((h, i) => (
          <Text key={`t-${i}`} style={{ fontSize: size }}>
            {h}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {bottom.map((h, i) => (
          <Text key={`b-${i}`} style={{ fontSize: size }}>
            {h}
          </Text>
        ))}
      </View>
    </View>
  );
};

/* ---------------- helpers for targets & waves ---------------- */
function makeTarget(): {
  target: string;
  family: string[];
  spoken: string;
  key: string;
  count: number;
} {
  const set = pick(CONFUSION_SETS);
  const lower = Math.random() < 0.5;
  const which = pick(set);
  const t = lower ? lc(which) : uc(which);
  const fam = set.flatMap((ch) => [lc(ch), uc(ch)]);
  const spoken = `${lower ? "small" : "capital"} ${t}`;
  const count = Math.random() < 0.55 ? 2 : 3;
  return { target: t, family: fam, spoken, key: set.join(""), count };
}

function lettersForMultiSelect(target: string, family: string[], total = ENEMIES_TOTAL, need = 2) {
  const arr: string[] = [];
  for (let i = 0; i < need; i++) arr.push(target);
  const famCount = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1));
  for (let i = 0; i < famCount; i++) arr.push(pick(family));
  while (arr.length < total) {
    const code = 97 + Math.floor(Math.random() * 26);
    const ch = String.fromCharCode(code);
    arr.push(Math.random() < 0.5 ? ch : ch.toUpperCase());
  }
  return arr.map((x) => ({ x, r: Math.random() })).sort((a, b) => a.r - b.r).map((o) => o.x);
}

function makeGridCenters(perRow: number) {
  const sidePad = 28;
  const laneW = (W - sidePad * 2) / perRow;
  const xs: number[] = [];
  for (let i = 0; i < perRow; i++) {
    const center = sidePad + laneW * i + laneW / 2;
    xs.push(center + rand(-laneW * 0.08, laneW * 0.08));
  }
  return xs;
}

export default function LetterHero() {
  // core
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [heartsHalves, setHeartsHalves] = useState(12); // 6 hearts = 12 halves
  const [showConfetti, setShowConfetti] = useState(false);

  // targets
  const [target, setTarget] = useState<string>("A");
  const [spoken, setSpoken] = useState<string>("capital A");
  const [needCount, setNeedCount] = useState<number>(2);
  const [leftToFind, setLeftToFind] = useState<number>(2);

  // motion & timing
  const [floatMs, setFloatMs] = useState(FLOAT_MS_BASE);
  const timerVal = useRef(new Animated.Value(0)).current;
  const timerRunningRef = useRef(false);

  // entities
  const enemiesRef = useRef<Enemy[]>([]);
  const [, force] = useState(0);
  const yNowByIdRef = useRef<Record<string, number>>({});

  // FX
  const shieldPulse = useRef(new Animated.Value(0)).current;
  const [zap, setZap] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [starBurst, setStarBurst] = useState<{ x: number; y: number } | null>(null);
  const [heartPop, setHeartPop] = useState<{ x: number; y: number } | null>(null);
  const [lowTime, setLowTime] = useState(false);
  const [bannerKey, setBannerKey] = useState(0);

  // gameplay stats
  const lastPenaltyMsRef = useRef(0);
  const weakPairsRef = useRef<Record<string, { wrong: number; right: number }>>({});
  const activeTargetKeyRef = useRef<string>("");

  // hero (static)
  const hero = { x: W / 2, y: H - 140 };

  // rows vertical bands
  const rowStartY = [H * 0.68, H * 0.54, H * 0.40];
  const rowEndY   = [H * 0.22, H * 0.18, H * 0.12];

  /* ---------- GAME-OVER SAFETY ---------- */
  const gameOverRef = useRef(false);
  const nextTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const heartsHalvesRef = useRef(heartsHalves);
  useEffect(() => {
    heartsHalvesRef.current = heartsHalves;
  }, [heartsHalves]);

  // load best score
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("heroHigh");
      const saved = raw ? Number(raw) : 0;
      if (!Number.isNaN(saved)) setBest(saved);
    })();
  }, []);

  const clearAllAnims = () => {
    enemiesRef.current.forEach((e) => e.anim.stopAnimation());
    timerVal.stopAnimation();
    timerRunningRef.current = false;
    if (nextTimeoutRef.current) {
      clearTimeout(nextTimeoutRef.current);
      nextTimeoutRef.current = null;
    }
  };

  const startRoundTimer = () => {
    if (gameOverRef.current) return;
    timerVal.setValue(0);
    timerRunningRef.current = true;
    Animated.timing(timerVal, {
      toValue: 1,
      duration: ROUND_TIME_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && timerRunningRef.current && !gameOverRef.current) {
        onTimeoutFail();
      }
    });
  };

  useEffect(() => {
    const id = timerVal.addListener(({ value }) => setLowTime(value >= 0.75));
    return () => timerVal.removeListener(id);
  }, []);

  // ------- build a wave -------
  const buildWave = React.useCallback(() => {
    if (gameOverRef.current) return;
    clearAllAnims();

    // pick target (bias to weak pair)
    let t = makeTarget();
    const weakSorted = Object.entries(weakPairsRef.current)
      .map(([key, v]) => ({ key, diff: (v.wrong ?? 0) - (v.right ?? 0) }))
      .sort((a, b) => b.diff - a.diff);

    if (weakSorted.length && weakSorted[0].diff > 0 && Math.random() < 0.6) {
      const topKey = weakSorted[0].key;
      const pair = topKey.split("");
      const lower = Math.random() < 0.5;
      const which = pick(pair);
      const tt = lower ? lc(which) : uc(which);
      const fam = pair.flatMap((ch) => [lc(ch), uc(ch)]);
      const spoken2 = `${lower ? "small" : "capital"} ${tt}`;
      const count2 = Math.random() < 0.55 ? 2 : 3;
      t = { target: tt, family: fam, spoken: spoken2, key: topKey, count: count2 };
    }

    activeTargetKeyRef.current = t.key;
    setTarget(t.target);
    setSpoken(t.spoken);
    setNeedCount(t.count);
    setLeftToFind(t.count);

    const letters = lettersForMultiSelect(t.target, t.family, ENEMIES_TOTAL, t.count);
    const xs = makeGridCenters(PER_ROW);

    enemiesRef.current = letters.map((L, idx) => {
      const row = Math.floor(idx / PER_ROW);
      const col = idx % PER_ROW;
      const id = `${L}-${Math.random().toString(36).slice(2, 7)}`;
      const x = xs[col];
      const anim = new Animated.Value(0);
      yNowByIdRef.current[id] = rowStartY[row];
      return { id, letter: L, x, row, anim, alive: true };
    });
    force((n) => n + 1);

    enemiesRef.current.forEach((e, i) => {
      const row = e.row;
      const sY = rowStartY[row];
      const eY = rowEndY[row];

      const listenerId = e.anim.addListener(({ value }) => {
        yNowByIdRef.current[e.id] = sY + (eY - sY) * value;
      });

      Animated.timing(e.anim, {
        toValue: 1,
        duration: floatMs,
        easing: Easing.linear,
        delay: (i % PER_ROW) * START_STAGGER_MS + row * 120,
        useNativeDriver: true,
      }).start(() => e.anim.removeListener(listenerId));
    });

    speak(`Select all ${t.spoken}.`);
    setBannerKey((k) => k + 1);
    startRoundTimer();
  }, [floatMs]);

  useEffect(() => {
    buildWave();
    return clearAllAnims;
  }, []); // eslint-disable-line

  /* --------- streak / multiplier --------- */
  const [streak, setStreak] = useState(0);
  const [mult, setMult] = useState(1);
  const multBadgeScale = useRef(new Animated.Value(0)).current;

  const bumpMultiplierIfNeeded = (ns: number) => {
    const m = ns >= 6 ? 3 : ns >= 3 ? 2 : 1;
    setMult((prev) => {
      if (m !== prev) {
        Animated.sequence([
          Animated.timing(multBadgeScale, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.timing(multBadgeScale, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start();
      }
      return m;
    });
  };

  /* --------- end & next --------- */
  const [isEnd, setIsEnd] = useState(false);
  const [finalStars, setFinalStars] = useState(0);

  const spendHeartsHalves = (delta: number) => {
    setHeartsHalves((h) => {
      const nx = Math.max(0, h + delta);
      if (nx <= 0) {
        timerRunningRef.current = false;
        endGame(score);
      }
      return nx;
    });
  };

  // CHANGED: accept flag to charge heart only when timeout happens
  const next = (dueToTimeout: boolean = false) => {
    // deduct one full heart (2 halves) ONLY on timeout
    if (dueToTimeout) {
      setHeartPop({ x: W - 150, y: 20 });
      spendHeartsHalves(-2);
    }

    // if hearts already hit zero inside spendHeartsHalves, endGame() has run
    if (gameOverRef.current) return;

    if (round >= ROUNDS) {
      endGame(score);
      return;
    }

    if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current);
    setStreak(0);
    setMult(1);
    nextTimeoutRef.current = setTimeout(() => {
      if (!gameOverRef.current) buildWave();
    }, WAVE_GAP_MS);
    setRound((r) => r + 1);
  };

  const endGame = async (finalScore: number) => {
    gameOverRef.current = true;
    timerRunningRef.current = false;
    clearAllAnims();

    const stars = finalScore >= 18 ? 3 : finalScore >= 13 ? 2 : finalScore >= 8 ? 1 : 0;
    setFinalStars(stars);
    setIsEnd(true);
    setShowConfetti(stars >= 2);
    setTimeout(() => setShowConfetti(false), 1200);

    try {
      await setHigh("heroHigh", finalScore);
      await AsyncStorage.setItem("heroHigh", String(Math.max(best, finalScore)));
      setBest((b) => Math.max(b, finalScore));
      await awardArcadeStars("heroStars" as any, stars);
    } catch {}
    speak(`Level complete. You scored ${finalScore}.`);
  };

  const restart = () => {
    gameOverRef.current = false;
    if (nextTimeoutRef.current) {
      clearTimeout(nextTimeoutRef.current);
      nextTimeoutRef.current = null;
    }
    setRound(1);
    setScore(0);
    setHeartsHalves(12);
    setFloatMs(FLOAT_MS_BASE);
    setStreak(0);
    setMult(1);
    setIsEnd(false);
    weakPairsRef.current = {};
    buildWave();
  };

  /* --------- interactions --------- */
  const onEnemyTap = (e: Enemy) => {
    if (!e.alive || e.hit || isEnd || gameOverRef.current) return;

    const isCorrect = e.letter === target;
    const sY = rowStartY[e.row];
    const yNow = yNowByIdRef.current[e.id] ?? sY;

    if (isCorrect) {
      e.hit = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      speak(pick(PRAISES));

      setStarBurst({ x: e.x, y: yNow });
      setZap({ x1: hero.x, y1: hero.y, x2: e.x, y2: yNow });
      setTimeout(() => setZap(null), 200);

      setStreak((s) => {
        const ns = s + 1;
        bumpMultiplierIfNeeded(ns);
        setScore((sc) => sc + (1 * (ns >= 6 ? 3 : ns >= 3 ? 2 : 1)));
        return ns;
      });

      setFloatMs((ms) => Math.max(FLOAT_MS_MIN, ms - FLOAT_MS_STEP));

      Animated.timing(e.anim, { toValue: 1.05, duration: 180, useNativeDriver: true }).start();

      const k = activeTargetKeyRef.current;
      const row = weakPairsRef.current[k] ?? { wrong: 0, right: 0 };
      row.right = (row.right ?? 0) + 1;
      weakPairsRef.current[k] = row;

      setLeftToFind((left) => {
        const nx = Math.max(0, left - 1);
        if (nx === 0) {
          timerRunningRef.current = false;
          next(false); // SUCCESS: no heart penalty
        }
        return nx;
      });
    } else {
      const now = Date.now();
      if (now - lastPenaltyMsRef.current > 450) {
        lastPenaltyMsRef.current = now;
        setHeartPop({ x: W - 150, y: 20 });
        spendHeartsHalves(-1); // WRONG TAP: minus half-heart
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        speak("Shield!");
        Animated.sequence([
          Animated.timing(shieldPulse, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(shieldPulse, { toValue: 0, duration: 160, useNativeDriver: true }),
        ]).start();

        const k = activeTargetKeyRef.current;
        const row = weakPairsRef.current[k] ?? { wrong: 0, right: 0 };
        row.wrong = (row.wrong ?? 0) + 1;
        weakPairsRef.current[k] = row;
      }
    }
  };

  const onTimeoutFail = () => {
    if (gameOverRef.current) return;
    timerRunningRef.current = false;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    speak("Time up!");
    next(true); // TIMEOUT: charge one full heart here
  };

  /* --------- UI helpers --------- */
  const sayAgain = () => speak(`Select all ${spoken}.`);

  const timerWidth = timerVal.interpolate({
    inputRange: [0, 1],
    outputRange: [W - 24, 0],
  });

  /* --------- render --------- */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: "Letter Hero" }} />

      {/* Round banner */}
      <RoundBanner text={`Select all ${spoken} (${needCount})`} showKey={bannerKey} />

      {/* Header */}
      <View style={styles.headerWrap}>
        <View style={styles.headerCard}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.hSmall}>Round {round} / {ROUNDS}</Text>

            {/* Target row — single line */}
            <View style={styles.targetRow}>
              <Text style={styles.hTitleLabel}>Target:</Text>
              <Text style={styles.hTitleValue}>{target}</Text>
              <Text style={styles.hSubDot}>•</Text>
              <Text style={styles.hSub}>Left: {leftToFind}/{needCount}</Text>
            </View>
          </View>

          <View style={styles.badgesRight}>
            <View style={styles.kvPill}>
              <Text style={styles.kvLabel}>x</Text>
              <Text style={styles.kvValue}>{mult}</Text>
            </View>

            <View style={styles.kvPill}>
              <Text style={styles.kvLabel}>Score</Text>
              <Text style={styles.kvValue}>{score}</Text>
            </View>

            <View style={styles.kvPill}>
              <Text style={styles.kvLabel}>Best</Text>
              <Text style={styles.kvValue}>{best}</Text>
            </View>

            {/* Hearts in two rows (3 up + 3 down) */}
            <HeartsSplit halves={heartsHalves} size={18} />
          </View>
        </View>
      </View>

      {/* Repeat prompt */}
      <View style={styles.subHeader}>
        <Pressable onPress={sayAgain} style={styles.say}>
          <Text style={styles.sayTxt}>🔊 Say again</Text>
        </Pressable>
      </View>

      {/* Timer bar */}
      <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
        <View style={styles.timerWrap}>
          <Animated.View style={[styles.timerFill, { width: timerWidth }]} />
        </View>
      </View>

      {/* Playfield */}
      <View style={styles.field}>
        {enemiesRef.current.map((e) => {
          const sY = rowStartY[e.row];
          const eY = rowEndY[e.row];
          const translateY = e.anim.interpolate({
            inputRange: [0, 1],
            outputRange: [sY, eY],
          });
          return (
            <AnimatedPressable
              key={e.id}
              onPressIn={() => onEnemyTap(e)}
              hitSlop={20}
              style={[
                styles.enemy,
                {
                  transform: [
                    { translateX: e.x - ENEMY_SIZE / 2 },
                    { translateY },
                  ],
                  borderColor: e.hit ? COLORS.yellow : COLORS.teal,
                },
              ]}
            >
              <Text style={styles.enemyTxt}>{e.letter}</Text>
            </AnimatedPressable>
          );
        })}

        {/* Hero */}
        <View style={[styles.hero, { left: hero.x - 34, top: hero.y }]}>
          <Animated.View
            style={[
              styles.shield,
              {
                opacity: shieldPulse,
                transform: [
                  {
                    scale: shieldPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1.15],
                    }),
                  },
                ],
              },
            ]}
          />
          <Text style={{ fontSize: 40 }}>🦸</Text>
        </View>

        {/* Lightning line */}
        {zap && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View
              style={{
                position: "absolute",
                left: Math.min(zap.x1, zap.x2),
                top: Math.min(zap.y1, zap.y2),
                width: Math.max(2, Math.hypot(zap.x2 - zap.x1, zap.y2 - zap.y1)),
                height: 3,
                backgroundColor: COLORS.yellow,
                transform: [
                  { rotateZ: Math.atan2(zap.y2 - zap.y1, zap.x2 - zap.x1) + "rad" },
                ],
                shadowColor: COLORS.yellow,
                shadowOpacity: 0.9,
                shadowRadius: 6,
              }}
            />
          </View>
        )}

        {/* Star burst on correct */}
        {starBurst && (
          <StarBurst x={starBurst.x} y={starBurst.y} onDone={() => setStarBurst(null)} />
        )}
      </View>

      {/* Confetti */}
      {showConfetti && (
        <View style={StyleSheet.absoluteFill}>
          <ConfettiBurst count={24} duration={1000} />
        </View>
      )}

      {/* Low time warning overlay */}
      <TimerWarning show={lowTime && !isEnd} />

      {/* Heart pop overlay */}
      {heartPop && (
        <HeartPop x={heartPop.x} y={heartPop.y} onDone={() => setHeartPop(null)} />
      )}

      {/* End screen */}
      {isEnd && (
        <View style={styles.endOverlay}>
          <View style={styles.endCard}>
            <Text style={styles.endTitle}>Level Complete!</Text>
            <Text style={styles.endScore}>Score: {score}</Text>
            <View style={{ flexDirection: "row", gap: 6, marginVertical: 8 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Text key={i} style={{ fontSize: 28 }}>
                  {i < finalStars ? "⭐" : "☆"}
                </Text>
              ))}
            </View>
            <View style={{ height: 12 }} />
            <Pressable onPress={restart} style={styles.primaryBtn}>
              <Text style={styles.primaryTxt}>Play Again</Text>
            </Pressable>
            <View style={{ height: 8 }} />
            <Pressable onPress={() => router.back()} style={styles.secondaryBtn}>
              <Text style={styles.secondaryTxt}>Back</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: 12, paddingTop: 6, gap: 6 },
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.teal,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  hSmall: { color: COLORS.text, fontSize: 12 },

  // Target row — no wrapping
  targetRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "nowrap",
  },
  hTitleLabel: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.navy,
    includeFontPadding: false,
  },
  hTitleValue: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.teal,
    includeFontPadding: false,
  },
  hSubDot: { color: COLORS.text, fontSize: 12, marginHorizontal: 2 },
  hSub: { fontSize: 12, color: COLORS.text },

  badgesRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  kvPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  kvLabel: { color: COLORS.text, fontSize: 10 },
  kvValue: { color: COLORS.navy, fontWeight: "900", fontSize: 14 },

  subHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 10,
  },
  say: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: COLORS.yellow,
    borderWidth: 1,
    borderColor: "#E0C200",
  },
  sayTxt: { fontWeight: "900", color: COLORS.navy },

  timerWrap: {
    height: 12,
    borderRadius: 8,
    backgroundColor: "#00000012",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timerFill: { height: "100%", backgroundColor: COLORS.teal },

  field: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  enemy: {
    position: "absolute",
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: COLORS.teal,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  enemyTxt: { color: COLORS.navy, fontSize: 30, fontWeight: "900" },
  hero: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: COLORS.navy,
    borderWidth: 3,
    borderColor: COLORS.teal,
    justifyContent: "center",
    alignItems: "center",
  },
  shield: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: "#60a5fa33",
  },

  endOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000066",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  endCard: {
    width: "90%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.teal,
    padding: 16,
    alignItems: "center",
  },
  endTitle: { fontSize: 24, fontWeight: "900", color: COLORS.navy },
  endScore: { fontSize: 18, color: COLORS.text, marginTop: 6 },

  primaryBtn: {
    backgroundColor: COLORS.teal,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
    alignItems: "center",
  },
  primaryTxt: { fontWeight: "900", color: COLORS.navy },
  secondaryBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
    alignItems: "center",
  },
  secondaryTxt: { color: COLORS.navy, fontWeight: "900" },
});
