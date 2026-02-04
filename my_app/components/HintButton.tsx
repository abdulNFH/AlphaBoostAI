import { Pressable, Text, View } from 'react-native';

export default function HintButton({ onPress }: { onPress: () => void }) {
  return (
    <View
      style={{
        alignItems: 'center',
        marginTop: 24,     // space above button
        marginBottom: 10,  // optional space below
      }}
    >
      <Pressable
        onPress={onPress}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 20,
          backgroundColor: '#FFD54F',
          borderRadius: 999,
          borderWidth: 1,
          borderColor: '#0C2D57',
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 3,
        }}
        accessibilityLabel="Show a hint"
      >
        <Text style={{ fontWeight: '900', color: '#0C2D57', fontSize: 16 }}>
          💡 Hint
        </Text>
      </Pressable>
    </View>
  );
}
