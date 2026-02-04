import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Modal } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../../constants/colors';
import { LETTERS, CONFUSIONS } from '../../../constants/letters';
import { awardStars, setConfusionScore } from '../../../lib/progress';
import HintButton from '../../../components/HintButton';
import { speak } from '../../../lib/tts';
import ConfettiBurst from '../../../components/ConfettiBurst';

const ROUNDS = 6;
const OPTIONS_COUNT = 8;

const PRAISES = [
  'Great job!', 'Awesome!', 'Well done!', 'Super!',
  'Fantastic!', 'You did it!', 'Brilliant!', 'Nice work!', 'Yay!', 'Perfect!'
];
const ENCOURAGE = [
  'Almost! Try again.', 'Close one, try again.', 'Let’s try once more.',
  'You can do it!', 'Keep going!'
];

function choose<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomLetterSymbol() {
  const L = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  return Math.random() < 0.5 ? L.uc : L.lc;
}

function buildOptions(targetUC: string) {
  const uc = targetUC;
  const lc = uc.toLowerCase();
  const target = Math.random() < 0.5 ? uc : lc;

  const pool = new Set<string>();
  const conf = CONFUSIONS[target] ?? [];
  conf.forEach(c => { if (c !== target) pool.add(c); });

  while (pool.size < OPTIONS_COUNT - 1) {
    const sym = randomLetterSymbol();
    if (sym !== target) pool.add(sym);
  }

  const distractors = Array.from(pool).slice(0, OPTIONS_COUNT - 1);
  const all = [...distractors, target].sort(() => Math.random() - 0.5);
  const correctIndex = all.indexOf(target);
  return { target, options: all, correctIndex };
}

export default function Recognition() {
  const { letter } = useLocalSearchParams<{ letter: string }>();
  const uc = String(letter || 'A');
  const lc = uc.toLowerCase();

  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [{ target, options, correctIndex }, setQ] = useState(buildOptions(uc));

  const hintScale = useMemo(() => new Animated.Value(1), []);
  const doHint = () => {
    Animated.sequence([
      Animated.timing(hintScale, { toValue: 1.12, duration: 140, useNativeDriver: true }),
      Animated.timing(hintScale, { toValue: 1.0, duration: 180, useNativeDriver: true }),
    ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const pickedScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const what = target === uc ? `capital ${uc}` : `small ${lc}`;
    speak(`Tap ${what}`);
  }, [target, uc, lc]);

  const [locked, setLocked] = useState(false);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [finalStars, setFinalStars] = useState(0);
  const [finalScore, setFinalScore] = useState(0);

  const nextRound = async (ok: boolean) => {
    if (round >= ROUNDS) {
      const total = score + (ok ? 1 : 0);
      const stars = total >= 5 ? 3 : total >= 4 ? 2 : total >= 3 ? 1 : 0;

      await awardStars(lc, 'recogStars', stars);
      const pct = Math.round((total / ROUNDS) * 100);
      await setConfusionScore(lc, pct);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      speak('Excellent work! Recognition complete!');
      setFinalStars(stars);
      setFinalScore(total);
      setShowPopup(true);
      return;
    }

    setRound(r => r + 1);
    setQ(buildOptions(uc));
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
        Animated.timing(pickedScale, { toValue: 1.12, duration: 120, useNativeDriver: true }),
        Animated.spring(pickedScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();

      setShowConfetti(true);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      speak(choose(ENCOURAGE));
    }

    setTimeout(() => {
      nextRound(ok);
    }, 620);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, padding: 16 }}>
      <Stack.Screen options={{ title: 'Recognition' }} />

      {/* 🏠 Home Button — top right */}
      <View style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <Pressable
          onPress={() => router.replace('/training')}
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: '#fff',
            borderWidth: 2,
            borderColor: COLORS.navy,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 3,
          }}
        >
          <Ionicons name="home-outline" size={26} color={COLORS.navy} />
        </Pressable>
      </View>

      <Text style={{ color: COLORS.text, marginBottom: 8 }}>
        Round {round} of {ROUNDS}
      </Text>

      <Text style={{ fontSize: 22, fontWeight: '900', color: COLORS.navy, marginBottom: 12 }}>
        Tap the letter: <Text style={{ color: COLORS.teal }}>{target}</Text>
      </Text>

      {/* grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
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
              style={{
                width: '47%',
                marginBottom: 16,
                transform: [{ scale: scaleForThis as any }],
              }}
            >
              <Pressable
                disabled={locked}
                onPress={() => onPick(idx)}
                style={{
                  paddingVertical: 28,
                  borderRadius: 16,
                  backgroundColor: bg,
                  borderWidth: 1,
                  borderColor: border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 44, fontWeight: '900', color: COLORS.navy }}>{opt}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {/* Hint Button below letters */}
      <HintButton onPress={doHint} />

      <Text style={{ textAlign: 'center', marginTop: 12, color: COLORS.text }}>
        Tip: Try without hints to earn more ⭐
      </Text>

      {showConfetti && (
        <ConfettiBurst count={22} duration={1100} onDone={() => setShowConfetti(false)} />
      )}

      {/* Popup Modal after finish */}
      <Modal visible={showPopup} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: 'white',
              padding: 24,
              borderRadius: 20,
              alignItems: 'center',
              width: '80%',
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: '900', color: COLORS.navy, marginBottom: 6 }}>
              🎉 Excellent Work!
            </Text>
            <Text style={{ fontSize: 16, color: COLORS.text, marginBottom: 12, textAlign: 'center' }}>
              You completed all {ROUNDS} rounds successfully!
            </Text>
            <Text style={{ fontSize: 18, marginBottom: 6 }}>
              ⭐ Stars: {'★'.repeat(finalStars).padEnd(3, '☆')}
            </Text>
            <Text style={{ fontSize: 16, marginBottom: 20 }}>
              Score: {finalScore}/{ROUNDS}
            </Text>

            <Pressable
              onPress={() => {
                setShowPopup(false);
                router.push({ pathname: '/training/[letter]/free-draw', params: { letter: uc } } as any);
              }}
              style={{
                backgroundColor: COLORS.teal,
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Go to Free Draw ➡️</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setShowPopup(false);
                router.replace('/training');
              }}
              style={{
                marginTop: 10,
              }}
            >
              <Text style={{ color: COLORS.navy, fontWeight: '600' }}>🏠 Back to Home</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
