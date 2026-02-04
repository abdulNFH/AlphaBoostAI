// app/training/common/case-match.tsx
import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, Animated, Easing, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { COLORS } from '../../../constants/colors';
import { speak } from '../../../lib/tts';
import ConfettiBurst from '../../../components/ConfettiBurst';
import { LETTERS } from '../../../constants/letters';

const PRAISES = ['Great!', 'Awesome!', 'Well done!', 'Super!', 'Fantastic!', 'Nice job!'];
const MATCH_EMOJIS = ['🎉', '⭐', '✅', '👏', '🌟', '🥳'];
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

type Card = {
  id: string;
  base: string;
  show: string;
};

const PAIRS = 6;
const FLIP_MS = 280;
const MAX_ROUNDS = 2;
const SCORE_CORRECT = 10;
const SCORE_WRONG = -2;

function makeDeck(): Card[] {
  const chosen = [...LETTERS].sort(() => Math.random() - 0.5).slice(0, PAIRS);
  const cards: Card[] = [];
  for (const L of chosen) {
    cards.push({ id: `${L.uc}-U`, base: L.lc, show: L.uc });
    cards.push({ id: `${L.lc}-L`, base: L.lc, show: L.lc });
  }
  return cards.sort(() => Math.random() - 0.5);
}

