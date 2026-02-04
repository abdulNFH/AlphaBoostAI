// app/training/common/picture-match.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Alert, Animated, Dimensions, InteractionManager } from "react-native";
import { Stack, router } from "expo-router";
import * as Haptics from "expo-haptics";

import { COLORS } from "../../../constants/colors";
import { awardStars } from "../../../lib/progress";
import { speak } from "../../../lib/tts";

// mapping letter -> emoji + word
const LETTER_PICS: Record<string, { emoji: string; word: string }> = {
  A: { emoji: "🍎", word: "Apple" },
  B: { emoji: "⚽", word: "Ball" },
  C: { emoji: "🐱", word: "Cat" },
  D: { emoji: "🐶", word: "Dog" },
  E: { emoji: "🥚", word: "Egg" },
  F: { emoji: "🐟", word: "Fish" },
  G: { emoji: "🍇", word: "Grapes" },
  H: { emoji: "🏠", word: "House" },
  I: { emoji: "🍦", word: "Ice Cream" },
  J: { emoji: "🤹", word: "Juggler" },
  // ➕ add more as needed
};

const ROUNDS = 10;
const OPTIONS = 6;

/* ---------- MiniConfetti (no useInsertionEffect; deferred mounts) ---------- */
function MiniConfetti({
  visible,
  duration = 1000,
  onDone,
}: {
  visible: boolean;
  duration?: number;
  onDone?: () => void;
}) {
  const { width: W, height: H } = Dimensions.get("window");
  const pieces = 18;

  // Create animated values once (stable across renders)
  const anims = useMemo(
    () =>
      Array.from({ length: pieces }).map(() => ({
        y: new Animated.Value(0),
        x: new Animated.Value(0),
        o: new Animated.Value(1),
        r: new Animated.Value(0),
      })),
    []
  );

  useEffect(() => {
    if (!visible) return;
    // Defer animations until after interactions/layout to avoid warning
    const task = InteractionManager.runAfterInteractions(() => {
      const animations = anims.map(({ y, x, o, r }) => {
        const dx = Math.random() * W * 0.8 - W * 0.4;
        const dy = -(Math.random() * H * 0.35 + H * 0.25);
        const rot = Math.random() * 2 * Math.PI;

        y.setValue(0);
        x.setValue(0);
        o.setValue(1);
        r.setValue(0);

        return Animated.parallel([
          Animated.timing(y, { toValue: dy, duration, useNativeDriver: true }),
          Animated.timing(x, { toValue: dx, duration, useNativeDriver: true }),
          Animated.timing(o, { toValue: 0, duration, useNativeDriver: true }),
          Animated.timing(r, { toValue: rot, duration, useNativeDriver: true }),
        ]);
      });

      Animated.stagger(12, animations).start(({ finished }) => {
        if (finished && onDone) {
          // Also defer setState in parent
          InteractionManager.runAfterInteractions(onDone);
        }
      });
    });

    return () => task.cancel?.();
  }, [visible, duration, anims, W, H, onDone]);

  if (!visible) return null;

  const confettiChars = ["🎉", "✨", "💫", "🎈", "🌟", "🎊", "⭐"];

  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      {anims.map(({ y, x, o, r }, idx) => {
        const startX = W / 2;
        const startY = H * 0.25;
        const emoji = confettiChars[idx % confettiChars.length];
        return (
          <Animated.Text
            key={idx}
            style={{
              position: "absolute",
              left: startX,
              top: startY,
              fontSize: 22 + (idx % 3) * 6,
              transform: [
                { translateX: x },
                { translateY: y },
                { rotate: r.interpolate({ inputRange: [0, Math.PI * 2], outputRange: ["0rad", `${Math.PI * 2}rad`] }) },
              ],
              opacity: o,
            }}
          >
            {emoji}
          </Animated.Text>
        );
      })}
    </View>
  );
}
/* ------------------------------------------------------------------------- */

function randomLetters(n: number, include: string) {
  const all = Object.keys(LETTER_PICS);
  const set = new Set([include]);
  while (set.size < n) {
    const pick = all[Math.floor(Math.random() * all.length)];
    set.add(pick);
  }
  return Array.from(set).sort(() => Math.random() - 0.5);
}

export default function PictureMatch() {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const [target, setTarget] = useState("A");
  const [options, setOptions] = useState<string[]>([]);

  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  const rafRef = useRef<number | null>(null);

  const newRound = () => {
    const letters = Object.keys(LETTER_PICS);
    const next = letters[Math.floor(Math.random() * letters.length)];
    setTarget(next);
    setOptions(randomLetters(OPTIONS, next));
    setLocked(false);
    setPicked(null);
    // Defer TTS until after interactions
    InteractionManager.runAfterInteractions(() => speak(`Find the picture for ${next}`));
  };

  useEffect(() => {
    newRound();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const nextStep = async (ok: boolean) => {
    if (round >= ROUNDS) {
      const total = score + (ok ? 1 : 0);
      const stars = total >= 8 ? 3 : total >= 6 ? 2 : total >= 4 ? 1 : 0;

      // Run storage + alerts after interactions
      InteractionManager.runAfterInteractions(async () => {
        await awardStars("common", "pictureStars", stars);
        Alert.alert(
          "Picture Match Complete",
          `Score: ${total}/${ROUNDS}\nStars: ${"★".repeat(stars).padEnd(3, "☆")}`,
          [{ text: "Back to Training", onPress: () => router.push("/training") }]
        );
      });
      return;
    }

    // Defer state updates to avoid the warning
    InteractionManager.runAfterInteractions(() => {
      setRound((r) => r + 1);
      newRound();
    });
  };

  const pick = (sym: string) => {
    if (locked) return;
    setLocked(true);
    setPicked(sym);

    const ok = sym === target;
    if (ok) {
      setScore((s) => s + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      InteractionManager.runAfterInteractions(() => speak("Great job!"));
      // mount confetti after interactions (prevents insertion-effect warnings)
      InteractionManager.runAfterInteractions(() => setShowConfetti(true));
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      InteractionManager.runAfterInteractions(() => speak("Try again"));
    }

    // proceed after a short delay
    setTimeout(() => {
      nextStep(ok);
    }, 900);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, padding: 16 }}>
      <Stack.Screen options={{ title: "Picture Match" }} />

      <Text style={{ color: COLORS.text, marginBottom: 6 }}>
        Round {round} of {ROUNDS}
      </Text>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "900",
          color: COLORS.navy,
          marginBottom: 12,
        }}
      >
        Which picture is for <Text style={{ color: COLORS.teal }}>{target}</Text>?
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
        {options.map((sym, idx) => {
          const isPicked = sym === picked;
          const ok = sym === target;

          const bg = isPicked && ok ? "#DCFCE7" : isPicked && !ok ? "#FEE2E2" : COLORS.card;
          const border = isPicked && ok ? "#22c55e" : isPicked && !ok ? "#ef4444" : COLORS.border;

          return (
            <Pressable
              key={idx}
              onPress={() => pick(sym)}
              disabled={locked}
              style={{
                width: "48%",
                marginBottom: 12,
                paddingVertical: 18,
                borderRadius: 16,
                backgroundColor: bg,
                borderWidth: 1,
                borderColor: border,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 48 }}>{LETTER_PICS[sym].emoji}</Text>
              <Text style={{ fontSize: 16, color: COLORS.navy, marginTop: 6 }}>
                {LETTER_PICS[sym].word}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <MiniConfetti
        visible={showConfetti}
        duration={1000}
        onDone={() => InteractionManager.runAfterInteractions(() => setShowConfetti(false))}
      />
    </View>
  );
}
