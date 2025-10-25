// Лёгкая логика без сборки. Всё работает на GitHub/Cloudflare Pages.
const DATA_URL = "data/deadlines.json";

const DIFF_CLASS = {
  "easy": "easy",
  "medium": "medium",
  "hard": "hard",
  "exam": "exam"
};

function fmtDate(d){
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
function parseISO(dateStr){
  // Безопасный парсинг 'YYYY-MM-DD' как местной даты
  const [y,m,d] = dateStr.split("-").map(Number);
  return new Date(y, m-1, d);
}
function sameYMD(a,b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function daysLeft(from, to){
  const ms = parseISO(to) - from;
  return Math.ceil(ms / (1000*60*60*24));
}

async function loadDeadlines(){
  const res = await fetch(DATA_URL, {cache: "no-store"});
  const raw = await res.json();
  const today = new Date();
  // нормализуем
  const items = raw.map(x => {
    const d = parseISO(x.date);
    return {
      ...x,
      _date: d,
      _daysLeft: daysLeft(new Date(today.getFullYear(), today.getMonth(), today.getDate()), x.date)
    };
  }).sort((a,b)=> a._date - b._date);
  return {items, today};
}

function renderIndex(items, today){
  const todayDateEl = document.getElementById("today-date");
  const todayList = document.getElementById("today-list");
  const todayEmpty = document.getElementById("today-empty");
  const upList = document.getElementById("upcoming-list");
  const upEmpty = document.getElementById("upcoming-empty");

  if(todayDateEl) todayDateEl.textContent = `Сегодня: ${fmtDate(today)}`;

  if(todayList){
    const todayItems = items.filter(it => sameYMD(it._date, today));
    if(todayItems.length===0){ todayEmpty.style.display="block"; }
    todayItems.forEach(it => {
      const li = document.createElement("li");
      const diff = DIFF_CLASS[it.difficulty] ?? "medium";
      li.innerHTML = `<span class="badge tag-${diff}">${it.subject}</span> ${it.title} — <a href="${it.url}" target="_blank" rel="noopener">ссылка</a>`;
      todayList.appendChild(li);
    });
  }

  if(upList){
    const future = items.filter(it => it._date >= new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    if(future.length===0){ upEmpty.style.display="block"; }
    future.slice(0,7).forEach(it => {
      const diff = DIFF_CLASS[it.difficulty] ?? "medium";
      const li = document.createElement("li");
      li.innerHTML = `<span class="dot ${diff}"></span><strong>${fmtDate(it._date)}</strong> — <span class="badge tag-${diff}">${it.subject}</span> ${it.title} <span class="muted">(${it._daysLeft} дн.)</span> · <a href="${it.url}" target="_blank" rel="noopener">ссылка</a>`;
      upList.appendChild(li);
    });
  }
}

function monthLabel(year, month){
  const months = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
  return `${months[month]} ${year}`;
}

function renderCalendar(items, today){
  const label = document.getElementById("month-label");
  const grid = document.getElementById("calendar-grid");
  const prevBtn = document.getElementById("prev-month");
  const nextBtn = document.getElementById("next-month");

  let cur = new Date(today.getFullYear(), today.getMonth(), 1);

  function draw(){
    grid.innerHTML = "";
    label.textContent = monthLabel(cur.getFullYear(), cur.getMonth());

    // Заголовок дней недели (с понедельника)
    const dayNames = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
    dayNames.forEach(n => {
      const el = document.createElement("div");
      el.className = "day-name";
      el.textContent = n;
      grid.appendChild(el);
    });

    const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const daysInMonth = new Date(cur.getFullYear(), cur.getMonth()+1, 0).getDate();
    const lead = (first.getDay()+6)%7; // 0=Пн

    // Пустые ячейки до первого
    for(let i=0;i<lead;i++){
      const blank = document.createElement("div");
      blank.className = "day";
      blank.style.visibility = "hidden";
      grid.appendChild(blank);
    }

    for(let d=1; d<=daysInMonth; d++){
      const cellDate = new Date(cur.getFullYear(), cur.getMonth(), d);
      const cell = document.createElement("div");
      cell.className = "day";
      if(sameYMD(cellDate, today)) cell.classList.add("today");

      const num = document.createElement("div");
      num.className = "date-num";
      num.textContent = d;
      cell.appendChild(num);

      const todays = items.filter(it => sameYMD(it._date, cellDate));
      todays.forEach(it => {
        const diff = DIFF_CLASS[it.difficulty] ?? "medium";
        const ev = document.createElement("div");
        ev.className = `event ${diff}`;
        ev.title = `${it.subject}: ${it.title}`;
        ev.innerHTML = `<span class="dot ${diff}"></span>${it.subject} — ${it.title}`;
        ev.addEventListener("click", () => {
          if(it.url) window.open(it.url, "_blank", "noopener");
        });
        cell.appendChild(ev);
      });

      grid.appendChild(cell);
    }
  }

  draw();
  prevBtn?.addEventListener("click", ()=>{
    cur = new Date(cur.getFullYear(), cur.getMonth()-1, 1);
    draw();
  });
  nextBtn?.addEventListener("click", ()=>{
    cur = new Date(cur.getFullYear(), cur.getMonth()+1, 1);
    draw();
  });
}

async function bootstrap(){
  const page = document.body.getAttribute("data-page") || "index";
  try{
    const {items, today} = await loadDeadlines();
    if(page==="index") renderIndex(items, today);
    if(page==="calendar") renderCalendar(items, today);
    // links.html не требует JS, но оставим инициализацию общую
  }catch(e){
    console.error("Не удалось загрузить данные:", e);
  }
}
document.addEventListener("DOMContentLoaded", bootstrap);
