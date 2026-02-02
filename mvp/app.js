const csvInput = document.getElementById("csvInput");
const fileInput = document.getElementById("fileInput");
const loadSampleBtn = document.getElementById("loadSample");
const renderBtn = document.getElementById("renderBtn");
const exportBtn = document.getElementById("exportBtn");
const statusEl = document.getElementById("status");
const canvas = document.getElementById("calendarCanvas");
const ctx = canvas.getContext("2d");

const startMonthEl = document.getElementById("startMonth");
const cellSizeEl = document.getElementById("cellSize");
const showLegendEl = document.getElementById("showLegend");

const defaultCsv = `employee,start_date,end_date
Иван,2026-02-10,2026-02-20
Анна,2026-02-15,2026-02-28
Сергей,2026-03-03,2026-03-12
Мария,2026-03-15,2026-04-02
Дмитрий,2026-04-10,2026-04-18`;

loadSampleBtn.addEventListener("click", () => {
  csvInput.value = defaultCsv;
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    csvInput.value = reader.result.trim();
  };
  reader.readAsText(file);
});

renderBtn.addEventListener("click", () => {
  const parsedRows = parseCsv(csvInput.value.trim());
  if (!parsedRows.length) {
    setStatus("Нет данных для отображения");
    return;
  }

  const rows = assignColors(parsedRows);
  const cellSize = clamp(parseInt(cellSizeEl.value || "28", 10), 18, 64);

  const { startMonth, endMonth } = resolveRange(rows);
  drawCalendar(rows, startMonth, endMonth, cellSize, showLegendEl.checked);
  setStatus(`Построено: ${formatMonth(startMonth)} — ${formatMonth(endMonth)}`);
});

exportBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "vacation-calendar.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

function parseCsv(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = {
    employee: header.indexOf("employee"),
    start: header.indexOf("start_date"),
    end: header.indexOf("end_date"),
  };

  if (idx.employee < 0 || idx.start < 0 || idx.end < 0) return [];

  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    return {
      employee: (cols[idx.employee] || "").trim(),
      start: parseDate(cols[idx.start]),
      end: parseDate(cols[idx.end]),
    };
  }).filter((r) => r.employee && r.start && r.end && r.end >= r.start);
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseDate(value) {
  if (!value) return null;
  const [y, m, d] = value.trim().split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function resolveRange(rows) {
  const manualMonth = startMonthEl.value;
  let startMonth;
  if (manualMonth) {
    const [y, m] = manualMonth.split("-").map(Number);
    startMonth = new Date(Date.UTC(y, m - 1, 1));
  } else {
    const earliest = rows.reduce((min, r) => (r.start < min ? r.start : min), rows[0].start);
    startMonth = new Date(Date.UTC(earliest.getUTCFullYear(), earliest.getUTCMonth(), 1));
  }
  const endMonth = addMonths(startMonth, 11);
  return { startMonth, endMonth };
}

function addMonths(date, count) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  return new Date(Date.UTC(y, m + count, 1));
}

function formatMonth(date) {
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" });
}

function drawCalendar(rows, startMonth, endMonth, cellSize, showLegend) {
  const months = monthRange(startMonth, endMonth);
  const daysInWeek = 7;

  const legendHeight = showLegend ? 80 : 0;
  const headerHeight = 40;
  const padding = 16;

  const monthWidth = cellSize * daysInWeek + padding * 2;
  const monthHeight = cellSize * 6 + headerHeight + padding;

  const columns = Math.min(3, months.length);
  const rowsCount = Math.ceil(months.length / columns);

  const width = columns * monthWidth + padding;
  const height = rowsCount * monthHeight + legendHeight + padding;

  setCanvasSize(width, height);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  months.forEach((month, idx) => {
    const col = idx % columns;
    const row = Math.floor(idx / columns);
    const offsetX = padding + col * monthWidth;
    const offsetY = padding + row * monthHeight;
    drawMonth(month, offsetX, offsetY, cellSize, rows);
  });

  if (showLegend) {
    drawLegend(rows, padding, height - legendHeight + 10, width - padding * 2, legendHeight - 20);
  }
}

function monthRange(startMonth, endMonth) {
  const list = [];
  let cursor = new Date(startMonth);
  while (cursor <= endMonth) {
    list.push(new Date(cursor));
    cursor = addMonths(cursor, 1);
  }
  return list;
}

