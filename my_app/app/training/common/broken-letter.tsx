// app/training/common/broken-letter.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../../constants/colors';
import { LETTERS } from '../../../constants/letters';
import { speak } from '../../../lib/tts';

// ==== BrokenLetterView (letter with part masked) ====
function BrokenLetterView({
  letter,
  mask,
  size = 240,
}: {
  letter: string;
  mask: 'top' | 'bottom' | 'left' | 'right' | 'middle';
  size?: number;
}) {
  const rects = {
    top:    { left: 0, top: 0,           width: size,        height: size * 0.42 },
    bottom: { left: 0, top: size * 0.58, width: size,        height: size * 0.42 },
    left:   { left: 0, top: 0,           width: size * 0.38, height: size },
    right:  { left: size * 0.62, top: 0, width: size * 0.38, height: size },
    middle: { left: 0, top: size * 0.36, width: size,        height: size * 0.28 },
  } as const;

  const maskRect = rects[mask];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: COLORS.navy,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Text
        style={{
          fontSize: Math.floor(size * 0.72),
          fontWeight: '900',
          color: COLORS.navy,
          includeFontPadding: false,
          textAlignVertical: 'center' as any,
        }}
      >
        {letter}
      </Text>

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: maskRect.left,
          top: maskRect.top,
          width: maskRect.width,
          height: maskRect.height,
          backgroundColor: '#fff',
        }}
      />
    </View>
  );
}

// ==== helpers ====
const MASKS: Array<'top' | 'bottom' | 'left' | 'right' | 'middle'> = [
  'top',
  'bottom',
  'left',
  'right',
  'middle',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const TOTAL_ROUNDS = 20;
const OPTIONS_COUNT = 9; // 3x3 grid

export default function BrokenLetterPuzzle() {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [locked, setLocked] = useState(false);

  // screen width to size option cards dynamically
  const screenWidth = Dimensions.get('window').width;
  const cardSize = (screenWidth - 16 * 2 - 12 * 2) / 3; // 3 per row with margins

  const [{ target, options, correctIndex, mask }, setQ] = useState(makeQuestion());

  function makeQuestion() {
    const target = LETTERS[Math.floor(Math.random() * LETTERS.length)].uc;
    const mask = pick(MASKS);

    const pool = new Set<string>([target]);
    while (pool.size < OPTIONS_COUNT) {
      pool.add(LETTERS[Math.floor(Math.random() * LETTERS.length)].uc);
    }
    const all = Array.from(pool).sort(() => Math.random() - 0.5);
    const correctIndex = all.indexOf(target);

    return { target, options: all, correctIndex, mask };
  }

  // ✅ Speak instruction only on the first round
  useEffect(() => {
    if (round === 1) {
      speak('the letter is broken. Find the letter.');
    }
  }, [round]);

  const pickOption = (idx: number) => {
    if (locked) return;
    setLocked(true);

    const ok = idx === correctIndex;
    if (ok) {
      setScore(s => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      speak('Great!');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      speak('Try again');
    }

    setTimeout(() => {
      if (round >= TOTAL_ROUNDS) {
        Alert.alert('Done!', `Score: ${score + (ok ? 1 : 0)}/${TOTAL_ROUNDS}`);
      } else {
        setRound(r => r + 1);
        setQ(makeQuestion());
        setLocked(false);
      }
    }, 600);
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: 'Broken Letter Puzzle' }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text }}>
          Round {round} of {TOTAL_ROUNDS}
        </Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.navy }}>
          Score: {score}
        </Text>
      </View>

      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <BrokenLetterView letter={target} mask={mask} />
      </View>

      <Text style={{ fontSize: 16, color: COLORS.text, marginBottom: 12 }}>
        Tap the correct letter:
      </Text>

      {/* 3x3 Grid of 9 options */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {options.map((opt, idx) => (
          <Pressable
            key={idx}
            onPress={() => pickOption(idx)}
            style={{
              width: cardSize,
              height: cardSize,
              marginBottom: 12,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: COLORS.border,
              backgroundColor: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: locked ? 0.9 : 1,
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: '900', color: COLORS.navy }}>
              {opt}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
