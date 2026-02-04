// app/games/letter-puzzle.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  StyleSheet,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "../../constants/colors";
import { speak } from "../../lib/tts";
import ConfettiBurst from "../../components/ConfettiBurst";

// ---------- tuning ----------
const ROUNDS = 10;
const TILE_SIZE = 76;
const SLOT_W = 84;
const SLOT_H = 84;
const PRAISES = ["Great!", "Awesome!", "Super!", "Well done!", "Nice!"];
const ROWS = 2;
const COLS = 4;
const TILE_GAP = 12;        // gap between tiles (both axes)
const TRAY_SIDE_PAD = 12;   // left/right padding inside tray
const TRAY_BOTTOM_PAD = 12; // bottom pad inside tray

// Word → Emoji (visual cue)
const WORD_EMOJI: Record<string, string> = {
  CAT: "🐱",
  DOG: "🐶",
  HAT: "🎩",
  SUN: "🌞",
  BUS: "🚌",
  MAP: "🗺️",
  BED: "🛏️",
  FOX: "🦊",
  PEN: "🖊️",
  BAT: "🦇",
};

// Small starter word bank
const BANK = [
  { word: "CAT", missing: 0 },
  { word: "DOG", missing: 1 },
  { word: "HAT", missing: 2 },
  { word: "SUN", missing: 1 },
  { word: "BUS", missing: 2 },
  { word: "MAP", missing: 1 },
  { word: "BED", missing: 0 },
  { word: "FOX", missing: 2 },
  { word: "PEN", missing: 1 },
  { word: "BAT", missing: 0 },
];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

type Tile = {
  id: string;
  label: string;
  pos: Animated.ValueXY;
  home: { x: number; y: number };
};