function drawMonth(month, x, y, cellSize, rows) {
  const monthName = formatMonth(month);
  ctx.fillStyle = "#1f1f1f";
  ctx.font = "bold 16px Tahoma";
  ctx.textBaseline = "top";
  ctx.fillText(monthName, x, y + 6);

  const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  ctx.font = "12px Tahoma";
  ctx.textBaseline = "top";
  dayNames.forEach((d, i) => {
    const dx = x + i * cellSize;
    ctx.fillStyle = i >= 5 ? "#b45309" : "#6b6b6b";
    ctx.fillText(d, dx + 4, y + 30);
  });

  const firstDay = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const startWeekDay = (firstDay.getUTCDay() + 6) % 7; // Monday=0
  const days = daysInMonth(month);

  for (let day = 1; day <= days; day++) {
    const index = startWeekDay + (day - 1);
    const row = Math.floor(index / 7);
    const col = index % 7;
    const dx = x + col * cellSize;
    const dy = y + 46 + row * cellSize;

    ctx.fillStyle = "#f7f4ee";
    ctx.fillRect(dx, dy, cellSize, cellSize);
    ctx.strokeStyle = "#d6d1c7";
    ctx.strokeRect(dx, dy, cellSize, cellSize);

    const dayDate = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day));
    const vacations = rows.filter((r) => r.start <= dayDate && dayDate <= r.end);

    if (vacations.length) {
      const stripeHeight = Math.max(4, Math.floor(cellSize / Math.max(4, vacations.length)));
      vacations.slice(0, Math.min(4, vacations.length)).forEach((v, i) => {
        ctx.fillStyle = v.color;
        ctx.fillRect(dx + 1, dy + 1 + i * stripeHeight, cellSize - 2, stripeHeight - 1);
      });
    }

    ctx.fillStyle = "#1f1f1f";
    ctx.font = "bold 12px Tahoma";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(day.toString(), dx + cellSize / 2, dy + cellSize / 2);
    ctx.textAlign = "start";
    ctx.textBaseline = "top";
  }
}

function daysInMonth(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function drawLegend(rows, x, y, width, height) {
  const unique = [];
  const map = new Set();
  rows.forEach((r) => {
    if (!map.has(r.employee)) {
      map.add(r.employee);
      unique.push(r);
    }
  });

  ctx.font = "14px Tahoma";
  ctx.fillStyle = "#1f1f1f";
  ctx.textBaseline = "top";
  ctx.fillText("Легенда", x + 8, y);

  const boxY = y + 22;
  const boxHeight = height - 22;

  ctx.fillStyle = "#f7f4ee";
  ctx.fillRect(x, boxY, width, boxHeight);
  ctx.strokeStyle = "#d6d1c7";
  ctx.strokeRect(x, boxY, width, boxHeight);

  const itemX = x + 8;
  let cursorX = itemX;
  let cursorY = boxY + 10;
  const maxX = x + width - 120;

  unique.forEach((r) => {
    const swatchY = cursorY + 2;
    ctx.fillStyle = r.color;
    ctx.fillRect(cursorX, swatchY, 16, 12);
    ctx.strokeStyle = "#333";
    ctx.strokeRect(cursorX, swatchY, 16, 12);
    ctx.fillStyle = "#1f1f1f";
    ctx.font = "13px Tahoma";
    ctx.textBaseline = "middle";
    ctx.fillText(r.employee, cursorX + 22, swatchY + 6);
    ctx.textBaseline = "top";

    cursorX += 130;
    if (cursorX > maxX) {
      cursorX = itemX;
      cursorY += 18;
    }
  });
}

function setCanvasSize(width, height) {
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.lineWidth = 1;
}

function assignColors(rows) {
  const palette = [
    "#3a86ff",
    "#ff006e",
    "#ffbe0b",
    "#8338ec",
    "#06d6a0",
    "#ef476f",
    "#118ab2",
    "#f77f00",
    "#8ac926",
    "#6a4c93",
  ];
  const map = new Map();
  let index = 0;

  rows.forEach((r) => {
    if (!map.has(r.employee)) {
      map.set(r.employee, pickColor(index, palette));
      index += 1;
    }
  });

  return rows.map((r) => ({
    ...r,
    color: map.get(r.employee),
  }));
}

function pickColor(index, palette) {
  if (index < palette.length) return palette[index];
  const hue = (index * 47) % 360;
  return `hsl(${hue}, 75%, 55%)`;
}

function setStatus(text) {
  statusEl.textContent = text;
}

csvInput.value = defaultCsv;
renderBtn.click();
