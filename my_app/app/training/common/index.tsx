import React, { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Stack, Link, Href, useFocusEffect } from "expo-router";
import { COLORS } from "../../../constants/colors";
import { getTotalStars } from "../../../lib/progress";

type Game = {
  title: string;
  subtitle: string;
  icon: string;
  href: Href;
};

const GAMES: Game[] = [
  {
    title: "Letter Puzzle",
    subtitle: "Fill the missing letter",
    icon: "🧩",
    href: { pathname: "/training/common/puzzle" },
  },
  {
    title: "Confusing Letters",
    subtitle: "Tricky pairs b–d, p–q…",
    icon: "🔁",
    href: { pathname: "/training/common/confusions" },
  },
  {
    title: "Case Match",
    subtitle: "Match BIG with small",
    icon: "🔡",
    href: { pathname: "/training/common/case-match" },
  },
  {
    title: "Picture Match",
    subtitle: "Find picture’s letter",
    icon: "🖼️",
    href: { pathname: "/training/common/picture-match" },
  },
  {
    title: "Broken Letters",
    subtitle: "Fix the pieces",
    icon: "🧱",
    href: { pathname: "/training/common/broken-letter" },
  },
];

function Tile({ game }: { game: Game }) {
  return (
    <Link href={game.href} asChild>
      <Pressable
        style={{
          width: "47%",
          aspectRatio: 1.05,
          marginBottom: 16,
          borderRadius: 20,
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: COLORS.teal,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 3,
          padding: 14,
        }}
      >
        <Text style={{ fontSize: 36 }}>{game.icon}</Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "900",
            color: COLORS.navy,
            marginTop: 8,
            textAlign: "center",
          }}
        >
          {game.title}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: COLORS.text,
            marginTop: 4,
            textAlign: "center",
            lineHeight: 18,
          }}
        >
          {game.subtitle}
        </Text>
      </Pressable>
    </Link>
  );
}

export default function CommonHub() {
  const [stars, setStars] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        const total = await getTotalStars();
        if (mounted) setStars(total);
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const isOdd = GAMES.length % 2 === 1;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: "🎮 Common Training" }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: "#FFFBEA",
            borderBottomWidth: 1,
            borderColor: "#FCD34D",
            borderRadius: 16,
            paddingVertical: 16,
            paddingHorizontal: 16,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 26,
              fontWeight: "900",
              color: COLORS.navy,
            }}
          >
            Practice Zone 🎯
          </Text>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 15,
              marginTop: 4,
            }}
          >
            Fun mini-games to boost your letter skills!
          </Text>

          <View
            style={{
              marginTop: 12,
              alignSelf: "flex-start",
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: 999,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#FACC15",
            }}
          >
            <Text style={{ fontWeight: "900", color: COLORS.navy }}>
              ⭐ Total stars: {stars}
            </Text>
          </View>
        </View>

        {/* Game Grid */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          {GAMES.map((g) => (
            <Tile key={g.title} game={g} />
          ))}
          {isOdd ? <View style={{ width: "47%", marginBottom: 16 }} /> : null}
        </View>

        {/* Tip Box */}
        <View
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 16,
            backgroundColor: "#F8FAFC",
            borderWidth: 1,
            borderColor: "#E2E8F0",
          }}
        >
          <Text
            style={{
              color: COLORS.text,
              fontSize: 14,
              lineHeight: 20,
              textAlign: "center",
            }}
          >
            💡 Tip: Play each game multiple times to earn more ⭐ and unlock
            hidden challenges!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
