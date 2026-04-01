const els = {
  age: document.getElementById("age"),
  hp: document.getElementById("hp"),
  intelligence: document.getElementById("intelligence"),
  strength: document.getElementById("strength"),
  mood: document.getElementById("mood"),
  wealth: document.getElementById("wealth"),
  restartBtn: document.getElementById("restartBtn"),
  nextYearBtn: document.getElementById("nextYearBtn"),
  autoBtn: document.getElementById("autoBtn"),
  logList: document.getElementById("logList")
};

const state = {
  age: 0,
  alive: true,
  stats: { hp: 0, intelligence: 0, strength: 0, mood: 0, wealth: 0 },
  firedOnceEvents: new Set(),
  config: null,
  autoRunning: false
};

async function loadConfig() {
  const res = await fetch("./events.json");
  if (!res.ok) {
    throw new Error("无法加载 events.json");
  }
  return res.json();
}

function clampStats(stats) {
  for (const key of Object.keys(stats)) {
    if (typeof stats[key] !== "number") {
      stats[key] = 0;
      continue;
    }
    if (key === "hp") {
      stats[key] = Math.max(0, Math.min(100, stats[key]));
    } else {
      stats[key] = Math.max(0, Math.min(999, stats[key]));
    }
  }
}

function addLog(text) {
  const li = document.createElement("li");
  li.textContent = text;
  els.logList.prepend(li);
}

function randomByWeight(items) {
  const total = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight || 1;
    if (r <= 0) return item;
  }
  return items[items.length - 1] || null;
}

function checkCondition(stats, condition) {
  const { stat, op, value } = condition;
  const curr = stats[stat] || 0;
  switch (op) {
    case ">":
      return curr > value;
    case ">=":
      return curr >= value;
    case "<":
      return curr < value;
    case "<=":
      return curr <= value;
    case "==":
      return curr === value;
    case "!=":
      return curr !== value;
    default:
      return false;
  }
}

function getAvailableEvents() {
  const allEvents = state.config.events || [];
  return allEvents.filter((event) => {
    if (event.minAge != null && state.age < event.minAge) return false;
    if (event.maxAge != null && state.age > event.maxAge) return false;
    if (event.once && state.firedOnceEvents.has(event.id)) return false;
    if (Array.isArray(event.conditions)) {
      for (const c of event.conditions) {
        if (!checkCondition(state.stats, c)) return false;
      }
    }
    return true;
  });
}

function applyEffects(effects) {
  if (!effects) return;
  for (const [k, v] of Object.entries(effects)) {
    if (typeof v !== "number") continue;
    state.stats[k] = (state.stats[k] || 0) + v;
  }
  clampStats(state.stats);
}

function getNaturalDeathChance() {
  const rules = state.config.settings?.baseDeathByAge || [];
  let chance = 0;
  for (const rule of rules) {
    if (state.age >= rule.age) {
      chance = rule.chance;
    }
  }
  return chance;
}

function endLife(reason) {
  state.alive = false;
  state.autoRunning = false;
  els.nextYearBtn.disabled = true;
  els.autoBtn.disabled = true;
  addLog(`【终局】${reason}`);
  const score =
    state.age * 2 +
    state.stats.intelligence +
    state.stats.strength +
    state.stats.mood +
    state.stats.wealth;
  addLog(`人生总结：享年 ${state.age} 岁，综合评分 ${score}。`);
}

function runOneYear() {
  if (!state.alive) return;
  state.age += 1;

  state.stats.hp -= 1;
  clampStats(state.stats);

  const naturalDeathChance = getNaturalDeathChance();
  if (Math.random() < naturalDeathChance || state.stats.hp <= 0) {
    endLife("身体机能衰退，你离开了这个世界。");
    render();
    return;
  }

  const available = getAvailableEvents();
  if (available.length === 0) {
    addLog(`${state.age}岁：这一年平平淡淡。`);
    render();
    return;
  }

  const event = randomByWeight(available);
  if (!event) {
    addLog(`${state.age}岁：无事发生。`);
    render();
    return;
  }

  if (event.once) {
    state.firedOnceEvents.add(event.id);
  }
  applyEffects(event.effects);
  addLog(`${state.age}岁：${event.title}。${event.description}`);

  if (event.death) {
    endLife("命运在这一年画上句号。");
  } else if (state.stats.hp <= 0) {
    endLife("健康值归零，人生结束。");
  }

  render();
}

function render() {
  els.age.textContent = String(state.age);
  els.hp.textContent = String(state.stats.hp);
  els.intelligence.textContent = String(state.stats.intelligence);
  els.strength.textContent = String(state.stats.strength);
  els.mood.textContent = String(state.stats.mood);
  els.wealth.textContent = String(state.stats.wealth);
}

function resetGame() {
  const init = state.config.initialStats;
  state.age = 0;
  state.alive = true;
  state.autoRunning = false;
  state.firedOnceEvents = new Set();
  state.stats = {
    hp: init.hp ?? 100,
    intelligence: init.intelligence ?? 5,
    strength: init.strength ?? 5,
    mood: init.mood ?? 5,
    wealth: init.wealth ?? 5
  };
  clampStats(state.stats);

  els.logList.innerHTML = "";
  addLog("你出生了，新的旅程开始。");
  els.nextYearBtn.disabled = false;
  els.autoBtn.disabled = false;
  render();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function autoToEnd() {
  if (!state.alive || state.autoRunning) return;
  state.autoRunning = true;
  els.nextYearBtn.disabled = true;
  els.autoBtn.disabled = true;

  while (state.alive && state.autoRunning) {
    runOneYear();
    await sleep(160);
  }
}

function bindEvents() {
  els.restartBtn.addEventListener("click", resetGame);
  els.nextYearBtn.addEventListener("click", () => runOneYear());
  els.autoBtn.addEventListener("click", () => autoToEnd());
}

async function bootstrap() {
  try {
    state.config = await loadConfig();
    bindEvents();
    resetGame();
  } catch (err) {
    addLog(`初始化失败：${err.message}`);
    els.restartBtn.disabled = true;
    els.nextYearBtn.disabled = true;
    els.autoBtn.disabled = true;
  }
}

bootstrap();
