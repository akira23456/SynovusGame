🏇 Horse Racing Game - Transaction Tracker Demo
An exciting, interactive multiplayer game that demonstrates Synovus' Transaction Tracer System through a competitive horse race where players spam-tap their phones to move their team's horse to victory!
🎮 What Is This?
A real-time multiplayer game where:

Players join via QR code on their phones
Randomly assigned to 3 teams (Horse A, B, or C)
Race with staggered starts (A starts first, B after 2s, C after 4s)
Tap frantically to make their horse go faster
First horse to cross the finish line wins!

After the race, players learn how the game mirrors Synovus' Transaction Tracer System.

🚀 Quick Start
Prerequisites

Node.js (v14 or higher)
npm (comes with Node.js)
WiFi network (all devices must be on same network)

Installation
bash# 1. Navigate to the game folder
cd ~/Desktop/files

# 2. Install dependencies
npm install

# 3. Start the server
npm start
You'll see:
🏇 Horse Racing Game!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖥️  Admin Display: https://synovusgame.onrender.com/
📱 Players Join:  https://synovusgame.onrender.com/play
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Setup for Presentation
Players scan QR code or visit the /play URL
Once 3+ players join, click "Start Race!"


🎯 How the Game Works
The Setup
3 Horses racing on straight tracks:

Horse A 🐴 ━━━━━━━━━━━━━━━━━━━━━━━► FINISH
         [Starts at 0 seconds]

Horse B 🐴 ━━━━━━━━━━━━━━━━━━━━━━━► FINISH
         [Starts at 2 seconds]

Horse C 🐴 ━━━━━━━━━━━━━━━━━━━━━━━► FINISH
         [Starts at 4 seconds]
The Race Flow

Players Join → Scan QR, enter name, assigned to team
Teams Announced → See which horse and teammates
Countdown → 3... 2... 1...
Staggered Start → Gates open at 0s, 2s, 4s
RACE! → Tap giant button, all taps help same horse
Finish → First horse to cross wins, game ends immediately
The Reveal → Learn about Synovus Tracer System


📱 What Players See on Their Phone
Racing Screen Layout (Top to Bottom):
┌─────────────────────────────┐
│      You are:               │
│      Horse A                │ ← Your team name
├─────────────────────────────┤
│ Horse A   Horse B   Horse C │
│   234       189       156   │ ← All teams' tap counts
├─────────────────────────────┤
│ TAP TAP TAP!!!              │
│ [████████░░░░] 80%          │ ← Your progress
├─────────────────────────────┤
│                             │
│        [GIANT TAP           │
│         BUTTON]             │ ← Spam this!
│         👆 TAP!             │
│        234 taps             │
│                             │
└─────────────────────────────┘

🖥️ Admin Display Features
Shows:

QR code for joining (during setup)
Race tracks with 3 horses
Start gates that disappear when opened
Real-time horse movement (animated)
Live tap statistics for each team
Finish line and race completion
Podium with winner celebration
Educational reveal about Tracer System


⚙️ Game Settings
Current configuration in server.js:
javascriptconst RACE_DISTANCE = 100;              // 100% to finish
const STAGGER_TIMES = [0, 2000, 4000];  // 0s, 2s, 4s delays
const SPEED_PER_TAP = 0.04;             // ~600 taps needed per team
const FRICTION = 0.02;                  // Natural slowdown
To Adjust Difficulty:
Make it easier (fewer taps):
javascriptconst SPEED_PER_TAP = 0.08;  // ~300 taps to win
Make it harder (more taps):
javascriptconst SPEED_PER_TAP = 0.02;  // ~1200 taps to win

🎓 Educational Connection
Game → Real Synovus System
Game FeatureReal System🐴 HorsesFinancial Transactions🚪 Staggered StartPriority Transaction Levels👆 TappingSystem Processing Power📊 Real-time StatsTracer Dashboard🏁 Race TrackTransaction Pipeline⏱️ Finish TimesLatency Measurements
The Reveal
Players learn that just like tracking horses through the race, Synovus' Tracer System tracks every transaction with:

Complete visibility from start to finish
Priority level management
Real-time monitoring
Latency measurement
No transactions lost or unaccounted for


🎪 Tips for Presenters
Build Energy During Race:

"Horse A takes off first!"
"Gate opening for Horse B... NOW!"
"Look at those taps! Horse C catching up!"
"WHO'S GONNA WIN?!"

Explain While Racing:

"Notice Horse A started first - that's priority transactions"
"Every tap is processing power"
"Horse C can still win with aggressive tapping!"

After the Race:

Congratulate winner
Show podium
Click "Show The Reveal"
Explain connections to real system


🐛 Troubleshooting
Players Can't Connect

✅ All devices on same WiFi?
✅ Using network IP (not localhost)?
✅ Firewall allowing Node.js?
✅ Try manual URL instead of QR code

Game Won't Start

✅ Need minimum 3 players
✅ Check player count on screen

Horses Not Moving

✅ Players must tap actively
✅ Check gates have opened
✅ Verify phones on racing screen


🎯 Best Practices
Optimal Setup

Players: 6-18 people (2-6 per team)
Duration: 2-3 minutes per race
Display: Large screen or projector
WiFi: Strong, stable connection

For Success

Test with 2-3 people first
Explain rules before starting
Narrate the race energetically
Connect back to education at end
Answer questions about real system


🎨 Quick Customization
Change Difficulty
Edit server.js:
javascriptconst SPEED_PER_TAP = 0.06;  // Easier
const SPEED_PER_TAP = 0.03;  // Harder
Change Stagger Times
javascriptconst STAGGER_TIMES = [0, 3000, 6000];  // 0s, 3s, 6s

📁 Files Included

server.js - Game engine and logic
admin.html - Main display interface
player.html - Mobile player interface
package.json - Dependencies
README.md - This file


🆘 Quick Fixes
Server won't start:
bashnpm install
Wrong IP address:
bash# Mac/Linux: ifconfig
# Windows: ipconfig
Port already in use:
javascript// In server.js, change:
const PORT = 3001;

🎮 Ready to Race!
bashnpm install
npm start
# Open localhost:3000
# Scan QR code
# START RACE!
