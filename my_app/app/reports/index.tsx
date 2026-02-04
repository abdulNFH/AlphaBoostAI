import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { Svg, Rect, G } from "react-native-svg";
import { COLORS } from "../../constants/colors";
import { buildReport, type ReportData } from "../../lib/report";
import {
  getAllConfusionPairResults,
  getLetterProgress,
} from "../../lib/progress";

export default function Reports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [confPairs, setConfPairs] = useState<
    { pair: string; correct: number; wrong: number; accuracy: number }[]
  >([]);
  const [gameScores, setGameScores] = useState({
    monster: 0,
    garden: 0,
  });

  // 🔤 toggle for letters
  const [showLetters, setShowLetters] = useState(false);

  useEffect(() => {
    (async () => {
      const report = await buildReport();
      const pairs = await getAllConfusionPairResults();
      const monster = await getLetterProgress("a");
      const garden = await getLetterProgress("garden");

      setData(report);
      setConfPairs(pairs);
      setGameScores({
        monster: monster.monsterHighScore ?? 0,
        garden: 25,
      });
    })();
  }, []);

  if (!data) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLORS.bg,
        }}
      >
        <Text style={{ color: COLORS.text }}>📊 Generating report...</Text>
      </View>
    );
  }

  const { summary, perLetter, highlights } = data;

  // ----------- BarChart for stars by skill -----------
  function BarChart({ bars }: { bars: { label: string; value: number }[] }) {
    const W = 320,
      H = 140,
      PAD = 12;
    const max = Math.max(1, ...bars.map((b) => b.value));
    const bw = (W - PAD * 2) / bars.length - 8;

    return (
      <Svg width={W} height={H}>
        {bars.map((b, i) => {
          const x = PAD + i * (bw + 8);
          const h = (b.value / max) * (H - 34);
          const y = H - h - 22;
          return (
            <G key={i}>
              <Rect
                x={x}
                y={y}
                width={bw}
                height={h}
                rx={8}
                ry={8}
                stroke="#4FB6B2"
                fill="#E6FAF9"
              />
            </G>
          );
        })}
      </Svg>
    );
  }

  // ----------- Section Wrapper -----------
  const Card = ({ title, children, color }: any) => (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: color ?? COLORS.border,
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      {title && (
        <Text
          style={{
            fontSize: 18,
            fontWeight: "900",
            color: COLORS.navy,
            marginBottom: 10,
          }}
        >
          {title}
        </Text>
      )}
      {children}
    </View>
  );

  // -------- Highest & Lowest Confusion Accuracy --------
  const highestConf = confPairs.length
    ? confPairs.reduce((best, cur) =>
        cur.accuracy > best.accuracy ? cur : best
      )
    : null;

  const lowestPairs = confPairs
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)
    .map((p) => p.pair.toUpperCase())
    .join(", ");

  const lowestAccuracyLetters = highlights.needAttention
    .slice(0, 3)
    .join(", ");

  const allLetters = Array.from({ length: 26 }, (_, i) =>
    String.fromCharCode(97 + i)
  ); // a–z
  const letterMap = Object.fromEntries(
    (perLetter ?? []).map((l) => [l.id.toLowerCase(), l])
  );

  // ---------------- MAIN UI ----------------
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <Stack.Screen options={{ title: "Progress Report" }} />

      {/* HEADER */}
      <Card color={COLORS.teal}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "900",
                color: COLORS.navy,
              }}
            >
              📒 Progress Report
            </Text>
            <Text style={{ color: COLORS.text, marginTop: 4 }}>
              Professional summary for parents and educators
            </Text>
          </View>

          {/* 📄 Download Button */}
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/reports/it21805264_report",
                params: {
                  totalCompleted: summary.totalCompleted,
                  recog: summary.avg.recog.toFixed(1),
                  uc: summary.avg.uc.toFixed(1),
                  lc: summary.avg.lc.toFixed(1),
                  draw: summary.avg.draw.toFixed(1),
                  highestPair: highestConf?.pair ?? "-",
                  highestAcc: highestConf?.accuracy ?? 0,
                  monster: gameScores.monster,
                  garden: gameScores.garden,
                  strong: highlights.top3Strong.join(", "),
                  weak: highlights.needAttention.join(", "),
                  lowestPairs,
                  lowestAccuracyLetters,
                },
              })
            }
            style={{
              backgroundColor: COLORS.teal,
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 10,
              marginLeft: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
              📄 Download
            </Text>
          </Pressable>
        </View>
      </Card>

      {/* ⭐ Summary */}
      <Card title="⭐ Summary">
        <Text style={{ fontSize: 16, marginBottom: 6 }}>
          ✅ Letters mastered:{" "}
          <Text style={{ fontWeight: "900", color: COLORS.navy }}>
            {summary.totalCompleted}/26
          </Text>
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 6 }}>
          ⭐ Average Stars → Recognition {summary.avg.recog.toFixed(1)}, UC{" "}
          {summary.avg.uc.toFixed(1)}, LC {summary.avg.lc.toFixed(1)}, Draw{" "}
          {summary.avg.draw.toFixed(1)}
        </Text>
        {highestConf && (
          <Text style={{ fontSize: 16 }}>
            🧩 Highest Confusion Accuracy:{" "}
            <Text style={{ fontWeight: "900", color: COLORS.navy }}>
              {highestConf.pair.toUpperCase()} ({highestConf.accuracy}%)
            </Text>
          </Text>
        )}
      </Card>

      {/* 🕹️ Game High Scores */}
      <Card title="🕹️ Game High Scores">
        <Text style={{ fontSize: 16, marginBottom: 6 }}>
          👾 Monster Feeding:{" "}
          <Text style={{ fontWeight: "900", color: COLORS.navy }}>
            {gameScores.monster}
          </Text>
        </Text>
        <Text style={{ fontSize: 16 }}>
          🌼 Letter Garden:{" "}
          <Text style={{ fontWeight: "900", color: COLORS.navy }}>
            {gameScores.garden}
          </Text>
        </Text>
      </Card>

      {/* 📊 Skill Progress */}
      <Card title="📊 Skill Progress (Stars Earned)">
        <BarChart
          bars={[
            { label: "Recog", value: summary.starsDist.recog },
            { label: "UC", value: summary.starsDist.uc },
            { label: "LC", value: summary.starsDist.lc },
            { label: "Draw", value: summary.starsDist.draw },
          ]}
        />
        <Text style={{ color: COLORS.text, marginTop: 6 }}>
          Each bar shows total stars earned in that skill. Higher = better mastery.
        </Text>
      </Card>

      {/* 🎯 Highlights */}
      <Card title="🎯 Highlights">
        <Text style={{ fontSize: 16, marginBottom: 4 }}>
          🌟 Strongest Letters:{" "}
          <Text style={{ fontWeight: "900", color: COLORS.navy }}>
            {highlights.top3Strong.join(", ") || "—"}
          </Text>
        </Text>
        <Text style={{ fontSize: 16 }}>
          🔍 Needs Practice:{" "}
          <Text style={{ fontWeight: "900", color: COLORS.navy }}>
            {highlights.needAttention.join(", ") || "—"}
          </Text>
        </Text>
      </Card>

      {/* 🔤 Letters A–Z (Toggle Section) */}
      <Card title="🔤 Letters A–Z">
        <Pressable
          onPress={() => setShowLetters(!showLetters)}
          style={{
            backgroundColor: COLORS.teal,
            paddingVertical: 8,
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              color: "#fff",
              textAlign: "center",
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            {showLetters ? "Hide Letters" : "Show Letters"}
          </Text>
        </Pressable>

        {!showLetters ? (
          <Text style={{ color: COLORS.text }}>
            Click “Show Letters” to check letter performance.
          </Text>
        ) : (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            {allLetters.map((id) => {
              const card = letterMap[id];
              const noData =
                !card || (card.uc + card.lc + card.recog + card.draw) === 0;

              return (
                <Pressable
                  key={id}
                  onPress={() =>
                    router.push({
                      pathname: "/training/[letter]",
                      params: { letter: id.toUpperCase() },
                    } as any)
                  }
                  style={{
                    width: "48%",
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 12,
                    padding: 12,
                    backgroundColor: noData ? "#f3f4f6" : "#f9fafb",
                    opacity: noData ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "900",
                      color: COLORS.navy,
                      fontSize: 20,
                      marginBottom: 4,
                    }}
                  >
                    {id.toUpperCase()}
                  </Text>
                  {noData ? (
                    <Text style={{ color: "#999" }}>No data yet — tap to start</Text>
                  ) : (
                    <>
                      <Text>UC ⭐ {card.uc} | LC ⭐ {card.lc}</Text>
                      <Text>Recog ⭐ {card.recog} | Draw ⭐ {card.draw}</Text>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>

      {/* 📉 Confusing Letter Accuracy */}
      <Card title="📉 Confusing Letter Accuracy">
        {confPairs.length === 0 ? (
          <Text style={{ color: COLORS.text }}>
            No confusion data yet — play the Confusing Letter game to unlock this!
          </Text>
        ) : (
          confPairs
            .sort((a, b) => b.accuracy - a.accuracy)
            .map((p, i) => (
              <Text
                key={i}
                style={{
                  fontSize: 15,
                  color:
                    p.accuracy >= 80
                      ? "#16a34a"
                      : p.accuracy >= 60
                      ? "#f59e0b"
                      : "#ef4444",
                  marginBottom: 4,
                }}
              >
                • {p.pair.toUpperCase()} → {p.accuracy}% accuracy
              </Text>
            ))
        )}
      </Card>

      {/* 👩‍👩‍👧 Parent Tips */}
      <Card title="👩‍👩‍👧 Parent Tips" color="#facc15">
        <Text>🎉 Celebrate strong letters — encouragement builds confidence.</Text>
        <Text>🎯 Focus on low-accuracy confusing pairs first.</Text>
        <Text>⏱️ Short, daily practice beats long sessions once in a while.</Text>
        <Text>🔄 Mix tracing, recognition, and free draw for variety.</Text>
      </Card>
    </ScrollView>
  );
}
