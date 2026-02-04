import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import ViewShot, { captureRef } from 'react-native-view-shot';

import DrawingCanvas, { DrawingCanvasRef } from '../../../components/DrawingCanvas';
import ProgressDots from '../../../components/ProgressDots';
import { COLORS } from '../../../constants/colors';
import { predictFromUri } from '../../../services/predictionService';
import { awardStars } from '../../../lib/progress';
import { speak } from '../../../lib/tts';

const BOX = 320;

export default function FreeDrawTwoPhase() {
  const { letter } = useLocalSearchParams<{ letter: string }>();
  const uc = String(letter || 'A');
  const lc = uc.toLowerCase();

  const [phase, setPhase] = useState<'uc' | 'lc'>('uc');

  const shotRef = useRef<ViewShot>(null);
  const canvasRef = useRef<DrawingCanvasRef>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ label: string; prob: number } | null>(null);

  useEffect(() => {
    if (phase === 'uc') speak(`Write capital ${uc}`);
    else speak(`Write small ${lc}`);
    setResult(null);
    canvasRef.current?.clear();
  }, [phase, uc, lc]);

  const clearAll = () => {
    canvasRef.current?.clear();
    setResult(null);
  };

  const matchesTarget = (pred: string | undefined | null) => {
    const p = (pred || '').trim();
    return phase === 'uc' ? p === uc : p === lc;
  };

  const checkWithModel = async () => {
    const strokes = canvasRef.current?.getStrokes() || [];
    const drew = strokes.some(s => s.length > 5);
    if (!drew) {
      Alert.alert('Try drawing', `Draw the letter ${phase === 'uc' ? uc : lc} first.`);
      return;
    }

    if (loading) return;
    setLoading(true);
    setResult(null);

    try {
      const uri = await captureRef(shotRef, { format: 'jpg', quality: 0.92 });
      const res = await predictFromUri(uri);
      const top = res.top1 || res.top3?.[0] || null;
      setResult(top);

      if (!top?.label) {
        speak('Hmm, I could not read that. Try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      if (matchesTarget(top.label)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        speak('Great job!');

        if (phase === 'uc') {
          // Finish capital → go to small
          setTimeout(() => setPhase('lc'), 500);
        } else {
          // Finished both capital + small → award drawStars
          await awardStars(lc, 'drawStars', 3);
          Alert.alert('Well done!', 'You finished Free Draw for both capital and small.', [
            {
              text: 'Finish',
              onPress: () =>
                router.replace({ pathname: '/training/[letter]', params: { letter: uc } } as any),
            },
          ]);
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        speak(`I saw ${top.label}. Try again.`);
      }
    } catch (e: any) {
      speak('Network error. Please try again.');
      Alert.alert('Network', String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, padding: 16 }}>
      <Stack.Screen options={{ title: 'Free Draw' }} />

      {/* Header */}
      <Text style={{ color: COLORS.text, marginBottom: 6 }}>
        {phase === 'uc' ? `Write Capital ${uc}` : `Write Small ${lc}`}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: COLORS.navy }}>
          {uc} <Text style={{ color: '#64748b' }}>{lc}</Text>
        </Text>
        <ProgressDots total={2} value={phase === 'uc' ? 0 : 1} />
      </View>

      {/* Big Letter */}
      <View style={{ alignItems: 'center', marginVertical: 12 }}>
        <Text style={{ fontSize: 180, fontWeight: '900', color: COLORS.navy }}>
          {phase === 'uc' ? uc : lc}
        </Text>
      </View>

      {/* Canvas */}
      <View style={{ alignItems: 'center' }}>
        <ViewShot
          ref={shotRef}
          style={{
            width: BOX,
            height: BOX,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: COLORS.navy,
            backgroundColor: '#fff',
            overflow: 'hidden',
          }}
        >
          <DrawingCanvas ref={canvasRef} size={BOX} strokeWidth={12} />
        </ViewShot>
      </View>

      {/* Controls */}
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          marginTop: 16,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={clearAll}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 16,
            backgroundColor: COLORS.card,
            borderRadius: 12,
          }}
        >
          <Text>Clear</Text>
        </Pressable>

        <Pressable
          onPress={checkWithModel}
          disabled={loading}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 18,
            backgroundColor: COLORS.yellow,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.navy,
            opacity: loading ? 0.7 : 1,
          }}
        >
          <Text style={{ fontWeight: '900', color: COLORS.navy }}>
            {loading ? 'Checking…' : 'Check'}
          </Text>
        </Pressable>
      </View>

      {result && (
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <Text style={{ fontSize: 18 }}>
            I saw: <Text style={{ fontWeight: '900' }}>{result.label}</Text> (
            {Math.round((result.prob ?? 0) * 100)}%)
          </Text>
          {matchesTarget(result.label) ? (
            <Text style={{ marginTop: 4, color: '#16a34a' }}>✅ Correct!</Text>
          ) : (
            <Text style={{ marginTop: 4, color: '#dc2626' }}>❌ Not quite. Try again!</Text>
          )}
        </View>
      )}

      {loading && (
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
    </View>
  );
}
