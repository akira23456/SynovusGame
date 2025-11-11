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
const STAGGER_TIMES = [0, 2000, 4000]; // Team 1: 0s, Team 2: 2s delay, Team 3: 4s delay
const SPEED_PER_TAP = 0.04; // How much progress per tap (reduced to require ~600 taps per team)
const FRICTION = 0.02; // Natural slowdown per tick (reduced)

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
        const url = 'https://synovusgame.onrender.com/play'; // 🌍 your Render app’s public URL
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
        if (gameState.status === 'racing') {
            const player = gameState.players.find(p => p.id === socket.id);
            if (player && player.teamId) {
                const team = gameState.teams.find(t => t.id === player.teamId);
                if (team && team.canRace) {
                    player.taps++;
                    team.velocity += SPEED_PER_TAP;
                    team.totalTaps++;
                }
            }
        }
    });

    socket.on('startGame', () => {
        if (gameState.players.length >= 3) {
            startRace();
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
        let raceOver = false;
        
        gameState.teams.forEach(team => {
            if (team.canRace && team.position < RACE_DISTANCE) {
                // Apply velocity to position
                team.position += team.velocity;
                
                // Apply friction
                team.velocity = Math.max(0, team.velocity - FRICTION);
                
                // Cap position at finish line
                if (team.position >= RACE_DISTANCE) {
                    team.position = RACE_DISTANCE;
                    if (!team.finishTime) {
                        team.finishTime = Date.now();
                        team.raceTime = ((team.finishTime - team.startTime) / 1000).toFixed(2);
                        raceOver = true; // End race as soon as first horse finishes
                    }
                }
            }
        });
        
        // End race when first horse finishes
        if (raceOver) {
            clearInterval(raceInterval);
            
            // Set finish times for remaining teams
            gameState.teams.forEach(team => {
                if (!team.finishTime) {
                    team.finishTime = Date.now();
                    team.raceTime = team.startTime ? ((team.finishTime - team.startTime) / 1000).toFixed(2) : 'DNF';
                }
            });
            
            gameState.status = 'finished';
            calculateResults();
        }
        
        io.emit('gameState', gameState);
    }, 50); // 20 FPS
}

function assignTeams() {
    const shuffled = [...gameState.players].sort(() => Math.random() - 0.5);
    const teamSize = Math.ceil(shuffled.length / 3);
    gameState.teams = [];

    const teamNames = ['Horse A', 'Horse B', 'Horse C'];
    const teamColors = ['#ef4444', '#3b82f6', '#10b981'];
    const teamEmojis = ['🐴', '🐴', '🐴'];
    
    for (let i = 0; i < 3; i++) {
        const teamMembers = shuffled.slice(i * teamSize, (i + 1) * teamSize);
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
    // Sort by finish time
    gameState.teams.sort((a, b) => {
        if (!a.finishTime) return 1;
        if (!b.finishTime) return -1;
        return (a.finishTime - a.startTime) - (b.finishTime - b.startTime);
    });
    
    gameState.winner = gameState.teams[0].name;
}

server.listen(PORT, () => {
    console.log(`\n🏇 Horse Racing Game Live!\n`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🖥️  Admin Display: https://synovusgame.onrender.com`);
    console.log(`📱 Players Join:   https://synovusgame.onrender.com/play`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

