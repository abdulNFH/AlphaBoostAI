// app/training/intro-letters.tsx
import { View, Text, FlatList, Pressable } from "react-native";
import { Link } from "expo-router";
import { LETTERS } from "../../constants/letters";
import { COLORS } from "../../constants/colors";

export default function IntroLetters() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, padding: 16 }}>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "900",
          color: COLORS.navy,
          marginBottom: 12,
        }}
      >
        👶 Intro – Pick a Letter
      </Text>

      <FlatList
        data={LETTERS}
        keyExtractor={(i) => i.id}
        numColumns={4}
        columnWrapperStyle={{ gap: 8 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => (
          <Link
            href={{
              pathname: "/training/[letter]/intro",
              params: { letter: item.uc },
            }}
            asChild
          >
            <Pressable
              style={{
                flex: 1,
                minHeight: 80,
                borderRadius: 12,
                backgroundColor: COLORS.card,
                borderWidth: 1,
                borderColor: COLORS.teal,
                marginBottom: 8,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 26, fontWeight: "900", color: COLORS.navy }}>
                {item.uc}
              </Text>
              <Text style={{ fontSize: 18, color: COLORS.text }}>{item.lc}</Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}
