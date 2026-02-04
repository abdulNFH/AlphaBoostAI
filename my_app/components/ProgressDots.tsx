import { useMemo } from 'react';
import { View, Animated } from 'react-native';

export default function ProgressDots({ total = 3, value = 0 }: { total?: number; value?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i < value;
        const scale = useMemo(() => new Animated.Value(active ? 1.15 : 1.0), [active]);

        // animate to target scale quickly on render changes
        Animated.timing(scale, { toValue: active ? 1.15 : 1.0, duration: 160, useNativeDriver: true }).start();

        return (
          <Animated.View
            key={i}
            style={{
              transform: [{ scale }],
              width: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: active ? '#4FB6B2' : '#e2e8f0',
              borderWidth: 1,
              borderColor: active ? '#0C2D57' : '#e2e8f0',
            }}
          />
        );
      })}
    </View>
  );
}
