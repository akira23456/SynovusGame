const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const QRCode = require('qrcode');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;

let gameState = {
    status: 'waiting', // waiting, countdown, racing, finished
    players: [],
    teams: [],
    raceStartTime: null,
    countdownTime: 3
};

const RACE_DISTANCE = 100; // 100%
const STAGGER_TIMES = [0, 0, 0]; // Team 1: 0s, Team 2: 2s delay, Team 3: 4s delay
const TAPS_TO_WIN = 2000; // Exactly 2000 taps to finish
const SPEED_PER_TAP = 100 / TAPS_TO_WIN; // 0.05% per tap = 2000 taps to reach 100%
const FRICTION = 0; // No friction - every tap counts exactly

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/play', (req, res) => {
    res.sendFile(path.join(__dirname, 'player.html'));
});

app.use(express.static(__dirname));

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

app.get('/qr', async (req, res) => {
    try {
        const url = 'https://synovusgame.onrender.com/play'; // 🌍 your Render app's public URL
        const qrCode = await QRCode.toDataURL(url);
        res.json({ qrCode, url });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    socket.emit('gameState', gameState);

    socket.on('joinGame', (playerName) => {
        if (gameState.status === 'waiting') {
            const player = { 
                id: socket.id, 
                name: playerName, 
                teamId: null,
                taps: 0 
            };
            gameState.players.push(player);
            io.emit('gameState', gameState);
            console.log(`Player joined: ${playerName}`);
        }
    });

    socket.on('tap', () => {
        // CRITICAL: Triple-check to prevent pre-tapping before gate opens
        if (gameState.status === 'racing') {
            const player = gameState.players.find(p => p.id === socket.id);
            if (player && player.teamId) {
                const team = gameState.teams.find(t => t.id === player.teamId);
                
                // Only accept taps if:
                // 1. Team exists
                // 2. Team's gate has opened (canRace = true)
                // 3. Team hasn't finished yet
                // 4. Team is not disrupted
                if (team && team.canRace && !team.finished && !team.disrupted) {
                    player.taps++;
                    team.velocity += SPEED_PER_TAP;
                    team.totalTaps++;
                }
                // If team.canRace is false, tap is silently ignored (gate not open yet)
                // If team.finished is true, tap is ignored (already at 1000 taps)
                // If team.disrupted is true, tap is ignored (service disconnection)
            }
        }
    });

    socket.on('startGame', () => {
        if (gameState.players.length >= 3) {
            startRace();
        }
    });

    socket.on('skipToFinish', () => {
        // Testing feature: skip to finish
        if (gameState.status === 'racing' || gameState.status === 'countdown') {
            gameState.teams.forEach(team => {
                team.position = RACE_DISTANCE;
                team.finishTime = Date.now();
                if (team.startTime) {
                    team.raceTime = ((team.finishTime - team.startTime) / 1000).toFixed(2);
                } else {
                    team.raceTime = '0.00';
                }
            });
            gameState.status = 'finished';
            calculateResults();
            io.emit('gameState', gameState);
        }
    });

    socket.on('resetGame', () => {
        gameState = {
            status: 'waiting',
            players: [],
            teams: [],
            raceStartTime: null,
            countdownTime: 3
        };
        io.emit('gameState', gameState);
    });

    socket.on('disconnect', () => {
        gameState.players = gameState.players.filter(p => p.id !== socket.id);
        io.emit('gameState', gameState);
    });
});

function startRace() {
    assignTeams();
    gameState.status = 'countdown';
    gameState.countdownTime = 3;
    io.emit('gameState', gameState);
    
    // Countdown
    const countdownInterval = setInterval(() => {
        gameState.countdownTime--;
        io.emit('gameState', gameState);
        
        if (gameState.countdownTime <= 0) {
            clearInterval(countdownInterval);
            gameState.status = 'racing';
            gameState.raceStartTime = Date.now();
            
            // Staggered start for teams
            gameState.teams.forEach((team, idx) => {
                team.canRace = false;
                setTimeout(() => {
                    team.canRace = true;
                    team.startTime = Date.now();
                    io.emit('teamStarted', team.id);
                    io.emit('gameState', gameState);
                }, STAGGER_TIMES[idx]);
            });
            
            startRaceLoop();
        }
    }, 1000);
}

function startRaceLoop() {
    const raceInterval = setInterval(() => {
        let allFinished = true;
        
        gameState.teams.forEach(team => {
            if (team.canRace && !team.finished) {
                // Update timer
                if (team.startTime) {
                    team.currentTime = ((Date.now() - team.startTime) / 1000).toFixed(2);
                }
                
                // DEMO: Service disruption scenarios
                // Team C at 1200 taps - full disconnection
                if (team.name === 'Horse C' && team.totalTaps >= 1200 && !team.disrupted) {
                    team.disrupted = true;
                    team.disruptionType = 'disconnected';
                    io.emit('serviceDisruption', { teamId: team.id, type: 'disconnected' });
                    console.log(`DEMO: Team C service disconnection at 1200 taps`);
                }
                
                // Team B at 1750 taps - disconnected and cannot tap, but horse continues to finish
                if (team.name === 'Horse B' && team.totalTaps >= 1750 && !team.disrupted) {
                    team.disrupted = true;
                    team.disruptionType = 'disconnected';
                    io.emit('serviceDisruption', { teamId: team.id, type: 'disconnected' });
                    console.log(`DEMO: Team B service disconnection at 1750 taps - but horse continues momentum`);
                    
                    // Give Team B momentum to continue to finish (250 taps worth of progress)
                    // This simulates the system completing the transaction despite the disconnection
                    team.momentum = true;
                    team.momentumTicks = 0;
                    team.momentumPerTick = 0.05; // 0.05% per tick to finish remaining 250 taps
                }
                
                // Apply velocity to position (no friction!)
                team.position += team.velocity;
                team.velocity = 0; // Reset velocity each tick (instant response to taps)
                
                // Apply momentum if team has it (continues moving after disconnection)
                if (team.momentum) {
                    team.position += team.momentumPerTick;
                    team.momentumTicks++;
                }
                
                // Check if team reached 1000 taps (100%)
                if (team.position >= RACE_DISTANCE && !team.finished) {
                    team.position = RACE_DISTANCE;
                    team.finished = true;
                    team.finishTime = Date.now();
                    team.raceTime = ((team.finishTime - team.startTime) / 1000).toFixed(2);
                    console.log(`${team.name} FINISHED! Time: ${team.raceTime}s, Taps: ${team.totalTaps}`);
                }
                
                if (!team.finished) {
                    allFinished = false;
                }
            } else if (!team.canRace) {
                allFinished = false; // Team hasn't started yet
            }
        });
        
        io.emit('gameState', gameState);
        
        // End race when all teams finish
        if (allFinished) {
            clearInterval(raceInterval);
            gameState.status = 'finished';
            calculateResults();
            io.emit('gameState', gameState);
        }
    }, 50); // 20 FPS
}

function assignTeams() {
    const shuffled = [...gameState.players].sort(() => Math.random() - 0.5);
    const totalPlayers = shuffled.length;
    const baseTeamSize = Math.floor(totalPlayers / 3);
    const extras = totalPlayers % 3; // 0, 1, or 2 extra players
    
    gameState.teams = [];

    const teamNames = ['Horse A', 'Horse B', 'Horse C'];
    const teamColors = ['#ef4444', '#3b82f6', '#10b981'];
    const teamEmojis = ['🐴', '🐴', '🐴'];
    
    let currentIndex = 0;
    
    for (let i = 0; i < 3; i++) {
        // Team A gets first extra, Team B gets second extra, Team C gets none
        let teamSize = baseTeamSize;
        if (i === 0 && extras >= 1) teamSize++; // Team A gets extra if 1 or 2 extras
        if (i === 1 && extras >= 2) teamSize++; // Team B gets extra if 2 extras
        
        const teamMembers = shuffled.slice(currentIndex, currentIndex + teamSize);
        currentIndex += teamSize;
        
        if (teamMembers.length > 0) {
            const team = {
                id: i + 1,
                name: teamNames[i],
                color: teamColors[i],
                emoji: teamEmojis[i],
                members: teamMembers.map(p => p.name),
                position: 0,
                velocity: 0,
                canRace: false,
                startTime: null,
                finishTime: null,
                raceTime: null,
                currentTime: '0.00',
                finished: false,
                disrupted: false,
                disruptionType: null,
                totalTaps: 0,
                staggerDelay: STAGGER_TIMES[i] / 1000
            };
            gameState.teams.push(team);
            
            teamMembers.forEach(player => {
                const p = gameState.players.find(pl => pl.id === player.id);
                if (p) p.teamId = i + 1;
            });
        }
    }
}

function calculateResults() {
    // Sort by finish time (who reached 1000 taps first)
    // Teams that finished go first, sorted by time
    // Teams that didn't finish go last, sorted by position
    gameState.teams.sort((a, b) => {
        if (a.finished && !b.finished) return -1;
        if (!a.finished && b.finished) return 1;
        if (a.finished && b.finished) {
            return parseFloat(a.raceTime) - parseFloat(b.raceTime);
        }
        return b.position - a.position;
    });
    
    // Winner is the team with fastest time
    gameState.winner = gameState.teams[0].name;
}

server.listen(PORT, () => {
    const ip = getLocalIP();
    console.log(`\n🏇 Horse Racing Game!\n`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🖥️  Admin Display: https://synovusgame.onrender.com`);
    console.log(`📱 Players Join:   https://synovusgame.onrender.com/play`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
