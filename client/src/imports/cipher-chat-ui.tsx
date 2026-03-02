Design a minimalistic, modern chat application UI called "Cipher" (or any sleek one-word name you prefer).
Layout
The app has a two-panel layout:

A narrow left sidebar (about 260px wide)
A main chat area on the right that takes up the remaining space


Left Sidebar
The sidebar has a dark background (very dark gray, like #0f0f0f or #111111), slightly darker than the main area.
At the top, display the app logo/name in small, clean text with a subtle lock icon next to it.
Below the logo, there are two full-width buttons stacked vertically:

"Create Room" — solid accent color button (use a deep violet or electric blue like #6366f1 or #3b82f6), white text, rounded corners, slightly glowing box shadow
"Join Room" — outlined/ghost button style, same accent color border, white text, transparent background

Below the buttons, show a "Recent Rooms" section header in tiny muted text. Under it, display 2-3 placeholder room entries in the sidebar. Each room entry shows:

A small colored dot (green = active, gray = inactive)
A short room code in monospace font (e.g., xK9#mP2)
A tiny lock icon if password protected
Subtle hover highlight on each entry

The sidebar has no other clutter. Clean, spacious padding throughout.

Create Room Popup / Modal
When the user clicks "Create Room", a centered modal appears with a dark frosted-glass style background overlay.
The modal contains:

Title: "Create a New Room" in medium bold white text
Subtitle: small muted text saying "Share the room code with someone to start chatting"
A generated room code displayed in a large monospace box (e.g., xK9#mP2) with a subtle border and a small copy icon on the right
A toggle switch labeled "Password Protect this Room" — off by default
When the toggle is turned ON, smoothly animate in a password input field below it with placeholder text "Set a password..."
Two buttons at the bottom:

"Create Room" — solid accent color, full width
"Cancel" — ghost/text button below it



The modal should have smooth rounded corners, subtle drop shadow, and feel premium.

Join Room Panel
When the user clicks "Join Room", either a modal or an inline panel slides in (your choice — modal preferred for consistency).
The modal contains:

Title: "Join a Room"
A single text input: placeholder "Enter room code..." in monospace font
Below it, a password field that appears conditionally with placeholder "Enter password (if required)" — show it as always visible but grayed out until a code is entered, or reveal it dynamically
A "Join" button — solid accent, full width
Small muted text at the bottom: "Room codes are case-sensitive"


Main Chat Area
The main area has a slightly lighter dark background (#1a1a1a or #161616).
Show an empty/idle state in the center when no room is active:

A large subtle lock icon or encrypted chat illustration
Heading: "No active session"
Subtext: "Create or join a room to start a private, encrypted conversation"
The text and icon should be muted/dimmed, not distracting

At the very top of the main area, show a thin top bar with:

Room code on the left in monospace, small size
A green pulsing dot + "Encrypted & Connected" status text in the center or right
A small export icon button and a trash/clear icon on the far right

At the bottom, show a message input bar (even in idle state, just disabled/dimmed):

Rounded pill-shaped input field
A send button on the right (arrow icon, accent color)
Small lock icon on the left inside the input as a visual cue


Visual Style

Color palette: Near-black backgrounds, white/light gray text, one strong accent color (violet #6366f1 or blue #3b82f6), muted greens for status indicators
Typography: Clean sans-serif (Inter or similar) for UI text, monospace for room codes
Feel: Premium, minimal, slightly techy — think Linear or Vercel's design language but for a secure chat app
No gradients except for very subtle ones on buttons. No heavy borders. Lots of breathing room.
Smooth transitions on all interactive elements (modal open/close, toggle, hover states)


Generate the complete frontend UI for this application.