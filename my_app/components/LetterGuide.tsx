// components/LetterGuide.tsx
import React, { useEffect, useMemo } from 'react';
import { View, Animated } from 'react-native';

type Props = {
  size?: number;      // pixel box
  letter: string;     // any A–Z / a–z
  color?: string;     // text color
  onDone?: () => void;
};

/**
 * Big, centered letter with a gentle “appear + pulse”.
 * Uses Animated.Text (reliable across iOS/Android).
 */
export default function LetterGuide({ size = 140, letter, color = '#0C2D57', onDone }: Props) {
  const scale = useMemo(() => new Animated.Value(0.92), []);
  const opacity = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    // reset + animate for each new letter
    scale.setValue(0.92);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.0, duration: 280, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.985, duration: 220, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0, duration: 220, useNativeDriver: true }),
      ]),
    ]).start(() => onDone?.());
  }, [letter]);

  return (
    <View
      pointerEvents="none"
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.Text
        style={{
          fontSize: size * 0.82,
          fontWeight: '900',
          color,
          textAlign: 'center',
          textAlignVertical: 'center',
          includeFontPadding: false,
          transform: [{ scale }],
          opacity,
        }}
      >
        {letter}
      </Animated.Text>
    </View>
  );
}
