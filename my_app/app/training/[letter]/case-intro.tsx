import { View, Text, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, Link } from 'expo-router';
import { COLORS } from '../../../constants/colors';
import { speak } from '../../../lib/tts';

export default function CaseIntro() {
  const { letter } = useLocalSearchParams<{ letter: string }>();
  const uc = String(letter || 'A');
  const lc = uc.toLowerCase();

  const say = () => speak(`Capital ${uc}. Small ${lc}. Capital letters are big. Small letters are smaller.`);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, padding: 16 }}>
      <Stack.Screen options={{ title: 'Capital vs Small' }} />

      <Text style={{ fontSize: 64, fontWeight: '900', color: COLORS.navy, marginBottom: 8 }}>
        Capital {uc}
      </Text>
      <Text style={{ fontSize: 48, fontWeight: '900', color: '#64748b', marginBottom: 16 }}>
        Small {lc}
      </Text>

      <Text style={{ color: COLORS.text, marginBottom: 16 }}>
        Capital letters are used at the beginning of names and sentences. Small letters are used most of the time.
      </Text>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <Pressable onPress={say} style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: COLORS.card, borderRadius: 12 }}>
          <Text>🔊 Hear it</Text>
        </Pressable>

        <Link href={{ pathname: '/training/[letter]/recognition', params: { letter: uc } }} asChild>
          <Pressable style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: COLORS.yellow, borderRadius: 12 }}>
            <Text style={{ fontWeight: '900', color: COLORS.navy }}>Start: Recognition</Text>
          </Pressable>
        </Link>
      </View>

      
    </View>
  );
}
