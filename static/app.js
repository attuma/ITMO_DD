// Лёгкая логика без сборки. Всё работает на GitHub/Cloudflare Pages.
const DATA_URL = "data/deadlines.json";

const DIFF_CLASS = { easy: "easy", medium: "medium", hard: "hard", exam: "exam" };

function fmtDate(d){
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
function parseISO(dateStr){
  const [y,m,d] = dateStr.split("-").map(Number);
  return new Date(y, m-1, d);
}
function sameYMD(a,b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function daysLeft(from, toISO){
  const ms = parseISO(toISO) - from;
  return Math.ceil(ms / (1000*60*60*24));
}
function escapeHTML(s=""){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// сокращалки для названия работы
function abbreviateTitle(title=""){
  let s = title.trim();

  // типовые русские формулировки → сленговые сокращения
  const repl = [
    [/\bконтрольн(?:ая|ую|ой|ые|ых)?(?:\s+работа)?\b/gi, "КР"],
    [/\bлабораторн(?:ая|ую|ой|ые|ых)?(?:\s+работа)?\b/gi, "Лаб"],
    [/\bдомашн(?:ее|яя)?(?:\s+(?:задание|работа))?\b/gi, "ДЗ"],
    [/\bпрактическ(?:ая|ую|ой|ие|их)?(?:\s+работа)?\b/gi, "Практ"],
    [/\bкурсов(?:ая|ую|ой|ые|ых)?(?:\s+работа)?\b/gi, "Курс"],
  ];
  for (const [rx, to] of repl) s = s.replace(rx, to);

  // уберём лишние «работа/задание» если остались
  s = s.replace(/\b(работа|задание)\b/gi, "").replace(/\s{2,}/g, " ").trim();
  return s || title || "";
}

async function loadDeadlines(){
  const res = await fetch(DATA_URL, { cache: "no-store" });
  const raw = await res.json();
  const today = new Date();

  const items = raw.map(x => {
    const d = parseISO(x.date);
    return {
      ...x,
      _date: d,
      _daysLeft: daysLeft(new Date(today.getFullYear(), today.getMonth(), today.getDate()), x.date),
    };
  }).sort((a,b)=> a._date - b._date);

  return { items, today };
}

function renderIndex(items, today){
  const todayDateEl = document.getElementById("today-date");
  const todayList = document.getElementById("today-list");
  const todayEmpty = document.getElementById("today-empty");
  const upList = document.getElementById("upcoming-list");
  const upEmpty = document.getElementById("upcoming-empty");

  if (todayDateEl) todayDateEl.textContent = `Сегодня: ${fmtDate(today)}`;

  if (todayList){
    const todayItems = items.filter(it => sameYMD(it._date, today));
    if (todayItems.length === 0) { todayEmpty.style.display = "block"; }
    todayItems.forEach(it => {
      const diff = DIFF_CLASS[it.difficulty] ?? "medium";
      const li = document.createElement("li");
      li.innerHTML = `
  <strong class="up-date">${fmtDate(it._date)}</strong>
  <span class="up-main">
    <span class="badge tag-${diff}">${escapeHTML(it.subject)}</span>
    ${escapeHTML(abbreviateTitle(it.title))}
    <span class="muted">(${it._daysLeft} дн.)</span>
  </span>
  <a class="up-link" href="${it.url}" target="_blank" rel="noopener">ссылка</a>
`;
      todayList.appendChild(li);
    });
  }

  if (upList){
    const future = items.filter(it => it._date >= new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    if (future.length === 0) { upEmpty.style.display = "block"; }
    future.slice(0,7).forEach(it => {
      const diff = DIFF_CLASS[it.difficulty] ?? "medium";
      const li = document.createElement("li");
      li.innerHTML = `<strong>${fmtDate(it._date)}</strong> — <span class="badge tag-${diff}">${escapeHTML(it.subject)}</span> ${escapeHTML(abbreviateTitle(it.title))} <span class="muted">(${it._daysLeft} дн.)</span> · <a href="${it.url}" target="_blank" rel="noopener">ссылка</a>`;
      upList.appendChild(li);
    });
  }
}

/* ---------- НЕДЕЛЬНЫЙ КАЛЕНДАРЬ ---------- */
function renderCalendar(items, today){
  const label   = document.getElementById("month-label");
  const grid    = document.getElementById("calendar-grid");
  const prevBtn = document.getElementById("prev-month");
  const nextBtn = document.getElementById("next-month");

  function startOfWeek(d){
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const shift = (t.getDay() + 6) % 7; // 0 = Пн
    t.setDate(t.getDate() - shift);
    return t;
  }

  const MONTHS_GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  function formatWeekRange(a, b){
    const left  = `${a.getDate()} ${MONTHS_GEN[a.getMonth()]}`;
    const right = `${b.getDate()} ${MONTHS_GEN[b.getMonth()]} ${b.getFullYear()}`;
    return a.getFullYear() !== b.getFullYear()
      ? `${left} ${a.getFullYear()} - ${right}`
      : `${left} - ${right}`;
  }

  let cur = startOfWeek(today);

  function draw(){
    grid.innerHTML = "";

    const weekStart = new Date(cur);
    const weekEnd   = new Date(cur); weekEnd.setDate(weekEnd.getDate() + 6);
    label.textContent = formatWeekRange(weekStart, weekEnd);

    // шапка дней
    const header = document.createElement("div");
    header.className = "week-header";
    grid.appendChild(header);

    const week = document.createElement("div");
    week.className = "week-grid";
    grid.appendChild(week);

    const dows = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart); dayDate.setDate(weekStart.getDate() + i);

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

      // события дня
      const todays = items.filter(it => sameYMD(it._date, dayDate));
      todays.forEach(it => {
        const diff = DIFF_CLASS[it.difficulty] ?? "medium";

        const row = document.createElement("div");
        row.className = `ev-subj ${diff}`;
        // две строки: предмет (крупнее), название работы (сокращённое) + ссылка ниже
        const subj = escapeHTML(it.subject || "Задача");
        const shortTitle = escapeHTML(abbreviateTitle(it.title || ""));
        const link = it.url
          ? `<a class="ev-link" href="${it.url}" target="_blank" rel="noopener">ссылка</a>`
          : `<span class="ev-link disabled">ссылка</span>`;

        row.innerHTML = `
          <div class="ev-name">${subj}</div>
          <div class="ev-desc">${shortTitle}</div>
          ${link}
        `;

        list.appendChild(row);
      });

      col.appendChild(body);
      week.appendChild(col);
    }
  }

  draw();
  prevBtn?.addEventListener("click", ()=>{ cur.setDate(cur.getDate() - 7); draw(); });
  nextBtn?.addEventListener("click", ()=>{ cur.setDate(cur.getDate() + 7); draw(); });
}

/* ---------- BOOT ---------- */
async function bootstrap(){
  const page = document.body.getAttribute("data-page") || "index";
  try{
    const {items, today} = await loadDeadlines();
    if(page==="index") renderIndex(items, today);
    if(page==="calendar") renderCalendar(items, today);
  }catch(e){
    console.error("Не удалось загрузить данные:", e);
  }
}
document.addEventListener("DOMContentLoaded", bootstrap);
