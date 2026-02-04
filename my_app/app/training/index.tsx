import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ViewStyle,
  StyleProp,
  Modal,
  ScrollView,
} from "react-native";
import { Link, Href, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { getTotalStars } from "../../lib/progress";

/* ---------- Small UI helpers ---------- */
type CardProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const Card: React.FC<CardProps> = ({ children, style }) => (
  <View
    style={[
      {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: COLORS.teal,
        borderRadius: 22,
        padding: 18,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
      },
      style,
    ]}
  >
    {children}
  </View>
);

type BigBtnProps = {
  href: Href;
  label: string;
  emoji: string;
  primary?: boolean;
};

const BigBtn: React.FC<BigBtnProps> = ({
  href,
  label,
  emoji,
  primary = false,
}) => (
  <Link href={href} asChild>
    <Pressable
      style={{
        backgroundColor: primary ? COLORS.yellow : "#fff",
        borderColor: primary ? COLORS.navy : COLORS.teal,
        borderWidth: 1.4,
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
      }}
    >
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={{ fontWeight: "900", color: COLORS.navy, fontSize: 18 }}>
        {label}
      </Text>
    </Pressable>
  </Link>
);

/* ---------- Main screen ---------- */
export default function TrainingHome() {
  const [stars, setStars] = useState(0);
  const [showLockedModal, setShowLockedModal] = useState(false);

  // refresh stars whenever screen focuses
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

  const STAR_THRESHOLD = 35;
  const unlocked = stars >= STAR_THRESHOLD;
  const needed = Math.max(0, STAR_THRESHOLD - stars);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontSize: 36 }}>🧑‍🏫</Text>
            <View>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "900",
                  color: COLORS.navy,
                }}
              >
                📚 Training
              </Text>
              <Text style={{ color: COLORS.text, fontSize: 13 }}>
                Intro → Trace → Recognition → Free draw
              </Text>
            </View>
          </View>

          <View
            style={{
              alignItems: "flex-end",
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: COLORS.teal,
              borderRadius: 12,
              paddingVertical: 6,
              paddingHorizontal: 10,
            }}
          >
            <Text style={{ color: COLORS.text, fontSize: 12 }}>Total stars</Text>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>⭐ {stars}</Text>
          </View>
        </View>

        {/* Hero Section */}
        <Card style={{ alignItems: "center", marginBottom: 16 }}>
          <Image
            source={require("../../assets/training-hero.png")}
            style={{
              width: 260,
              height: 180,
              resizeMode: "contain",
              marginBottom: 10,
            }}
          />
          <Text
            style={{
              fontSize: 22,
              fontWeight: "900",
              color: COLORS.navy,
              textAlign: "center",
            }}
          >
            Practice makes perfect!
          </Text>
          <Text
            style={{
              color: COLORS.text,
              marginTop: 6,
              textAlign: "center",
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            Earn ⭐ by finishing activities and unlock new challenges as you
            grow!
          </Text>
        </Card>

        {/* Buttons */}
        <View style={{ gap: 14 }}>
          <BigBtn
            href="/training/intro-letters"
            label="Intro (A–Z)"
            emoji="👶"
            primary
          />

          {unlocked ? (
            <BigBtn
              href="/training/common"
              label="Common Training"
              emoji="🎮"
            />
          ) : (
            <Pressable
              onPress={() => setShowLockedModal(true)}
              style={{
                backgroundColor: "#f8fafc",
                borderColor: "#cbd5e1",
                borderWidth: 1.4,
                borderRadius: 18,
                paddingVertical: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                shadowColor: "#000",
                shadowOpacity: 0.03,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <Text style={{ fontSize: 22 }}>🔒</Text>
              <Text
                style={{
                  fontWeight: "900",
                  color: "#64748b",
                  fontSize: 16,
                }}
              >
                Common Training (need {needed}⭐)
              </Text>
            </Pressable>
          )}

          <BigBtn
            href="/training/letters"
            label="Individual Letter Training"
            emoji="🔠"
          />
        </View>

        <Text
          style={{
            textAlign: "center",
            color: "#94a3b8",
            marginTop: 18,
            fontSize: 14,
          }}
        >
          Tip: Earn {STAR_THRESHOLD} ⭐ to unlock Common Training!
        </Text>
      </ScrollView>

      {/* Locked popup modal */}
      <Modal visible={showLockedModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 24,
              alignItems: "center",
              maxWidth: 320,
            }}
          >
            <Text style={{ fontSize: 46, marginBottom: 8 }}>🎮🔒</Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "900",
                color: COLORS.navy,
                textAlign: "center",
              }}
            >
              Common Training is Locked
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: 16,
                color: COLORS.text,
                textAlign: "center",
              }}
            >
              Earn{" "}
              <Text style={{ fontWeight: "900", color: COLORS.navy }}>
                {needed}
              </Text>{" "}
              more ⭐ to unlock this game!
            </Text>

            <Pressable
              onPress={() => setShowLockedModal(false)}
              style={{
                marginTop: 20,
                backgroundColor: COLORS.yellow,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.navy,
              }}
            >
              <Text
                style={{
                  fontWeight: "900",
                  color: COLORS.navy,
                  fontSize: 16,
                }}
              >
                OK
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