export default function CaseMatch() {
  const { width } = useWindowDimensions();

  const [deck, setDeck] = useState<Card[]>(makeDeck());
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [flipped, setFlipped] = useState<string[]>([]);
  const [wrongOpen, setWrongOpen] = useState<Record<string, boolean>>({});
  const [locks, setLocks] = useState(false);

  const [pairsFound, setPairsFound] = useState(0);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // emoji for matched cards
  const [matchEmojiById, setMatchEmojiById] = useState<Record<string, string>>({});

  const flips = useMemo(() => {
    const map: Record<string, Animated.Value> = {};
    for (const c of deck) map[c.id] = new Animated.Value(0);
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.map(c => c.id).join('|')]);

  useEffect(() => {
    speak('Match capital and small letters.');
  }, []);

  const startRound = (nextRound: number) => {
    setOpen({});
    setWrongOpen({});
    setFlipped([]);
    setPairsFound(0);
    setLocks(false);
    setDeck(makeDeck());
    setMatchEmojiById({});
    setRound(nextRound);
  };

  const onHardReset = () => {
    setScore(0);
    startRound(1);
  };

  const onShuffle = () => {
    setOpen({});
    setWrongOpen({});
    setFlipped([]);
    setLocks(false);
    setDeck(makeDeck());
    setMatchEmojiById({});
  };

  const flipTo = (id: string, openSide: boolean) => {
    Animated.timing(flips[id], {
      toValue: openSide ? 1 : 0,
      duration: FLIP_MS,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const handleEndOfRound = () => {
    setShowConfetti(true);
    const r = round;
    const finalOfGame = r >= MAX_ROUNDS;
    setTimeout(() => {
      if (!finalOfGame) {
        Alert.alert(`Round ${r} complete 🎉`, `Score: ${score}`, [
          { text: 'Next round', onPress: () => startRound(r + 1) },
        ]);
      } else {
        Alert.alert('Great matching! 🎉', `All ${MAX_ROUNDS} rounds done.\nFinal score: ${score}`, [
          { text: 'Play again', onPress: onHardReset },
        ]);
      }
    }, 600);
  };

  const byId = (id: string) => deck.find(c => c.id === id)!;

  const tap = (card: Card) => {
    if (locks) return;
    if (open[card.id]) return;
    if (wrongOpen[card.id]) return;
    if (flipped.includes(card.id)) return;

    Haptics.selectionAsync();
    const now = [...flipped, card.id];
    setFlipped(now);
    flipTo(card.id, true);

    if (now.length === 2) {
      setLocks(true);
      const [aId, bId] = now;
      const A = byId(aId);
      const B = byId(bId);
      const ok = A.base === B.base && A.show !== B.show;

      if (ok) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        speak(pick(PRAISES));

        // ✅ Use ONE emoji for both cards
        const emoji = pick(MATCH_EMOJIS);

        setTimeout(() => {
          setOpen(prev => ({ ...prev, [aId]: true, [bId]: true }));
          setMatchEmojiById(prev => ({ ...prev, [aId]: emoji, [bId]: emoji }));
          setFlipped([]);
          setPairsFound(p => {
            const next = p + 1;
            if (next === PAIRS) {
              setScore(s => s + SCORE_CORRECT);
              setLocks(false);
              handleEndOfRound();
            }
            return next;
          });
          setScore(s => s + SCORE_CORRECT);
          setLocks(false);
        }, 200);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        speak('Not a pair. Try again.');
        setScore(s => s + SCORE_WRONG);

        setWrongOpen(prev => ({ ...prev, [aId]: true, [bId]: true }));
        setFlipped([]);
        setTimeout(() => {
          flipTo(aId, false);
          flipTo(bId, false);
          setWrongOpen(prev => {
            const cp = { ...prev };
            delete cp[aId];
            delete cp[bId];
            return cp;
          });
          setLocks(false);
        }, 2000);
      }
    }
  };

  // layout
  const columns = width > 720 ? 4 : 3;
  const gap = 12;
  const sidePadding = 16;
  const totalGap = gap * (columns - 1);
  const tileW = Math.floor((width - sidePadding * 2 - totalGap) / columns);
  const tileH = Math.max(110, Math.floor(tileW * 1.1));

  const onRepeat = () => speak('Match capital and small letters.');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: 'Upper ↔ Lower Match 🔀' }} />

      {/* header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View
          style={{
            padding: 14,
            borderRadius: 16,
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: COLORS.teal,
          }}
        >
          <Text style={{ color: COLORS.text, marginBottom: 6, fontWeight: '700' }}>
            Round {round}/{MAX_ROUNDS} · Score: {score}
          </Text>
          <View style={{ height: 10, backgroundColor: '#e2e8f0', borderRadius: 999 }}>
            <View
              style={{
                width: `${(pairsFound / PAIRS) * 100}%`,
                height: '100%',
                backgroundColor: COLORS.teal,
                borderRadius: 999,
              }}
            />
          </View>
        </View>
      </View>

      {/* grid */}
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {deck.map((c) => {
            const v = flips[c.id];
            const rotateYFront = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
            const rotateYBack  = v.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

            const isMatched = !!open[c.id];
            const isWrong = !!wrongOpen[c.id];
            const isFaceUp = isMatched || isWrong || flipped.includes(c.id);

            const wrapperBg = isMatched ? '#ECFDF5' : isWrong ? '#FEF2F2' : '#fff';
            const wrapperBorder = isMatched ? '#16a34a' : isWrong ? '#DC2626' : COLORS.border;

            return (
              <Pressable
                key={c.id}
                onPress={() => tap(c)}
                style={{
                  width: tileW,
                  height: tileH,
                  marginBottom: gap,
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    flex: 1,
                    borderWidth: 2,
                    borderColor: wrapperBorder,
                    borderRadius: 16,
                    backgroundColor: wrapperBg,
                  }}
                >
                  {isMatched ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: Math.min(56, tileW * 0.52), fontWeight: '900', color: COLORS.navy }}>
                        {matchEmojiById[c.id] ?? '🎉'}
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* FRONT face */}
                      <Animated.View
                        style={{
                          position: 'absolute',
                          inset: 0,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backfaceVisibility: 'hidden' as any,
                          transform: [
                            { perspective: 800 },
                            { rotateY: (isFaceUp ? '180deg' : (rotateYFront as any)) },
                          ],
                        }}
                      >
                        <Text style={{ fontSize: Math.min(56, tileW * 0.52), fontWeight: '900', color: COLORS.navy }}>
                          {c.show}
                        </Text>
                      </Animated.View>

                      {/* BACK face */}
                      <Animated.View
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backfaceVisibility: 'hidden' as any,
                          transform: [
                            { perspective: 800 },
                            { rotateY: (isFaceUp ? '360deg' : (rotateYBack as any)) },
                          ],
                        }}
                      >
                        <Text style={{ fontSize: 24, color: COLORS.text }}>🔀</Text>
                      </Animated.View>
                    </>
                  )}

                  {(isWrong || isMatched) && (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 16,
                        backgroundColor: isWrong ? '#FEE2E2' : '#D1FAE5',
                        opacity: 0.35,
                      }}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* footer */}
      <View
        style={{
          padding: 16,
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          backgroundColor: '#fff',
          flexDirection: 'row',
          gap: 12,
          justifyContent: 'space-between',
        }}
      >
        <Pressable
          onPress={onShuffle}
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
            backgroundColor: '#fff',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: '800', color: COLORS.navy }}>Shuffle</Text>
        </Pressable>

        <Pressable
          onPress={onRepeat}
          style={{
            flex: 1.2,
            paddingVertical: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.navy,
            backgroundColor: COLORS.yellow,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: '900', color: COLORS.navy }}>🔊 Repeat</Text>
        </Pressable>
      </View>

      {showConfetti && (
        <ConfettiBurst count={22} duration={1100} onDone={() => setShowConfetti(false)} />
      )}
    </View>
  );
}
