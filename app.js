const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const scoreNode = document.querySelector("#score");
const fuelNode = document.querySelector("#fuel");
const timeNode = document.querySelector("#time");
const levelNode = document.querySelector("#level");
const bestScoreNode = document.querySelector("#bestScore");
const startBtn = document.querySelector("#startBtn");
const pauseBtn = document.querySelector("#pauseBtn");
const leftBtn = document.querySelector("#leftBtn");
const rightBtn = document.querySelector("#rightBtn");

const lanes = [canvas.width * 0.23, canvas.width * 0.5, canvas.width * 0.77];
const itemTypes = [
  { type: "package", icon: "📦", points: 20, fuel: 0 },
  { type: "fuel", icon: "⛽", points: 5, fuel: 18 },
  { type: "bus", icon: "🚌", points: -25, fuel: -16 },
  { type: "pothole", icon: "🕳️", points: -10, fuel: -24 }
];

let player = { lane: 1, y: canvas.height - 82, size: 58 };
let objects = [];
let score = 0;
let fuel = 100;
let time = 60;
let level = 1;
let frame = 0;
let running = false;
let paused = false;
let animationId = null;
let timerId = null;
let bestScore = Number(localStorage.getItem("lagosDeliveryBest") || 0);

bestScoreNode.textContent = bestScore;

