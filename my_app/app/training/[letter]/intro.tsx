import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { Stack, useLocalSearchParams, Link } from 'expo-router';
import { COLORS } from '../../../constants/colors';
import { getIntro } from '../../../constants/introWords';
import { speak } from '../../../lib/tts';

export default function LetterIntro() {
  const { letter } = useLocalSearchParams<{ letter: string }>();
  const uc = String(letter || 'A');
  const lc = uc.toLowerCase();
  const intro = getIntro(uc);

  // Animation refs
  const fadeUpper = useRef(new Animated.Value(0)).current;
  const fadeLower = useRef(new Animated.Value(0)).current;
  const fadeEmoji = useRef(new Animated.Value(0)).current;
  const scaleEmoji = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Step-by-step animation + voice sequence
    Animated.sequence([
      Animated.timing(fadeUpper, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      await speak(`This is capital ${uc}.`);

      setTimeout(() => {
        Animated.timing(fadeLower, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start(async () => {
          await speak(`This is small ${lc}.`);

          setTimeout(() => {
            Animated.parallel([
              Animated.timing(fadeEmoji, {
                toValue: 1,
                duration: 700,
                useNativeDriver: true,
              }),
              Animated.spring(scaleEmoji, {
                toValue: 1,
                friction: 5,
                useNativeDriver: true,
              }),
            ]).start(async () => {
              await speak(`${uc} is for ${intro.word}.`);
            });
          }, 600);
        });
      }, 600);
    });
  }, [uc]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack.Screen options={{ title: `${uc}  ${lc} — Intro` }} />

      {/* Capital + Small letters together */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Animated.Text
          style={{
            fontSize: 160,
            fontWeight: '900',
            color: COLORS.navy,
            opacity: fadeUpper,
          }}
        >
          {uc}
        </Animated.Text>

        <Animated.Text
          style={{
            fontSize: 130,
            fontWeight: '900',
            color: '#64748b',
            marginLeft: 12,
            opacity: fadeLower,
          }}
        >
          {lc}
        </Animated.Text>
      </View>

      {/* Big animated emoji */}
      <Animated.View
        style={{
          opacity: fadeEmoji,
          transform: [{ scale: scaleEmoji }],
          marginTop: 40,
        }}
      >
        <Text style={{ fontSize: 160 }}>{intro.emoji}</Text>
      </Animated.View>

      {/* Description */}
      <Animated.Text
        style={{
          fontSize: 26,
          color: COLORS.text,
          marginTop: 20,
          textAlign: 'center',
          opacity: fadeEmoji,
        }}
      >
        {uc} is for{' '}
        <Text style={{ fontWeight: '900', color: COLORS.navy }}>{intro.word}</Text>
      </Animated.Text>

      {/* 🔊 Hear Again */}
      <Pressable
        onPress={() =>
          speak(
            `This is capital ${uc}. This is small ${lc}. ${uc} is for ${intro.word}.`
          )
        }
        style={{
          marginTop: 24,
          paddingVertical: 12,
          paddingHorizontal: 18,
          backgroundColor: COLORS.card,
          borderRadius: 12,
        }}
      >
        <Text>🔊 Hear it again</Text>
      </Pressable>

      {/* Skip to Training */}
      <Link
        href={{ pathname: '/training/[letter]/recognition', params: { letter: uc } }}
        asChild
      >
        <Pressable style={{ marginTop: 16, padding: 8 }}>
          <Text style={{ color: '#64748b' }}>Skip to Training →</Text>
        </Pressable>
      </Link>
    </View>
  );
}
