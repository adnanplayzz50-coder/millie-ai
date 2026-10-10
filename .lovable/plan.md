# Millie AI updates

- Remove suggestions in both empty chat modes, reduce the logo, and show exactly “Hello how may I help ?”.
- Add built-in Google sign-in below the email/password form; send users who have not finished onboarding to onboarding.
- Make C0DE building replies stream complete projects, with live steps, expandable folders/files, and a ZIP download with the requested warning.
- Show a shimmering, cycling thinking label while awaiting the reply.
- Add the camera menu and a split-screen call using camera or screen sharing, an End control, and frozen-frame drawing sent with the next message. Keep existing dictation and read-aloud available.
- Repair preview errors and verify desktop/mobile screens and focused behavior tests.

## Assumptions
- Calls send a still frame with each submitted message, not continuous video or audio to an AI service.
- Existing Groq and Gemini services and model choices remain unchanged; live AI checks require their configured keys.

## Technical details
- Preserve the current theme, routes, account data and provider routing.
- Parse streamed project tags incrementally and use a browser-compatible ZIP library; reject unsafe archive paths.
- Stop media tracks on End, navigation and unmount; only capture after explicit permission.