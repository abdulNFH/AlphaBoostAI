import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LETTERS } from "../../constants/letters";
import { getLetterProgress, LetterProgress } from "../../lib/progress";
import { getIntro } from "../../constants/introWords";
import { COLORS } from "../../constants/colors";

function Stars({ n }: { n: number }) {
  return (
    <Text style={{ color: COLORS.yellow, fontWeight: "800", fontSize: 14 }}>
      {"★".repeat(n).padEnd(3, "☆")}
    </Text>
  );
}

export default function IndividualLetterPicker() {
  const [progress, setProgress] = useState<Record<string, LetterProgress>>({});

  const load = useCallback(async () => {
    const all: Record<string, LetterProgress> = {};
    for (const L of LETTERS) all[L.id] = await getLetterProgress(L.id);
    setProgress(all);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
      return undefined;
    }, [load])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ padding: 16 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "900",
            color: COLORS.navy,
            marginBottom: 8,
          }}
        >
          🔠 Individual Letter Training
        </Text>
        <Text style={{ color: COLORS.text, marginBottom: 12 }}>
          Tap a letter to enter its training hub.
        </Text>

        <FlatList
          data={LETTERS}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 14 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => {
            const p = progress[item.id];
            const info = getIntro(item.uc);

            return (
              <Link
                href={{ pathname: "/training/[letter]", params: { letter: item.uc } }}
                asChild
              >
                <Pressable
                  style={{
                    flex: 1,
                    minHeight: 180,
                    paddingVertical: 18,
                    borderRadius: 20,
                    backgroundColor: "#fff",
                    borderWidth: 1,
                    borderColor: COLORS.teal,
                    marginBottom: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  {/* Big Letters */}
                  <Text
                    style={{
                      fontSize: 52,
                      fontWeight: "900",
                      color: COLORS.navy,
                    }}
                  >
                    {item.uc}{" "}
                    <Text style={{ fontSize: 46, color: "#64748b" }}>{item.lc}</Text>
                  </Text>

                  {/* Large Emoji */}
                  <Text style={{ fontSize: 60, marginTop: 6 }}>{info.emoji}</Text>

                  {/* Stars Section */}
                  <View style={{ alignItems: "center", marginTop: 10 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        color: COLORS.text,
                        marginBottom: 2,
                      }}
                    >
                      Recognition
                    </Text>
                    <Stars n={p?.recogStars ?? 0} />
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      gap: 16,
                      marginTop: 8,
                    }}
                  >
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 12, color: COLORS.text }}>UC</Text>
                      <Stars n={p?.ucStars ?? 0} />
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 12, color: COLORS.text }}>LC</Text>
                      <Stars n={p?.lcStars ?? 0} />
                    </View>
                  </View>
                </Pressable>
              </Link>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}
