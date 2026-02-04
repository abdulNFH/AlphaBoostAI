// app/training/[letter]/write-hints.tsx
import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import ViewShot, { captureRef } from 'react-native-view-shot';

import DrawingCanvas, { DrawingCanvasRef } from '../../../components/DrawingCanvas';
import ProgressDots from '../../../components/ProgressDots';
import LetterGuide from '../../../components/LetterGuide';
import { COLORS } from '../../../constants/colors';
import { predictFromUri } from '../../../services/predictionService';
import { awardStars } from '../../../lib/progress';
import { speak } from '../../../lib/tts';

const REPS = 3;

export default function WriteWithHints() {
  const { letter } = useLocalSearchParams<{ letter: string }>();
  const uc = String(letter || 'A');
  const lc = uc.toLowerCase();

  const [phase, setPhase] = useState<'uc' | 'lc'>('uc');
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showGhost, setShowGhost] = useState(true);
  const [result, setResult] = useState<{ label: string; prob: number } | null>(null);

  const [feedback, setFeedback] = useState<null | {
    type: 'success' | 'error' | 'info';
    message: string;
    button?: { label: string; onPress: () => void };
  }>(null);

  const shotRef = useRef<ViewShot>(null);
  const canvasRef = useRef<DrawingCanvasRef>(null);

  const ghostOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(ghostOpacity, { toValue: 0.16, duration: 220, useNativeDriver: false }).start();
  }, [ghostOpacity]);

  useEffect(() => {
    if (phase === 'uc') speak(`Write capital ${uc}`);
    else speak(`Write small ${lc}`);
    setResult(null);
    canvasRef.current?.clear();
  }, [phase, uc, lc]);

  const ghostLetter = phase === 'uc' ? uc : lc;

  const onClear = () => {
    if (busy) return;
    canvasRef.current?.clear();
    setResult(null);
  };

  const matchesTarget = (pred: string | undefined | null) => {
    const p = (pred || '').trim();
    return phase === 'uc' ? p === uc : p === lc;
  };

  const checkWithModel = async () => {
    const strokes = canvasRef.current?.getStrokes() || [];
    const drew = strokes.some((s) => s.length > 5);
    if (!drew) {
      speak('Try writing the letter properly');
      setFeedback({
        type: 'error',
        message: '✍️ Please write the letter properly!',
      });
      return;
    }

    if (busy) return;
    setBusy(true);
    setResult(null);

    try {
      setShowGhost(false);
      await new Promise((r) => setTimeout(r, 100));

      const uri = await captureRef(shotRef, { format: 'jpg', quality: 0.9 });
      const res = await predictFromUri(uri);
      const top = res.top1 || res.top3?.[0] || null;

      setShowGhost(true);

      if (!top?.label) {
        setFeedback({
          type: 'error',
          message: '🤔 Could not read that. Try again!',
        });
        return;
      }

      if (matchesTarget(top.label)) {
        // ✅ Correct writing
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        speak('Great job!');

        const repsDone = count + 1;
        setCount(repsDone);
        canvasRef.current?.clear();

        if (repsDone < REPS) {
          setFeedback({
            type: 'success',
            message: '✨ Nice! Let’s write again!',
          });
          return;
        }

        if (phase === 'uc') {
          await awardStars(lc, 'ucStars', 3);
          setFeedback({
            type: 'success',
            message: '🌟 Great! Now write the small letter!',
          });
          setTimeout(() => {
            setPhase('lc');
            setCount(0);
          }, 1500);
        } else {
          // 🎉 After finishing all
          await awardStars(lc, 'lcStars', 3);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          speak('Excellent work!');
          setFeedback({
            type: 'success',
            message: '🎉 You successfully finished writing! Now let’s move to recognition.',
            button: {
              label: 'Next ➡️',
              onPress: () => {
                setFeedback(null);
                router.push({
                  pathname: '/training/[letter]/recognition',
                  params: { letter: uc },
                } as any);
              },
            },
          });
        }
      } else {
        // ❌ Wrong writing — move to next rep
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        speak('Oops! That’s wrong. Write again.');
        const repsDone = count + 1;
        setCount(repsDone);
        canvasRef.current?.clear();
        setFeedback({
          type: 'error',
          message: '❌ Oops! That’s wrong. Write again!',
        });
      }
    } catch (e: any) {
      speak('Network error. Please try again.');
      setFeedback({
        type: 'error',
        message: '⚠️ Network error. Try again later.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, padding: 16 }}>
      <Stack.Screen options={{ title: 'Write with Hints' }} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: COLORS.text, marginBottom: 4 }}>
            {phase === 'uc' ? 'Write Capital' : 'Write Small'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: COLORS.navy }}>
              {phase === 'uc' ? `Capital ${uc}` : `Small ${lc}`}
            </Text>
            <ProgressDots total={REPS} value={count} />
          </View>
        </View>

        {/* 🏠 Home Icon Button */}
        <View style={{ alignItems: 'center' }}>
          <Pressable
            onPress={() => router.replace('/training')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
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
            <Text style={{ fontSize: 22 }}>🏠</Text>
          </Pressable>
          <Text
            style={{
              fontSize: 12,
              color: COLORS.text,
              marginTop: 4,
              fontWeight: '600',
            }}
          >
            Home
          </Text>
        </View>
      </View>

      {/* GUIDE */}
      <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 12 }}>
        <LetterGuide size={240} letter={ghostLetter} color="#0C2D57" />
      </View>

      {/* CANVAS */}
      <View style={{ alignItems: 'center' }}>
        <ViewShot
          ref={shotRef}
          style={{
            width: 320,
            height: 320,
            position: 'relative',
            backgroundColor: '#fff',
            borderRadius: 16,
            borderWidth: 2,
            borderColor: '#0C2D57',
            overflow: 'hidden',
          }}
        >
          {showGhost && (
            <Animated.Text
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 320,
                height: 320,
                textAlign: 'center',
                includeFontPadding: false,
                textAlignVertical: 'center' as any,
                fontSize: 255,
                color: '#000',
                opacity: ghostOpacity,
                zIndex: 0,
              }}
            >
              {ghostLetter}
            </Animated.Text>
          )}
          <DrawingCanvas ref={canvasRef} size={320} strokeWidth={12} />
        </ViewShot>
      </View>

      {/* Controls */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, justifyContent: 'center' }}>
        <Pressable
          onPress={onClear}
          disabled={busy}
          style={{
            padding: 12,
            backgroundColor: COLORS.card,
            borderRadius: 12,
            opacity: busy ? 0.6 : 1,
          }}
        >
          <Text>Clear</Text>
        </Pressable>
        <Pressable
          onPress={checkWithModel}
          disabled={busy}
          style={{
            padding: 12,
            backgroundColor: COLORS.yellow,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.navy,
            opacity: busy ? 0.7 : 1,
          }}
        >
          <Text style={{ fontWeight: '900', color: COLORS.navy }}>
            {busy ? 'Checking…' : "I'm Done"}
          </Text>
        </Pressable>
      </View>

      {/* Busy Overlay */}
      {busy && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.05)',
          }}
        >
          <ActivityIndicator size="large" color={COLORS.navy} />
        </View>
      )}

      {/* Feedback Popup */}
      {feedback && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 30,
            zIndex: 999,
          }}
        >
          <View
            style={{
              backgroundColor:
                feedback.type === 'success'
                  ? '#E6F4EA'
                  : feedback.type === 'error'
                  ? '#FEE2E2'
                  : COLORS.card,
              borderRadius: 20,
              borderWidth: 2,
              borderColor:
                feedback.type === 'success'
                  ? '#22C55E'
                  : feedback.type === 'error'
                  ? '#DC2626'
                  : COLORS.border,
              paddingVertical: 40,
              paddingHorizontal: 24,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 8,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: '900',
                color:
                  feedback.type === 'success'
                    ? '#166534'
                    : feedback.type === 'error'
                    ? '#991B1B'
                    : COLORS.text,
                marginBottom: 10,
                textAlign: 'center',
              }}
            >
              {feedback.message}
            </Text>

            {feedback.button ? (
              <Pressable
                onPress={feedback.button.onPress}
                style={{
                  marginTop: 16,
                  backgroundColor: COLORS.yellow,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: COLORS.navy,
                  paddingVertical: 10,
                  paddingHorizontal: 30,
                }}
              >
                <Text style={{ fontWeight: '900', color: COLORS.navy }}>
                  {feedback.button.label}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setFeedback(null)}
                style={{
                  marginTop: 16,
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  paddingVertical: 10,
                  paddingHorizontal: 24,
                }}
              >
                <Text style={{ fontWeight: '900', color: COLORS.text }}>OK</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
