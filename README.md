# Millie AI Chat

Build "Millie AI" (spelled with two L's: M-i-l-l-i-e), a sleek AI chat web app. Everything must run on free tiers; keep all API keys on the backend only (never in frontend code).

BRAND AND DESIGN
- Purple, minimal, refined look: thin borders, generous spacing, subtle transitions, soft glass-style sidebar.
- LOGO: a hollow, outline-only (no fill, transparent inside) small circle with three concentric curved sound-wave arcs to its left, all drawn as clean purple strokes. Use it in the header, sidebar, login screen, favicon, and the web app manifest icons. Keep the circle fairly small relative to the arcs.
- THEMES: three selectable purple accent palettes: Deep violet (dark and rich), Soft lavender (light and calm), and Bright electric purple. Plus light, dark, and system mode for each.
- FONTS: the default is a close match to Claude's interface typography: Newsreader (serif) for chat replies and headings, Inter for the UI. Offer 5 font choices in total: this Claude-style default, Space Grotesk, JetBrains Mono, Lora, and Outfit (Google Fonts).
- CUSTOMIZE button in the sidebar footer opening a panel: font (5 options), accent palette (3 presets plus a custom color picker), theme (light/dark/system), live preview, saved per user in the database.
- Responsive for mobile, and installable as a PWA (manifest and service worker) so it can be installed as an app on Windows and Android.

ACCOUNTS
- Signup/login is required on first visit (email and password).
- After registering, show an OPTIONAL, skippable onboarding that asks about the person's hobbies, their interests, and what they'll use AI for. Save the answers to their profile and use them for light personalization. A clear Skip button must always be visible.
- Account page: edit display name, upload an avatar, change email and password, sign out, delete account with a confirmation step.

CHAT
- Main chat interface with streaming replies, a sidebar of conversations (search, pin, rename, delete), and Export conversation as Markdown.
- Two modes with a mode switcher: "Chat" and "C0DE" (written with a zero). C0DE is a coding assistant (like a Codex/Copilot-style helper): technical look with monospace accents, a coding-focused system prompt, syntax-highlighted code blocks with a Copy button, and a Run button on JavaScript blocks that runs the code safely in a sandboxed iframe and shows the output below the block.
- Starter prompt cards on the empty screen, different for Chat and C0DE.
- Command palette on Ctrl+K: search chats, new chat, switch mode, open settings.

AI BACKEND (edge functions, keys read from secrets)
- Text chat: call the Groq API (chat completions, model llama-3.3-70b-versatile) using a secret named GROQ_API_KEY.
- Vision (understanding images and screenshots): call the Gemini API using a secret named GEMINI_API_KEY.
- Web search: a globe "Search the web" toggle next to the message box that uses the Gemini API's "Grounding with Google Search" tool (google_search) using GEMINI_API_KEY, showing the answer with a Sources list (title and link) from the grounding metadata. Also search automatically when the message clearly asks for current information (news, prices, scores, "latest", "today").
- If a key is missing or a request fails, show a clear friendly error telling the user to add the key in the project's secrets. Do not hardcode or ask for keys in the chat UI.

MEMORY
- Store durable facts about each user in a database table. After a conversation, make a small Groq call that extracts durable facts worth remembering (preferences, ongoing projects, routines) and saves them. Before each reply, quietly add the relevant saved facts to the system prompt (only those that matter to the current message, not a dump).
- Memory manager page where the user can see, edit, and delete saved facts.

PROJECTS (like Claude Projects)
- A Projects tab in the sidebar: create, rename, and delete projects, each with a name, description, custom instructions, and attached files/folders as project knowledge. Chats can be started inside a project and inherit its instructions and files; the project page lists its chats.

ATTACHMENTS AND SCREENSHOTS
- A paperclip menu next to the message box: Add image, Add file, Add folder (directory picker; include text/code files, skip node_modules, .git, and very large or binary files). Also support drag-and-drop and pasting images. Show removable chips/thumbnails above the input. Text and code file contents are sent as context; images go to Gemini vision.
- A Screenshot button using the browser's getDisplayMedia API: the user picks a screen, window, or tab, the app grabs one frame, stops capturing immediately, and attaches it as an image. Also add the shortcut Ctrl+Shift+S while the tab is focused. Add a small note that the web version only captures when the user clicks and never in the background.
- IMAGE REGION SELECT: when the user clicks an attached image or screenshot thumbnail, open a modal where they can drag a resizable selection rectangle, with two buttons: "Use selected area" (crop via canvas and replace the attachment) and "Use full image".

VOICE
- Microphone button to dictate messages and an option to read replies aloud (browser speech recognition and speech synthesis).
- "Hey Millie" wake word: a Settings toggle, OFF by default. When on, ask for microphone permission, show a small listening indicator near the logo, and use continuous speech recognition. On hearing "Hey Millie" (or variants like "hey mili"), play a soft chime, show "Listening...", capture the next spoken sentence, send it to the chat, and read the reply aloud. Auto-restart recognition if it stops, pause when the tab is hidden, add a note that it works only while the tab is open in Chrome or Edge and that audio may go to the browser's speech service, and provide a visible way to turn it off.

DATA AND SECURITY
- Database tables for profiles, user settings, conversations, messages, memory facts, projects, and project files, all with row-level security so each user can only access their own data.
- Use only free-tier services.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://millie-ai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1fdbfa53-cecd-48f2-aafd-b6c3e8813485).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
