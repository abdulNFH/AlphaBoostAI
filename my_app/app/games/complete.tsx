import React, { useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from "react-native";
import * as Haptics from "expo-haptics";

import { COLORS } from "../../constants/colors";
import ConfettiBurst from "../../components/ConfettiBurst";
import { speak } from "../../lib/tts";
import { safeBack } from "../../lib/nav";

export default function AdventureComplete() {
  const scale = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    speak("Amazing! You finished the letter adventure!");

    // pop-in animation
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 14,
    }).start();

    // floating trophy animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -6, duration: 1200, useNativeDriver: true }),
        Animated.timing(float, { toValue: 6, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: "Adventure Complete" }} />

      <View style={styles.wrap}>
        <ConfettiBurst count={40} duration={1800} />

        <Animated.View
          style={[
            styles.badge,
            { transform: [{ scale }, { translateY: float }] },
          ]}
        >
          <Text style={{ fontSize: 64 }}>🏆</Text>
        </Animated.View>

        <Text style={styles.heading}>You did it!</Text>
        <Text style={styles.sub}>
          You successfully completed the Letter Adventure.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌟 What’s next?</Text>
          <Text style={styles.cardText}>
            A brand new adventure is{" "}
            <Text style={{ fontWeight: "900", color: COLORS.navy }}>
              coming soon
            </Text>
            ! Get ready for more games and challenges.
          </Text>
        </View>

        <View style={styles.buttons}>
          <Pressable
            style={[styles.btn, styles.primary]}
            onPress={() => router.replace("/games")}
          >
            <Text style={styles.primaryTxt}>Back to Games</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, styles.secondary]}
            onPress={safeBack}
          >
            <Text style={styles.secondaryTxt}>Exit</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.card,
    borderWidth: 3,
    borderColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  heading: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.navy,
    textAlign: "center",
  },
  sub: {
    color: COLORS.text,
    marginTop: 6,
    textAlign: "center",
  },
  card: {
    marginTop: 16,
    width: "92%",
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
  },
  cardTitle: {
    fontWeight: "900",
    color: COLORS.navy,
    marginBottom: 6,
    fontSize: 16,
  },
  cardText: {
    color: COLORS.text,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
  },
  primary: { backgroundColor: COLORS.navy, borderColor: COLORS.teal },
  primaryTxt: { color: "#fff", fontWeight: "900" },
  secondary: { backgroundColor: COLORS.card, borderColor: COLORS.teal },
  secondaryTxt: { color: COLORS.navy, fontWeight: "900" },
});
