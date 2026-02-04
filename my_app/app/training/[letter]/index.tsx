import { Stack, useLocalSearchParams, Link } from 'expo-router';
import { View, Text, Pressable } from 'react-native';
import { COLORS } from '../../../constants/colors';

function Chip({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: '#E6FAF9',
        borderWidth: 1,
        borderColor: '#4FB6B2',
      }}
    >
      <Text style={{ color: '#0C2D57', fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export default function LetterHub() {
  const { letter } = useLocalSearchParams<{ letter: string }>();
  const uc = String(letter || 'A');
  const lc = uc.toLowerCase();

  const Btn = ({
    title,
    href,
    primary = false,
  }: {
    title: string;
    href: any;
    primary?: boolean;
  }) => (
    <Link href={href} asChild>
      <Pressable
        style={{
          paddingVertical: 16,
          paddingHorizontal: 18,
          borderRadius: 16,
          backgroundColor: primary ? COLORS.yellow : COLORS.card,
          borderWidth: 1,
          borderColor: primary ? COLORS.teal : COLORS.border,
          marginBottom: 12,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontWeight: '900',
            color: COLORS.navy,
            fontSize: primary ? 18 : 16,
          }}
        >
          {title}
        </Text>
      </Pressable>
    </Link>
  );

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: `${uc}   ${lc}` }} />

      {/* Big letter header */}
      <View
        style={{
          padding: 16,
          borderRadius: 18,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: COLORS.teal,
          marginBottom: 14,
        }}
      >
        <Text style={{ fontSize: 64, fontWeight: '900', color: COLORS.navy, textAlign: 'center' }}>
          {uc}{' '}
          <Text style={{ color: '#64748b' }}>
            {lc}
          </Text>
        </Text>

        {/* “Path” chips so kids see the flow */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Chip label="1) Trace with help" />
          <Chip label="2) Recognize" />
          <Chip label="3) Free draw" />
        </View>

        <Text style={{ textAlign: 'center', color: COLORS.text, marginTop: 10 }}>
          Tap “Start Training” and follow the steps.
        </Text>
      </View>

      {/* One clear action */}
      <Btn
        title="▶️ Start Training"
        primary
        href={{ pathname: '/training/[letter]/trace-hints', params: { letter: uc } }}
      />

      {/* Optional shortcuts (smaller secondary actions) */}
      <View
        style={{
          padding: 12,
          borderRadius: 16,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: COLORS.border,
          marginTop: 6,
        }}
      >
        <Text style={{ fontWeight: '800', color: COLORS.navy, marginBottom: 8 }}>
          Shortcuts (optional)
        </Text>

        <Btn
          title="👶 Introduction"
          href={{ pathname: '/training/[letter]/intro', params: { letter: uc } }}
        />
        <Btn
          title="🎯 Practice: Recognition"
          href={{ pathname: '/training/[letter]/recognition', params: { letter: uc } }}
        />
        
        <Btn
          title="✍️ Free Draw"
          href={{ pathname: '/training/[letter]/free-draw', params: { letter: uc } }}
        />

      </View>

      <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 10 }}>
        Tip: Earn ⭐ to unlock more training games!
      </Text>
    </View>
  );
}
