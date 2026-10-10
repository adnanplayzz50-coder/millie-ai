export function authDestination(onboarded: boolean | null | undefined): "/chat" | "/onboarding" {
  return onboarded === true ? "/chat" : "/onboarding";
}