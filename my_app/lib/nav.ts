import { router } from "expo-router";

/**
 * Safe back navigation:
 * - If there is a previous screen in the stack → go back.
 * - Otherwise → go to the games hub.
 */
export function safeBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/games"); // adjust if your hub is a different path
  }
}
