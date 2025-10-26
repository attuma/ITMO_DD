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
      const li = document.createElement("li");
      const diff = DIFF_CLASS[it.difficulty] ?? "medium";
      li.innerHTML = `<span class="badge tag-${diff}">${escapeHTML(it.subject)}</span> ${escapeHTML(it.title)} — <a href="${it.url}" target="_blank" rel="noopener">ссылка</a>`;
      todayList.appendChild(li);
    });
  }

  if (upList){
    const future = items.filter(it => it._date >= new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    if (future.length === 0) { upEmpty.style.display = "block"; }
    future.slice(0,7).forEach(it => {
      const diff = DIFF_CLASS[it.difficulty] ?? "medium";
      const li = document.createElement("li");
      li.innerHTML = `<strong>${fmtDate(it._date)}</strong> — <span class="badge tag-${diff}">${escapeHTML(it.subject)}</span> ${escapeHTML(it.title)} <span class="muted">(${it._daysLeft} дн.)</span> · <a href="${it.url}" target="_blank" rel="noopener">ссылка</a>`;
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

  // единый попап для событий
  let activePop = null;
  function hidePop(){
    if (activePop?.el) activePop.el.remove();
    activePop = null;
  }
  function showPopForRow(row, it){
    hidePop();

    const diff = DIFF_CLASS[it.difficulty] ?? "medium";
    const pop = document.createElement("div");
    pop.className = `event-pop ${diff}`;
    const subj = escapeHTML(it.subject || "");
    const title = escapeHTML(it.title || "");
    pop.innerHTML = `
      <div class="pop-title">${title || "Без названия"}</div>
      ${it.url ? `<a class="pop-link" href="${it.url}" target="_blank" rel="noopener">Открыть ссылку</a>` : `<span class="muted">ссылки нет</span>`}
    `;
    document.body.appendChild(pop);

    // позиционируем около строки (над ней, если хватает места; иначе — ниже)
    const gap = 12;
    const rect = row.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;

    // сначала зафиксируем ширину (чтобы корректно считать высоту)
    pop.style.left = "0px"; pop.style.top = "-9999px";
    const popW = Math.min(420, vw - 24);
    pop.style.maxWidth = popW + "px";

    const ph = pop.offsetHeight, pw = pop.offsetWidth;
    let left = rect.left + window.scrollX;
    let top = rect.top + window.scrollY - ph - gap;
    if (top < window.scrollY + 8) top = rect.bottom + window.scrollY + gap; // если не влезает сверху — показываем снизу
    if (left + pw > window.scrollX + vw - 8) left = window.scrollX + vw - pw - 8;

    pop.style.left = left + "px";
    pop.style.top  = top + "px";

    // обработчики скрытия
    const onDocClick = (e) => {
      if (pop.contains(e.target) || row.contains(e.target)) return;
      hidePop();
      document.removeEventListener("click", onDocClick, true);
    };
    document.addEventListener("click", onDocClick, true);

    pop.addEventListener("mouseleave", hidePop);
    row.addEventListener("mouseleave", () => {
      // если курсор не на попапе — скрыть (не ломаем клики по ссылке)
      const onNextTick = () => { if (!pop.matches(":hover")) hidePop(); };
      setTimeout(onNextTick, 10);
    });

    const onScroll = () => hidePop();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);

    activePop = { el: pop, row, onScroll };
  }

  let cur = startOfWeek(today);

  function draw(){
    hidePop();
    grid.innerHTML = "";

    const weekStart = new Date(cur);
    const weekEnd   = new Date(cur); weekEnd.setDate(weekEnd.getDate() + 6);
    label.textContent = formatWeekRange(weekStart, weekEnd);

    const header = document.createElement("div");
    header.className = "week-header";
    grid.appendChild(header);

    const week = document.createElement("div");
    week.className = "week-grid";
    grid.appendChild(week);

    const dows = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart); dayDate.setDate(weekStart.getDate() + i);

      const hc = document.createElement("div");
      hc.className = "wh-cell";
      hc.innerHTML = `<span class="wh-date">${dayDate.getDate()}</span><span class="wh-dow">, ${dows[i]}</span>`;
      header.appendChild(hc);

      const col = document.createElement("div");
      col.className = "day-col";
      if (sameYMD(dayDate, today)) col.classList.add("today");

      const body = document.createElement("div");
      body.className = "day-body";

      const list = document.createElement("div");
      list.className = "events";
      body.appendChild(list);

      const todays = items.filter(it => sameYMD(it._date, dayDate));
      todays.forEach(it => {
        const diff = DIFF_CLASS[it.difficulty] ?? "medium";
        const row = document.createElement("div");
        row.className = `ev-subj ${diff}`;
        row.setAttribute("data-tip", it.title || "");
        row.title = it.title || "";
        row.innerHTML = `${escapeHTML(it.subject || "Задача")}`;

        // hover + click показывают попап
        row.addEventListener("mouseenter", () => showPopForRow(row, it));
        row.addEventListener("click", (e) => {
          e.stopPropagation();
          showPopForRow(row, it);
        });

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
