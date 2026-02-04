// app/training/common/puzzle.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Alert } from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { COLORS } from '../../../constants/colors';
import { LETTERS, CONFUSIONS } from '../../../constants/letters';
import { PUZZLES } from '../../../constants/puzzleWords';
import ConfettiBurst from '../../../components/ConfettiBurst';
import { speak } from '../../../lib/tts';
// import { awardStars } from '../../../lib/progress'; // add later if you want

const ROUNDS = 10;
const OPTIONS = 4;

const PRAISES = ['Great job!', 'Awesome!', 'Well done!', 'Super!', 'Fantastic!', 'You did it!'];
const ENCOURAGE = ['Almost! Try again.', 'Close one, try again.', 'Let’s try once more.', 'Keep going!'];

function choose<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomLetterSymbol() {
  const L = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  return Math.random() < 0.5 ? L.uc : L.lc;
}

/** Speak: say the word, then spell it, then instruction. */
async function speakRoundIntro(word: string, spelled: string) {
  // Keep it simple + toddler-friendly
  await speak(`${word}.`);
  // small gap
  setTimeout(async () => {
    await speak(`Spell: ${spelled}.`);
    setTimeout(() => {
      speak('Find the missing letter.');
    }, 250);
  }, 250);
}

/** Build one round:
 * returns word, shown(with _), target(missing), options, correctIndex, spelled string
 */
function buildRound() {
  const item = choose(PUZZLES);
  const chars = item.word.split('');
  const idx = item.missingIndex;

  // target (respect forced case)
  let target = chars[idx];
  if (item.forceCase === 'uc') target = target.toUpperCase();
  if (item.forceCase === 'lc') target = target.toLowerCase();

  const shown = chars.map((ch, i) => (i === idx ? '_' : ch)).join('');

  // Spelled-out version: toddler-friendly pacing
  // Use lowercase for clarity unless you forced uppercase
  const forSpell = item.forceCase === 'uc' ? item.word.toUpperCase() : item.word.toLowerCase();
  const spelled = forSpell.split('').join(' - '); // "b - a - l - l"

  // Options pool using confusions first
  const pool = new Set<string>();
  const conf = CONFUSIONS[target] ?? [];
  conf.forEach(c => { if (c.length === 1 && c !== target) pool.add(c); });

  while (pool.size < OPTIONS - 1) {
    const sym = randomLetterSymbol();
    if (sym.length === 1 && sym !== target) pool.add(sym);
  }

  const distractors = Array.from(pool).slice(0, OPTIONS - 1);
  const all = [...distractors, target].sort(() => Math.random() - 0.5);
  const correctIndex = all.indexOf(target);

  return { word: item.word, shown, target, options: all, correctIndex, spelled };
}

export default function LetterPuzzle() {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [{ word, shown, target, options, correctIndex, spelled }, setQ] = useState(buildRound());

  const [locked, setLocked] = useState(false);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);

  const hintScale = useMemo(() => new Animated.Value(1), []);
  const pickedScale = useRef(new Animated.Value(1)).current;

  const [showConfetti, setShowConfetti] = useState(false);

  // Speak sequence each time a new word (round) appears
  useEffect(() => {
    speakRoundIntro(word, spelled);
  }, [word, spelled]);

  const nextRound = async (ok: boolean) => {
    if (round >= ROUNDS) {
      const total = score + (ok ? 1 : 0);
      // const stars = total >= 9 ? 3 : total >= 7 ? 2 : total >= 5 ? 1 : 0;
      // await awardStars('_common', 'puzzleStars', stars);

      Alert.alert('Great work!', `Score: ${total}/${ROUNDS}`, [{ text: 'Done' }]);
      return;
    }
    setRound(r => r + 1);
    setQ(buildRound());
    setPickedIndex(null);
    setWasCorrect(null);
    setLocked(false);
  };

  const onPick = async (idx: number) => {
    if (locked) return;
    setLocked(true);
    setPickedIndex(idx);

    const ok = idx === correctIndex;
    setWasCorrect(ok);

    if (ok) {
      setScore(s => s + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      speak(choose(PRAISES));

      pickedScale.setValue(1);
      Animated.sequence([
        Animated.timing(pickedScale, { toValue: 1.1, duration: 120, useNativeDriver: true }),
        Animated.spring(pickedScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();

      setShowConfetti(true);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      speak(choose(ENCOURAGE));
    }

    setTimeout(() => nextRound(ok), 600);
  };

  const replayPrompt = () => speakRoundIntro(word, spelled);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, padding: 16 }}>
      <Stack.Screen options={{ title: 'Letter Puzzle 🧩' }} />

      <Text style={{ color: COLORS.text, marginBottom: 6 }}>
        Round {round} of {ROUNDS}
      </Text>

      {/* Word + instruction */}
      <View style={{ alignItems: 'center', marginVertical: 8 }}>
        <Text
          style={{
            fontSize: 44, fontWeight: '900', color: COLORS.navy, letterSpacing: 1.5,
            backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8,
            borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
          }}
        >
          {shown}
        </Text>
        <Text style={{ marginTop: 8, color: COLORS.text }}>
          “{word.toLowerCase()}” — {spelled}
        </Text>

        {/* Hear again */}
        <Pressable
          onPress={replayPrompt}
          style={{
            marginTop: 10,
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: COLORS.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text>🔊 Hear again</Text>
        </Pressable>

        <Text style={{ marginTop: 8, color: COLORS.text }}>Choose the missing letter</Text>
      </View>

      {/* Options */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 12 }}>
        {options.map((opt, idx) => {
          const isCorrect = idx === correctIndex;
          const isPicked = idx === pickedIndex;

          const bg =
            isPicked && wasCorrect === true ? '#DCFCE7' :
            isPicked && wasCorrect === false ? '#FEE2E2' :
            COLORS.card;

          const border =
            isPicked && wasCorrect === true ? '#22c55e' :
            isPicked && wasCorrect === false ? '#ef4444' :
            COLORS.border;

          const scaleForThis =
            isPicked && wasCorrect === true ? pickedScale :
            isCorrect ? hintScale : 1;

          return (
            <Animated.View
              key={idx}
              style={{ width: '48%', marginBottom: 12, transform: [{ scale: scaleForThis as any }] }}
            >
              <Pressable
                disabled={locked}
                onPress={() => onPick(idx)}
                style={{
                  paddingVertical: 16,
                  borderRadius: 14,
                  backgroundColor: bg,
                  borderWidth: 1,
                  borderColor: border,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOpacity: 0.05,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <Text style={{ fontSize: 38, fontWeight: '900', color: COLORS.navy }}>{opt}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <Text style={{ textAlign: 'center', marginTop: 8, color: COLORS.text }}>
        Tip: Listen to the spelling to help you spot the missing letter!
      </Text>

      {showConfetti && (
        <ConfettiBurst count={22} duration={1100} onDone={() => setShowConfetti(false)} />
      )}
    </View>
  );
}
