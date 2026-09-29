/* ==========================================================
   calendar.js = builds the month grid and shows events for the day you click.
   EDIT the SAMPLE_EVENTS array below to change what shows up — each event needs
   a date (YYYY-MM-DD), a title, and a module (must match one of the "module"
   keys in MODULE_COLORS so it gets the right colored dot).
   TODO: BACKEND — replace SAMPLE_EVENTS with events loaded from your database
   (e.g. Firestore), and make "+ Add Activity" actually save a new one.
   ========================================================== */

const MODULE_COLORS = {
  sunday:      { label: 'Sunday Service',    dot: 'dot-sunday' },
  nurture:     { label: 'Family Nurture',     dot: 'dot-nurture' },
  prayer:      { label: 'Abound in Prayer',   dot: 'dot-prayer' },
  childrens:   { label: "Children's Church",  dot: 'dot-childrens' },
  ufy:         { label: 'UFY',                dot: 'dot-ufy' },
  ufw:         { label: 'UFW',                dot: 'dot-ufw' },
  ufm:         { label: 'UFM',                dot: 'dot-ufm' },
  production:  { label: 'Production',         dot: 'dot-production' },
  creatives:   { label: 'Creatives',          dot: 'dot-creatives' },
};

// EDIT: sample data so the calendar isn't empty. Replace with real data later.
const today = new Date();
const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const SAMPLE_EVENTS = [
  { date: iso(today.getFullYear(), today.getMonth(), 5),  title: 'Sunday Service',        module: 'sunday' },
  { date: iso(today.getFullYear(), today.getMonth(), 5),  title: "Children's Church",     module: 'childrens' },
  { date: iso(today.getFullYear(), today.getMonth(), 9),  title: 'UFY Fellowship Night',   module: 'ufy' },
  { date: iso(today.getFullYear(), today.getMonth(), 12), title: 'Sunday Service',        module: 'sunday' },
  { date: iso(today.getFullYear(), today.getMonth(), 14), title: 'Family Nurture Group',   module: 'nurture' },
  { date: iso(today.getFullYear(), today.getMonth(), 17), title: 'Abound in Prayer',       module: 'prayer' },
  { date: iso(today.getFullYear(), today.getMonth(), 19), title: 'Sunday Service',        module: 'sunday' },
  { date: iso(today.getFullYear(), today.getMonth(), 22), title: 'Production Team Setup',  module: 'production' },
  { date: iso(today.getFullYear(), today.getMonth(), 26), title: 'Sunday Service',        module: 'sunday' },
  { date: iso(today.getFullYear(), today.getMonth(), 27), title: 'Creatives Filming Day',  module: 'creatives' },
];

let viewYear = today.getFullYear();
let viewMonth = today.getMonth();      // 0-11
let selectedDate = iso(viewYear, viewMonth, today.getDate());

const grid = document.getElementById('calendar-grid');
const monthLabel = document.getElementById('month-label');
const panelTitle = document.getElementById('day-panel-title');
const panelList = document.getElementById('day-panel-list');

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function eventsOn(dateStr) {
  return SAMPLE_EVENTS.filter(e => e.date === dateStr);
}

function renderCalendar() {
  monthLabel.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
  grid.innerHTML = '';

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstDay.getDay();               // 0 = Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startWeekday + 1;
    let cellDate, cellDay, otherMonth = false;

    if (dayNum < 1) {                                    // days from previous month
      cellDay = daysInPrevMonth + dayNum;
      cellDate = new Date(viewYear, viewMonth - 1, cellDay);
      otherMonth = true;
    } else if (dayNum > daysInMonth) {                   // days from next month
      cellDay = dayNum - daysInMonth;
      cellDate = new Date(viewYear, viewMonth + 1, cellDay);
      otherMonth = true;
    } else {
      cellDay = dayNum;
      cellDate = new Date(viewYear, viewMonth, cellDay);
    }

    const dateStr = iso(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
    const isToday = dateStr === iso(today.getFullYear(), today.getMonth(), today.getDate());
    const dayEvents = eventsOn(dateStr);

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'day-cell' + (otherMonth ? ' other-month' : '') + (isToday ? ' today' : '') + (dateStr === selectedDate ? ' selected' : '');
    cell.dataset.date = dateStr;
    cell.innerHTML = `
      <span class="day-num">${cellDay}</span>
      <span class="day-dots">${dayEvents.map(e => `<i class="dot ${MODULE_COLORS[e.module].dot}"></i>`).join('')}</span>
    `;
    cell.addEventListener('click', () => selectDay(dateStr));
    grid.appendChild(cell);
  }
}

function selectDay(dateStr) {
  selectedDate = dateStr;
  renderCalendar();

  const d = new Date(dateStr + 'T00:00:00');
  panelTitle.textContent = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const dayEvents = eventsOn(dateStr);
  panelList.innerHTML = dayEvents.length
    ? dayEvents.map(e => `<li><span class="evt-title">${e.title}</span><span class="evt-module">${MODULE_COLORS[e.module].label}</span></li>`).join('')
    : '<li class="day-panel-empty" style="border:0;background:none;padding:0">No activities scheduled.</li>';
}

document.getElementById('prev-month').addEventListener('click', () => {
  viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
});
document.getElementById('next-month').addEventListener('click', () => {
  viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
});
document.getElementById('today-btn').addEventListener('click', () => {
  viewYear = today.getFullYear(); viewMonth = today.getMonth();
  selectDay(iso(today.getFullYear(), today.getMonth(), today.getDate()));
});

document.getElementById('add-event-btn').addEventListener('click', () => {
  // TODO: BACKEND — open a real form and save to your database.
  alert('Adding activities isn\'t connected to a database yet — this button is a placeholder.');
});

renderCalendar();
selectDay(selectedDate);
