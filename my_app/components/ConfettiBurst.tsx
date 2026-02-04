import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';

type Props = {
  count?: number;        // number of confetti pieces
  duration?: number;     // total flight duration per piece
  onDone?: () => void;   // callback when burst is finished
};

const EMOJI = ['🎉', '✨', '🎈', '⭐', '💫', '🟡', '🔵', '🟣'];

type Piece = {
  xPct: number;
  delay: number;
  rotDeg: number;
  size: number;
  emoji: string;
  translateY: Animated.Value;
  opacity: Animated.Value;
  rotate: Animated.Value;
};

export default function ConfettiBurst({ count = 18, duration = 1000, onDone }: Props) {
  // 1) Build the pieces ONCE, but DO NOT start animations here.
  const pieces = useMemo<Piece[]>(() => {
    return new Array(count).fill(0).map(() => {
      return {
        xPct: Math.random() * 100,            // horizontal position %
        delay: Math.random() * 180,           // stagger
        rotDeg: (Math.random() - 0.5) * 80,   // -40..+40 deg
        size: 16 + Math.random() * 18,        // 16..34
        emoji: EMOJI[Math.floor(Math.random() * EMOJI.length)],
        translateY: new Animated.Value(0),
        opacity: new Animated.Value(0),
        rotate: new Animated.Value(0),
      };
    });
  }, [count]);

  // 2) Start the animations AFTER mount in useEffect (safe).
  const doneCalled = useRef(false);
  useEffect(() => {
    const anims = pieces.map((p) => {
      return Animated.sequence([
        Animated.delay(p.delay),
        Animated.parallel([
          Animated.timing(p.opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(p.translateY, {
            toValue: 1,
            duration: duration - p.delay,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(p.rotate, {
            toValue: 1,
            duration: duration - p.delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    // Start all piece animations
    Animated.stagger(8, anims).start(() => {
      if (!doneCalled.current) {
        doneCalled.current = true;
        onDone?.();
      }
    });
  }, [pieces, duration, onDone]);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0, right: 0, top: 0, bottom: 0,
        zIndex: 999,
      }}
    >
      {pieces.map((p, idx) => {
        const translateY = p.translateY.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, 500],
        });
        const rotate = p.rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${p.rotDeg}deg`],
        });

        return (
          <Animated.Text
            key={idx}
            style={{
              position: 'absolute',
              left: `${p.xPct}%`,
              top: 0,
              fontSize: p.size,
              opacity: p.opacity,
              transform: [{ translateY }, { rotate }],
            }}
          >
            {p.emoji}
          </Animated.Text>
        );
      })}
    </View>
  );
}