function drawRoad() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#07111f");
  sky.addColorStop(0.48, "#111827");
  sky.addColorStop(1, "#0f172a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawLagosScenery();

  const road = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  road.addColorStop(0, "#152238");
  road.addColorStop(0.52, "#1f2f4a");
  road.addColorStop(1, "#102a43");
  ctx.fillStyle = road;
  ctx.beginPath();
  ctx.moveTo(120, 0);
  ctx.lineTo(canvas.width - 120, 0);
  ctx.lineTo(canvas.width - 38, canvas.height);
  ctx.lineTo(38, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
  ctx.lineWidth = 4;
  ctx.shadowColor = "rgba(56, 189, 248, 0.45)";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "rgba(250, 204, 21, 0.95)";
  ctx.lineWidth = 6;
  ctx.shadowColor = "rgba(250, 204, 21, 0.55)";
  ctx.shadowBlur = 10;
  ctx.setLineDash([30, 28]);
  for (let i = 1; i < 3; i += 1) {
    const x = (canvas.width / 3) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(34, 211, 238, 0.18)";
  for (let y = -40 + (frame % 80); y < canvas.height; y += 80) {
    ctx.fillRect(24, y, 44, 14);
    ctx.fillRect(canvas.width - 68, y + 30, 44, 14);
  }
}

function drawLagosScenery() {
  const drift = frame % 120;
  const buildings = [
    ["#22d3ee", 34, 130],
    ["#a78bfa", 68, 92],
    ["#f97316", 760, 118],
    ["#ec4899", 820, 82],
    ["#facc15", 870, 148]
  ];

  buildings.forEach(([color, x, height], index) => {
    const y = canvas.height - height - ((drift + index * 20) % 90);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.52;
    ctx.fillRect(x, Math.max(28, y), 52, height);
    ctx.fillStyle = "rgba(250,204,21,0.72)";
    for (let row = 0; row < 4; row += 1) {
      ctx.fillRect(x + 12, Math.max(40, y + 14 + row * 22), 10, 9);
      ctx.fillRect(x + 30, Math.max(40, y + 14 + row * 22), 10, 9);
    }
    ctx.globalAlpha = 1;
  });

  ctx.fillStyle = "rgba(125,211,252,0.16)";
  ctx.beginPath();
  ctx.arc(188, 72, 22, 0, Math.PI * 2);
  ctx.arc(212, 72, 28, 0, Math.PI * 2);
  ctx.arc(242, 76, 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawEmoji(icon, x, y, size) {
  ctx.save();
  ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;
  ctx.fillText(icon, x, y);
  ctx.restore();
}

function drawPlayer() {
  const x = lanes[player.lane];
  ctx.fillStyle = "rgba(15, 118, 110, 0.28)";
  ctx.beginPath();
  ctx.ellipse(x, player.y + 34, 40, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  drawEmoji("🛵", x, player.y, player.size);
}

function spawnObject() {
  const lane = Math.floor(Math.random() * lanes.length);
  const roll = Math.random();
  const type = roll < 0.5 ? itemTypes[0] : roll < 0.65 ? itemTypes[1] : roll < 0.86 ? itemTypes[2] : itemTypes[3];
  objects.push({
    ...type,
    lane,
    x: lanes[lane],
    y: -50,
    size: type.type === "bus" ? 54 : 46,
    vy: 3 + level * 0.55 + Math.random() * 1.8
  });
}

function updateHud() {
  scoreNode.textContent = score;
  fuelNode.textContent = Math.max(0, Math.round(fuel));
  timeNode.textContent = time;
  levelNode.textContent = level;
  bestScoreNode.textContent = bestScore;
  document.documentElement.style.setProperty("--game-hue", String(140 + level * 28));
  document.documentElement.style.setProperty("--bg-shift", `${(player.lane - 1) * 1.8}%`);
}

function hitObject(object) {
  return object.lane === player.lane && Math.abs(object.y - player.y) < 48;
}

function applyPickup(object) {
  score = Math.max(0, score + object.points);
  fuel = Math.min(100, Math.max(0, fuel + object.fuel));
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("lagosDeliveryBest", String(bestScore));
  }
  updateHud();
}

function drawOverlay(title, subtitle) {
  ctx.fillStyle = "rgba(17, 24, 39, 0.74)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "900 48px Arial";
  ctx.textAlign = "center";
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 14);
  ctx.font = "700 20px Arial";
  ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 26);
  ctx.textAlign = "left";
}

function endGame(reason) {
  running = false;
  paused = false;
  clearInterval(timerId);
  cancelAnimationFrame(animationId);
  pauseBtn.disabled = true;
  pauseBtn.textContent = "Pause";
  drawRoad();
  objects.forEach(object => drawEmoji(object.icon, object.x, object.y, object.size));
  drawPlayer();
  drawOverlay("Shift complete", `${reason} Final score: ${score}`);
}

function loop() {
  drawRoad();
  drawPlayer();

  if (!paused) {
    if (frame % Math.max(24, 56 - level * 5) === 0) spawnObject();
    objects.forEach(object => {
      object.y += object.vy;
      drawEmoji(object.icon, object.x, object.y, object.size);
    });
    objects = objects.filter(object => {
      if (hitObject(object)) {
        applyPickup(object);
        return false;
      }
      return object.y < canvas.height + 70;
    });
    fuel -= 0.035 + level * 0.01;
    if (fuel <= 0) {
      updateHud();
      endGame("Out of fuel.");
      return;
    }
    frame += 1;
  } else {
    objects.forEach(object => drawEmoji(object.icon, object.x, object.y, object.size));
    drawOverlay("Paused", "Press Resume or Space to keep riding.");
  }

  updateHud();
  if (running) animationId = requestAnimationFrame(loop);
}

function startGame() {
  clearInterval(timerId);
  cancelAnimationFrame(animationId);
  objects = [];
  score = 0;
  fuel = 100;
  time = 60;
  level = 1;
  frame = 0;
  running = true;
  paused = false;
  startBtn.textContent = "Restart";
  pauseBtn.disabled = false;
  pauseBtn.textContent = "Pause";
  updateHud();
  timerId = setInterval(() => {
    if (!running || paused) return;
    time -= 1;
    level = Math.min(6, 1 + Math.floor((60 - time) / 12));
    updateHud();
    if (time <= 0) endGame("Time is up.");
  }, 1000);
  loop();
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
}

function movePlayer(direction) {
  player.lane = Math.max(0, Math.min(lanes.length - 1, player.lane + direction));
}

document.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") movePlayer(-1);
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") movePlayer(1);
  if (event.code === "Space") {
    event.preventDefault();
    togglePause();
  }
});

document.addEventListener("pointermove", event => {
  document.documentElement.style.setProperty("--cursor-x", `${(event.clientX / window.innerWidth) * 100}%`);
  document.documentElement.style.setProperty("--cursor-y", `${(event.clientY / window.innerHeight) * 100}%`);
});

leftBtn.addEventListener("click", () => movePlayer(-1));
rightBtn.addEventListener("click", () => movePlayer(1));
startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);

drawRoad();
drawPlayer();
drawOverlay("Ready?", "Start your Lagos delivery shift.");
