const els = {
  siege: document.getElementById("siege"),
  power: document.getElementById("power"),
  demolish: document.getElementById("demolish"),
  occupy: document.getElementById("occupy"),
  merit: document.getElementById("merit"),
  crusade: document.getElementById("crusade"),
  restartBtn: document.getElementById("restartBtn"),
  nextYearBtn: document.getElementById("nextYearBtn"),
  autoBtn: document.getElementById("autoBtn"),
  logList: document.getElementById("logList")
};

const state = {
  siege: 0,
  alive: true,
  stats: { power: 0, demolish: 0, occupy: 0, merit: 0, crusade: 0 },
  firedOnceEvents: new Set(),
  config: null,
  autoRunning: false
};

const statMax = {
  power: 60000,
  demolish: 500000,
  occupy: 1000,
  merit: 10000000,
  crusade: 1000
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
    const max = statMax[key] ?? 999999999;
    stats[key] = Math.max(0, Math.min(max, stats[key]));
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
    if (event.minSiege != null && state.siege < event.minSiege) return false;
    if (event.maxSiege != null && state.siege > event.maxSiege) return false;
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
  const rules = state.config.settings?.baseDeathBySiege || [];
  let chance = 0;
  for (const rule of rules) {
    if (state.siege >= rule.siege) {
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
    state.siege * 10 +
    state.stats.demolish +
    state.stats.occupy +
    state.stats.merit +
    state.stats.crusade;
  addLog(`战役总结：累计攻城 ${state.siege} 次，综合评分 ${score}。`);
}

function runOneYear() {
  if (!state.alive) return;
  state.siege += 1;

  state.stats.power -= 500;
  clampStats(state.stats);

  const naturalDeathChance = getNaturalDeathChance();
  if (Math.random() < naturalDeathChance || state.stats.power <= 0) {
    endLife("势力溃散，你的城池全面失守。");
    render();
    return;
  }

  const maxSiege = state.config.settings?.maxSiege ?? 30;
  if (state.siege >= maxSiege) {
    endLife("攻城次数到达上限，本次征程结束。");
    render();
    return;
  }

  const available = getAvailableEvents();
  if (available.length === 0) {
    addLog(`第${state.siege}天：战局平稳，无重大变化。`);
    render();
    return;
  }

  const event = randomByWeight(available);
  if (!event) {
    addLog(`第${state.siege}天：无事发生。`);
    render();
    return;
  }

  if (event.once) {
    state.firedOnceEvents.add(event.id);
  }
  applyEffects(event.effects);
  addLog(`第${state.siege}天：${event.title}。${event.description}`);

  if (event.death) {
    endLife("战局在此役终结。");
  } else if (state.stats.power <= 0) {
    endLife("势力归零，战役失败。");
  }

  render();
}

function render() {
  els.siege.textContent = String(state.siege);
  els.power.textContent = String(state.stats.power);
  els.demolish.textContent = String(state.stats.demolish);
  els.occupy.textContent = String(state.stats.occupy);
  els.merit.textContent = String(state.stats.merit);
  els.crusade.textContent = String(state.stats.crusade);
}

function resetGame() {
  const init = state.config.initialStats;
  state.siege = 0;
  state.alive = true;
  state.autoRunning = false;
  state.firedOnceEvents = new Set();
  state.stats = {
    power: init.power ?? 30000,
    demolish: init.demolish ?? 1000,
    occupy: init.occupy ?? 50,
    merit: init.merit ?? 10000,
    crusade: init.crusade ?? 20
  };
  clampStats(state.stats);

  els.logList.innerHTML = "";
  addLog("主公登帐点兵，战役正式开启。");
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
