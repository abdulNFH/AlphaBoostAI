import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../../constants/colors";
import { LETTERS } from "../../constants/letters";
import { getLetterProgress } from "../../lib/progress";

// 🧩 Game list
const GAMES = [
  { key: "sound_safari", title: "Sound Safari", emoji: "🐒🔊", href: "/games/letter-sound-safari" },
  { key: "monster_feeding", title: "Monster Feeding", emoji: "🍎👹", href: "/games/monster-feeding" },
  { key: "letter_garden", title: "Letter Garden", emoji: "🌱", href: "/games/letter-garden" },
  { key: "letter_hero", title: "Letter Hero", emoji: "🦸", href: "/games/letter-hero" },
  { key: "catch_letter", title: "Catch the Letter", emoji: "🪂", href: "/games/catch-letter" },
  { key: "letter_puzzle", title: "Letter Puzzle", emoji: "🧩", href: "/games/letter-puzzle" },
];

// 📊 Helper to get stored game score
const getGameScore = async (key: string) => {
  const val = await AsyncStorage.getItem(`game_score_${key}`);
  return val ? parseInt(val) : 0;
};

export default function GamesHub() {
  const [learned2Stars, setLearned2Stars] = useState(0);
  const [unlocked, setUnlocked] = useState<string[]>([]);

  // 🔁 Load unlocks
  useEffect(() => {
    (async () => {
      let count = 0;
      for (const L of LETTERS) {
        const p = await getLetterProgress(L.id);
        if ((p.recogStars ?? 0) >= 2 && (p.ucStars ?? 0) >= 2 && (p.lcStars ?? 0) >= 2) count++;
      }
      setLearned2Stars(count);

      const newUnlocked: string[] = [];
      for (let i = 0; i < GAMES.length; i++) {
        const score = await getGameScore(GAMES[i].key);
        if (i === 0) {
          // first game always unlocked
          newUnlocked.push(GAMES[i].key);
        } else {
          const prevScore = await getGameScore(GAMES[i - 1].key);
          if (prevScore >= 10) newUnlocked.push(GAMES[i].key);
        }
      }
      setUnlocked(newUnlocked);
    })();
  }, []);

  // 🎮 Each game node
  const GameNode = ({
    title,
    emoji,
    href,
    locked,
  }: {
    title: string;
    emoji: string;
    href: string;
    locked: boolean;
  }) => (
    <Pressable
      onPress={() => {
        if (locked) {
          Alert.alert(
            "🔒 Locked Game",
            "Score 10 points to unlock this level!"
          );
        } else {
          router.push(href as never);

        }
      }}
      style={{
        width: 130,
        height: 130,
        borderRadius: 999,
        backgroundColor: locked ? "#E2E2E2" : "#fff",
        borderWidth: 3,
        borderColor: locked ? "#999" : COLORS.teal,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
        opacity: locked ? 0.7 : 1,
        marginHorizontal: 6,
      }}
    >
      <Text style={{ fontSize: 36 }}>{emoji}</Text>
      <Text
        style={{
          fontWeight: "900",
          fontSize: 15,
          color: COLORS.navy,
          textAlign: "center",
          marginTop: 6,
        }}
      >
        {locked ? "🔒 " + title : title}
      </Text>
    </Pressable>
  );

  // 🧰 Developer unlock button
  const handleUnlockAll = () => {
    const allKeys = GAMES.map((g) => g.key);
    setUnlocked(allKeys);
    Alert.alert("✅ All games temporarily unlocked!");
  };

  // 🧩 Split into rows of 2
  const rows = [];
  for (let i = 0; i < GAMES.length; i += 2) rows.push(GAMES.slice(i, i + 2));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#E9F5F7" }}
      contentContainerStyle={{ padding: 20, alignItems: "center" }}
    >
      <Text style={{ fontSize: 26, fontWeight: "900", color: COLORS.navy, marginBottom: 4 }}>
        🗺️ Adventure Map
      </Text>
      <Text style={{ color: COLORS.text, marginBottom: 16 }}>
        Learned letters (⭐⭐ in core): {learned2Stars}
      </Text>

      {/* 🔓 Developer unlock button */}
      <Pressable
        onPress={handleUnlockAll}
        style={{
          backgroundColor: COLORS.teal,
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>🔓 Unlock All (Developer Mode)</Text>
      </Pressable>

      {/* 🌈 Zigzag Adventure Path */}
      {rows.map((pair, idx) => {
        const reversed = idx % 2 === 1;
        const directionArrow = reversed ? "⬅️" : "➡️";

        return (
          <View key={idx} style={{ alignItems: "center" }}>
            <View
              style={{
                flexDirection: reversed ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "center",
                width: "90%",
                marginVertical: 8,
              }}
            >
              <GameNode
                title={pair[0].title}
                emoji={pair[0].emoji}
                href={pair[0].href}
                locked={!unlocked.includes(pair[0].key)}
              />

              {pair[1] && (
                <>
                  <Text style={{ fontSize: 28, color: COLORS.navy }}>{directionArrow}</Text>
                  <GameNode
                    title={pair[1].title}
                    emoji={pair[1].emoji}
                    href={pair[1].href}
                    locked={!unlocked.includes(pair[1].key)}
                  />
                </>
              )}
            </View>

            {/* ⬇️ Down connector */}
            {idx < rows.length - 1 && (
              <View
                style={{
                  alignSelf: reversed ? "flex-start" : "flex-end",
                  marginHorizontal: "10%",
                  marginVertical: 4,
                }}
              >
                <Text style={{ fontSize: 28, color: COLORS.navy }}>⬇️</Text>
              </View>
            )}
          </View>
        );
      })}

      {/* 🎯 Final Reward */}
      <View style={{ alignItems: "center", marginTop: 16 }}>
        <Text style={{ fontSize: 16, color: COLORS.text, marginBottom: 6 }}>🎯 Final Reward</Text>
        <GameNode title="Sticker Album" emoji="🐼🎨" href="/games/complete" locked={false} />
      </View>
    </ScrollView>
  );
}
