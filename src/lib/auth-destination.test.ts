import { expect, it } from "vitest";
import { authDestination } from "./auth-destination";
it("sends first-time Google accounts to onboarding", () => {
  expect(authDestination(false)).toBe("/onboarding");
  expect(authDestination(undefined)).toBe("/onboarding");
});
it("sends returning onboarded accounts to chat", () => {
  expect(authDestination(true)).toBe("/chat");
});