# desopoll

A self-hosted platform for **live quizzes and polls**: the host projects questions on a shared screen, participants answer from their own phone after joining with a PIN, and scores update in real time between questions.

Designed both for **training and certifications** (long, scenario-style questions like VMware VCP or AWS, with images and diagrams) and for **live engagement** (classes, events, team building).

---

## What it does

- **Live games with a PIN** — the host starts a session and gets a PIN; players join from a browser/phone with the PIN and a nickname, no account required.
- **Two tailored views** — a *host* screen (projector) and a *player* screen (mobile), designed independently.
- **Scoring by accuracy and speed**, with an interim leaderboard between questions and a **final podium**.
- **Post-game analytics** per player and per question.

## Question types

Built around an extensible question-type registry. Planned types:

- Single choice
- Multiple choice (several correct answers)
- True / False
- Open text answer
- Numeric and slider/range
- Ordering (reorder)
- Poll (no scoring)
- Word cloud

Every question is configured individually: **long text** always shown in full, an attached **image** (openable full screen), a **dedicated time limit**, **points** (standard / double / none) and a speed bonus.

## Multi-language support

The platform is **multilingual**, on two levels:

- **Localized interface** — the application UI is available in multiple languages.
- **Multilingual quiz content** — a quiz can hold its questions and answers in more than one language.
- **Language selection at game time** — when a session is launched, the presentation language is selected, and questions and answers are shown to players in the chosen language.

The data model keeps translations alongside each quiz/question so the same quiz can be hosted in different languages without duplicating it.

## Administration and sharing

- **Roles**: *Administrator* (manages users and groups) and *User* (creates and owns their own polls). Management/content separation: the administrator manages accounts but does not access others' content by default.
- **User groups**, with member management.
- **Poll ownership** per user and **sharing** with individual users or whole groups.
- **Permission levels**, increasing: *View only* → *Can play/host* → *Can edit* → *Co-owner*. When multiple permissions apply (direct and via group), the highest always wins.
- **Revocable join link** (play mode only).

## Interface

A **liquid glass** design on a light theme: translucent panels, a pastel palette, and a responsive layout optimized for the two views (host and player).

## Architecture

- **Swappable real-time layer**: the game logic depends on a single transport interface with two interchangeable implementations — **HTTP polling** (works on shared hosting) and **WebSocket** (for environments with a persistent process, e.g. a VPS). Switching between them requires no changes to the game logic.
- **Server-authoritative game state** (lobby → question → collection → results → leaderboard → podium), with response times computed on the server.
- **Extensible data model**: polymorphic questions by type; users, groups, shares and translations handled with dedicated, additive tables.

## Project status

🎨 **Design phase complete** — flows, data model, and mockups for every screen (game, editor, administration, sharing, analytics).

🛠️ **Implementation** — getting started.

## License

Distributed under the terms of the [LICENSE](LICENSE) file.
