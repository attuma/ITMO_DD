// Лёгкая логика без сборки. Всё работает на GitHub/Cloudflare Pages.
// Автоинкремент версий при каждом коммите
const DATA_URL = "data/deadlines.json";

const DIFF_CLASS = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
  exam: "exam",
};

// ==== helpers ====
function fmtDate(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
function parseISO(dateStr) {
  // Безопасный парсинг 'YYYY-MM-DD' как местной даты
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function sameYMD(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function daysLeft(from, isoString) {
  const ms = parseISO(isoString) - from;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// сокращение общих слов в названиях работ
function shortenTitle(s) {
  if (!s) return "";
  const map = [
    [/лабораторн(ая|ая работа|ая раб\.?)?/i, "лаб"],
    [/контрольн(ая|ая работа|ая раб\.?)?/i, "кр"],
    [/рубе(жка|жный|жн\.?)?/i, "руб"],
    [/домашн(ее|ая|ая раб\.?)?/i, "дз"],
    [/дедлайн/i, "дл"],
    [/практик(а|ум)?/i, "практ"],
    [/лекци(я|и)/i, "лек"],
    [/семинар(ы)?/i, "сем"],
  ];
  let out = s.trim();
  for (const [rx, rep] of map) out = out.replace(rx, rep);
  return out;
}

async function loadDeadlines() {
  const res = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
  const raw = await res.json();

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const items = raw
    .map((x) => {
      const d = parseISO(x.date);
      return {
        subject: (x.subject || "").trim(),
        title: (x.title || "").trim(),
        date: x.date,
        _date: d,
        difficulty: DIFF_CLASS[(x.difficulty || "medium").toLowerCase()] || "medium",
        url: (x.url || "").trim(),
        _daysLeft: daysLeft(startOfToday, x.date),
      };
    })
    .sort((a, b) => a._date - b._date);

  return { items, today: startOfToday };
}

// ==== index (главная) ====
function renderIndex(items, today) {
  const todayDateEl = document.getElementById("today-date");
  const todayList = document.getElementById("today-list");
  const todayEmpty = document.getElementById("today-empty");
  const upList = document.getElementById("upcoming-list");
  const upEmpty = document.getElementById("upcoming-empty");

  if (todayDateEl) todayDateEl.textContent = `Сегодня: ${fmtDate(today)}`;

  if (todayList) {
    const todayItems = items.filter((it) => sameYMD(it._date, today));
    if (todayItems.length === 0 && todayEmpty) todayEmpty.style.display = "block";

    todayItems.forEach((it) => {
      const li = document.createElement("li");
      const diff = it.difficulty ?? "medium";
      const linkHTML = it.url
        ? ` — <a href="${it.url}" target="_blank" rel="noopener">ссылка</a>`
        : "";
      li.innerHTML = `<span class="badge tag-${diff}">${it.subject}</span> ${shortenTitle(
        it.title
      )}${linkHTML}`;
      todayList.appendChild(li);
    });
  }

  if (upList) {
    const future = items.filter((it) => it._date >= today);
    if (future.length === 0 && upEmpty) upEmpty.style.display = "block";

    future.slice(0, 4).forEach((it) => {
      const diff = it.difficulty ?? "medium";
      const linkHTML = it.url
        ? ` · <a href="${it.url}" target="_blank" rel="noopener">ссылка</a>`
        : "";
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="dot ${diff}"></span>
        <span class="deadline-content">
          <strong>${fmtDate(it._date)}</strong> —
          <span class="badge tag-${diff}">${it.subject}</span>
          ${shortenTitle(it.title)}
          <span class="muted">(${it._daysLeft} дн.)</span>${linkHTML}
        </span>
      `;
      upList.appendChild(li);
    });
  }
}

// ==== calendar (неделя) ====
function renderCalendar(items, today) {
  const label = document.getElementById("month-label");
  const grid = document.getElementById("calendar-grid");
  const prevBtn = document.getElementById("prev-month");
  const nextBtn = document.getElementById("next-month");

  // начало недели (понедельник)
  function startOfWeek(d) {
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const shift = (t.getDay() + 6) % 7; // 0 = Пн
    t.setDate(t.getDate() - shift);
    return t;
  }

  const MONTHS_GEN = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ];
  function formatWeekRange(a, b) {
    const left =
      `${a.getDate()} ${MONTHS_GEN[a.getMonth()]}` + (a.getFullYear() !== b.getFullYear() ? ` ${a.getFullYear()}` : "");
    const right = `${b.getDate()} ${MONTHS_GEN[b.getMonth()]} ${b.getFullYear()}`;
    return `${left} – ${right}`;
  }

  let cur = startOfWeek(today);
  const dows = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  function draw() {
    grid.innerHTML = "";

    const weekStart = new Date(cur);
    const weekEnd = new Date(cur);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (label) label.textContent = formatWeekRange(weekStart, weekEnd); // по центру; стрелки по краям делает CSS

    // шапка дней
    const header = document.createElement("div");
    header.className = "week-header";
    grid.appendChild(header);

    // сетка дней
    const week = document.createElement("div");
    week.className = "week-grid";
    grid.appendChild(week);

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + i);

      // заголовок колонки
      const hc = document.createElement("div");
      hc.className = "wh-cell";
      hc.innerHTML = `<span class="wh-date">${dayDate.getDate()}</span><span class="wh-dow">, ${dows[i]}</span>`;
      header.appendChild(hc);

      // колонка дня
      const col = document.createElement("div");
      col.className = "day-col";
      if (sameYMD(dayDate, today)) col.classList.add("today");

      const body = document.createElement("div");
      body.className = "day-body";

      const list = document.createElement("div");
      list.className = "events";
      body.appendChild(list);

      // события для конкретного дня
      const todays = items.filter((it) => sameYMD(it._date, dayDate));
      todays.forEach((it) => {
        const diff = it.difficulty ?? "medium";

        const row = document.createElement("div");
        row.className = `ev-subj ${diff}`; // цветная полоса слева задаётся через CSS ::before
        row.title = it.title || ""; // системная подсказка — удобно на десктопе

        // 1) предмет (крупнее)
        const name = document.createElement("div");
        name.className = "ev-name";
        name.textContent = it.subject || "Задача";
        row.appendChild(name);

        // 2) сокращённое название работы
        const desc = document.createElement("div");
        desc.className = "ev-desc";
        desc.textContent = shortenTitle(it.title || "");
        row.appendChild(desc);

        // 3) ссылка — только если есть URL
        if (it.url) {
          const a = document.createElement("a");
          a.className = "ev-link";
          a.href = it.url;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = "ссылка";
          row.appendChild(a);
        }

        list.appendChild(row);
      });

      col.appendChild(body);
      week.appendChild(col);
    }
  }

  draw();
  prevBtn?.addEventListener("click", () => {
    cur.setDate(cur.getDate() - 7);
    draw();
  });
  nextBtn?.addEventListener("click", () => {
    cur.setDate(cur.getDate() + 7);
    draw();
  });
}

// ==== bootstrap ====
async function bootstrap() {
  const page = document.body.getAttribute("data-page") || "index";
  try {
    const { items, today } = await loadDeadlines();
    if (page === "index") renderIndex(items, today);
    if (page === "calendar") renderCalendar(items, today);
    // links.html не требует JS
  } catch (e) {
    console.error("Не удалось загрузить данные:", e);
  }
}
document.addEventListener("DOMContentLoaded", bootstrap);