export default function LetterPuzzle() {
  const [round, setRound] = useState(1);
  const [showConfetti, setShowConfetti] = useState(false);

  const [targetWord, setTargetWord] = useState("CAT");
  const [missingIndex, setMissingIndex] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);

  const [score, setScore] = useState(0);

  // emoji for current word
  const [wordEmoji, setWordEmoji] = useState<string>(WORD_EMOJI["CAT"] || "🧩");

  // slot ref for measuring (screen coords)
  const slotRef = useRef<View>(null);

  const tilesRef = useRef<Tile[]>([]);
  const arenaWidthRef = useRef(0);
  const onArenaLayout = (e: LayoutChangeEvent) => {
    arenaWidthRef.current = e.nativeEvent.layout.width;
  };

  const sayInstruction = (w = targetWord, mi = missingIndex) => {
    const spelled = w.split("").join(", ");
    speak(`Drag the missing letter into the box. The word is ${w}. Spelling: ${spelled}.`);
  };

  // Build one puzzle round
  const buildRound = () => {
    const item = BANK[(round - 1) % BANK.length];
    const correct = item.word[item.missing];

    // Build 7 unique distractors (not equal to correct)
    const pool = LETTERS.filter((L) => L !== correct);
    const distractors: string[] = [];
    while (distractors.length < 7) {
      const d = pick(pool);
      if (!distractors.includes(d)) distractors.push(d);
    }

    // shuffle with 1 correct + 7 distractors
    const opts = [correct, ...distractors].sort(() => Math.random() - 0.5);

    setTargetWord(item.word);
    setMissingIndex(item.missing);
    setChoices(opts);
    setWordEmoji(WORD_EMOJI[item.word] || "🧩");

    // ---- position tiles in two rows (ROWS x COLS), centered in tray ----
    // total width of a row block
    const rowBlockWidth = COLS * TILE_SIZE + (COLS - 1) * TILE_GAP;
    const trayInnerWidth = Math.max(0, arenaWidthRef.current - TRAY_SIDE_PAD * 2);
    const startX =
      TRAY_SIDE_PAD + Math.max(0, (trayInnerWidth - rowBlockWidth) / 2); // center horizontally

    // two rows stacked upward from tray bottom (tray is absolute and pinned bottom)
    // y is negative because the tray children use absolute translate from bottom
    const row0Y = -(TRAY_BOTTOM_PAD + TILE_SIZE); // bottom row
    const row1Y = row0Y - (TILE_SIZE + TILE_GAP); // row above

    const homes: { x: number; y: number }[] = [];
    for (let i = 0; i < opts.length; i++) {
      const r = Math.floor(i / COLS); // 0 or 1
      const c = i % COLS;             // 0..3
      const x = startX + c * (TILE_SIZE + TILE_GAP);
      const y = (r === 0 ? row0Y : row1Y);
      homes.push({ x, y });
    }

    tilesRef.current = opts.map((label, i) => {
      const home = { x: homes[i].x, y: homes[i].y };
      return {
        id: `${label}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        label,
        pos: new Animated.ValueXY(home),
        home,
      };
    });

    // 🗣️ Speak instruction
    sayInstruction(item.word, item.missing);
  };

  useEffect(() => {
    buildRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // If arena width becomes known after first render, (re)build once
  useEffect(() => {
    if (arenaWidthRef.current > 0 && tilesRef.current.length === 0) {
      buildRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arenaWidthRef.current]);

  // Drop using screen coords for both tile and slot
  const handleDrop = (
    gx: number,
    gy: number,
    label: string,
    snapBack: () => void
  ) => {
    if (!slotRef.current) return snapBack();

    slotRef.current.measureInWindow((sx, sy, sw, sh) => {
      const inside = gx >= sx && gx <= sx + sw && gy >= sy && gy <= sy + sh;

      if (!inside) {
        snapBack();
        return;
      }

      const correct = label === targetWord[missingIndex];

      if (correct) {
        setScore((s) => s + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        speak(pick(PRAISES));
        speak(`${targetWord}.`);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 700);
        setTimeout(() => next(), 600);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        // supportive + reveal (no score penalty)
        speak(
          `Oops. The word is ${targetWord}. The missing letter was ${targetWord[missingIndex]}.`
        );
        snapBack();
        setTimeout(() => next(), 800);
      }
    });
  };

  const next = () => {
    if (round >= ROUNDS) {
      speak(`Nice work! You scored ${score} out of ${ROUNDS}.`);
      router.back();
      return;
    }
    setRound((r) => r + 1);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: "Letter Puzzle" }} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text }}>Round {round} / {ROUNDS}</Text>
          <Text style={styles.title}>Drag the missing letter into the box</Text>
        </View>

        {/* Score pill */}
        <View style={styles.scorePill}>
          <Text style={styles.scoreText}>Score {score}</Text>
        </View>

        {/* Hear again (speaker) */}
        <Pressable
          onPress={() => sayInstruction()}
          hitSlop={10}
          style={styles.speakerBtn}
        >
          <Ionicons name="volume-high" size={24} color={COLORS.navy} />
        </Pressable>
      </View>

      {/* Castle / Arena */}
      <View style={styles.stage} onLayout={onArenaLayout}>
        {/* Castle header visual */}
        <View style={styles.castleTop}>
          <Text style={{ fontSize: 40 }}>🏰</Text>
        </View>

        {/* Word + Emoji Row */}
        <View style={styles.wordHintRow}>
          <Text style={styles.wordHintText}>{targetWord}</Text>
          <Text style={styles.wordHintEmoji}>{wordEmoji}</Text>
        </View>

        {/* Puzzle row */}
        <View style={styles.puzzleRow}>
          {targetWord.split("").map((ch, idx) => {
            if (idx === missingIndex) {
              return (
                <View key={`slot-${idx}`} style={styles.slotWrap}>
                  <View ref={slotRef} style={styles.slot} />
                </View>
              );
            }
            return (
              <View key={`ch-${idx}`} style={styles.letterBox}>
                <Text style={styles.letterText}>{ch}</Text>
              </View>
            );
          })}
        </View>

        {/* Tiles tray (absolute, pinned to bottom) */}
        <View style={styles.tray} pointerEvents="box-none">
          {tilesRef.current.map((tile) => (
            <Tile key={tile.id} tile={tile} onDrop={handleDrop} />
          ))}
        </View>

        {/* Confetti */}
        {showConfetti && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <ConfettiBurst count={22} duration={900} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function Tile({
  tile,
  onDrop,
}: {
  tile: Tile;
  onDrop: (gx: number, gy: number, label: string, snapBack: () => void) => void;
}) {
  const snapBack = () => {
    Animated.spring(tile.pos, {
      toValue: tile.home,
      useNativeDriver: false,
      bounciness: 8,
    }).start();
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Haptics.selectionAsync();
        tile.pos.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: tile.pos.x, dy: tile.pos.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_e, g) => {
        tile.pos.flattenOffset();
        onDrop(g.moveX, g.moveY, tile.label, snapBack); // screen coords
      },
      onPanResponderTerminate: () => snapBack(),
    })
  ).current;

  return (
    <Animated.View
      {...(pan.panHandlers as any)}
      style={[styles.tile, { transform: tile.pos.getTranslateTransform() }]}
    >
      <View style={styles.tileFace}>
        <Text style={styles.tileText}>{tile.label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: "900", color: COLORS.navy, marginTop: 2 },
  scorePill: {
    marginLeft: "auto",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  scoreText: { fontWeight: "900", color: COLORS.navy },
  speakerBtn: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  stage: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 12,
    position: "relative",
    overflow: "hidden",
  },
  castleTop: {
    height: 80,
    borderRadius: 14,
    backgroundColor: "#F6F0D6",
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  wordHintRow: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  wordHintText: { fontSize: 22, fontWeight: "900", color: COLORS.navy },
  wordHintEmoji: { fontSize: 26 },
  puzzleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginVertical: 12,
  },
  letterBox: {
    width: SLOT_W,
    height: SLOT_H,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 3,
    borderColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  letterText: { color: COLORS.navy, fontSize: 34, fontWeight: "900" },
  slotWrap: { width: SLOT_W, height: SLOT_H, alignItems: "center", justifyContent: "center" },
  slot: {
    width: SLOT_W,
    height: SLOT_H,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: COLORS.teal,
  },
  tray: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    // Height for two rows + inner spacing
    height: TILE_SIZE * 2 + TILE_GAP + TRAY_BOTTOM_PAD + 6,
  },
  tile: {
    position: "absolute",
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  tileFace: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: COLORS.yellow,
    borderWidth: 3,
    borderColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: { color: COLORS.navy, fontSize: 32, fontWeight: "900" },
});
