// Вся логика и стили приложения. Грузится загрузчиком index.html с ?t=<timestamp>,
// поэтому изменения этого файла видны мгновенно (кэш обходится).

// ── Стили (инъекция — чтобы правки CSS тоже были мгновенными) ──────────────
const STYLE = `
  :root {
    --bg: var(--tg-theme-bg-color, #ffffff);
    --text: var(--tg-theme-text-color, #1a1a1a);
    --hint: var(--tg-theme-hint-color, #8e8e93);
    --link: var(--tg-theme-link-color, #2481cc);
    --btn: var(--tg-theme-button-color, #2481cc);
    --btn-text: var(--tg-theme-button-text-color, #ffffff);
    --secondary-bg: var(--tg-theme-secondary-bg-color, #f3f3f6);
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { height: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg); color: var(--text);
    margin: 0; padding: 0; font-size: 17px; line-height: 1.5;
  }
  #app {
    min-height: 100vh;
    display: flex; flex-direction: column; justify-content: center;
    padding: 32px 22px 40px;
    opacity: 1;
    transition: opacity .55s ease;
  }
  #app.fade-out { opacity: 0; }
  .progress { color: var(--hint); font-size: 13px; letter-spacing: .04em;
    text-transform: uppercase; margin-bottom: 14px; }
  .comment {
    color: var(--hint); font-size: 16px; font-style: italic;
    line-height: 1.6; border-left: 3px solid var(--btn);
    padding: 4px 0 4px 16px; margin: 0;
  }
  .question { font-size: 22px; font-weight: 600; line-height: 1.35; margin: 0 0 20px; }
  .title { font-size: 26px; font-weight: 700; margin: 0 0 8px; }
  .subtitle { color: var(--hint); font-size: 16px; margin: 0 0 28px; }
  textarea {
    width: 100%; padding: 14px 16px; font-size: 17px; font-family: inherit;
    border: 1.5px solid transparent; border-radius: 14px;
    background: var(--secondary-bg); color: var(--text);
    outline: none; min-height: 120px; resize: none; line-height: 1.5;
  }
  textarea:focus { border-color: var(--btn); }
  .cat-btn {
    display: block; width: 100%; text-align: left;
    padding: 18px 20px; margin-bottom: 12px; font-size: 18px; font-weight: 600;
    border: none; border-radius: 16px; background: var(--secondary-bg);
    color: var(--text); cursor: pointer; transition: transform .1s ease;
  }
  .cat-btn:active { transform: scale(.98); }
  .cat-btn[disabled] { opacity: .45; font-weight: 500; }
  .cat-btn .cat-sub { display: block; font-size: 13px; font-weight: 400;
    color: var(--hint); margin-top: 4px; }
  .err { color: #e53935; font-size: 14px; margin-top: 10px; min-height: 18px; }
  .hint-line { color: var(--hint); font-size: 13px; margin-top: 8px; }
  #app.top { justify-content: flex-start; }
  .sum-block { margin-bottom: 18px; }
  .sum-label { font-size: 13px; font-weight: 600; text-transform: uppercase;
    letter-spacing: .04em; color: var(--hint); margin-bottom: 6px; }
  .sum-q { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
  .sum-text { background: var(--secondary-bg); border-radius: 12px;
    padding: 12px 14px; white-space: pre-wrap; line-height: 1.5; }
`;
const styleEl = document.createElement("style");
styleEl.textContent = STYLE;
document.head.appendChild(styleEl);

// ── Telegram ───────────────────────────────────────────────────────────────
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ── Контент категорий ───────────────────────────────────────────────────────
const CATEGORIES = {
  procrastination: {
    title: "Прокрастинация",
    describePrompt: "Опишите своими словами: что именно вы откладываете и в какой ситуации?",
    items: [
      {
        comment: "Вопрос о смысле помогает вспомнить, зачем это вообще нужно.",
        question: "Что в моей жизни изменится к лучшему через месяц или год, если я буду делать это регулярно?"
      },
      {
        comment: "Иногда «не хочу» — это не лень, а страх, усталость, неясность или слишком большой объём.",
        question: "Почему мне не хочется — задача неприятная, слишком большая или непонятная?"
      },
      {
        comment: "Когда задача кажется большой, мозг сопротивляется. Стоит снизить порог входа.",
        question: "Что я могу сделать прямо сейчас за пару минут?"
      },
      {
        comment: "Когда не хочется, мозг начинает торговаться: «потом», «завтра», «не сейчас». Здесь помогает честность с собой.",
        question: "Я правда решил этого не делать — или просто убегаю от дискомфорта?"
      },
      {
        comment: "Взгляд через того, кем ты хочешь быть, помогает действовать не из настроения, а из своих ценностей.",
        question: "Как бы поступил человек, который серьёзно относится к этой цели?"
      },
      {
        comment: "Иногда достаточно сделать действие чуть менее затратным для себя.",
        question: "Как сделать это занятие хоть немного приятнее?"
      },
      {
        comment: "Когда мотивации нет, помогает не размышление, а запуск.",
        question: "Могу ли я просто начать — не обещая себе закончить?"
      }
    ]
  },
  failure: {
    title: "Неудача",
    describePrompt: "Опишите своими словами: какая неудача произошла и в какой ситуации?",
    items: [
      {
        comment: "Вместо «Что это говорит обо мне?» спроси иначе:",
        question: "Что именно произошло?"
      },
      {
        comment: "Важно понять: я оцениваю всю свою личность или одно конкретное действие?",
        question: "Я говорю о себе в целом — или об одном конкретном случае?"
      },
      {
        comment: "Ярлыки слишком общие. А у фактов есть чёткие границы.",
        question: "В чём конкретно у меня не получилось?"
      },
      {
        comment: "Это постоянная черта характера — или просто мой сегодняшний уровень?",
        question: "Это что-то неизменное — или то, что можно развить?"
      },
      {
        comment: "Не превращай результат в приговор себе — разложи его на причины.",
        question: "Дело было в нехватке навыка?"
      },
      {
        comment: "Честно — не значит ни фальшиво-позитивно, ни жёстко к себе.",
        question: "Как сказать об этом честно, но не нападая на себя?"
      },
      {
        comment: "Ярлыки тормозят, а факты подталкивают к действию.",
        question: "Что я могу улучшить в первую очередь?"
      }
    ]
  }
  // сюда легко добавляются новые категории
};

// ── Состояние ────────────────────────────────────────────────────────────────
let state = { category: null, categoryTitle: null, description: null, answers: [] };
let pages = [];
let idx = -1;

const app = document.getElementById("app");
const mb = tg.MainButton;
mb.onClick(handleNext);

function buildPages(catKey) {
  const cat = CATEGORIES[catKey];
  const p = [{ type: "describe" }];
  cat.items.forEach((it, i) => {
    p.push({ type: "comment", text: it.comment, qnum: i + 1 });
    p.push({ type: "question", text: it.question, qnum: i + 1 });
  });
  p.push({ type: "summary" });
  return p;
}

function esc(s) {
  return (s || "").replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function transitionTo(renderFn) {
  app.classList.add("fade-out");
  setTimeout(() => {
    renderFn();
    window.scrollTo(0, 0);
    app.classList.remove("fade-out");
  }, 550);
}

function renderCategory() {
  mb.hide();
  let html = `<div class="title">С какой проблемой поработаем?</div>
    <div class="subtitle">Выберите тему — дальше пройдём её по шагам.</div>`;
  for (const key in CATEGORIES) {
    html += `<button class="cat-btn" data-cat="${key}">${CATEGORIES[key].title}</button>`;
  }
  html += `<button class="cat-btn" disabled>Другие темы
    <span class="cat-sub">скоро</span></button>`;
  app.innerHTML = html;
  app.querySelectorAll(".cat-btn[data-cat]").forEach(b => {
    b.onclick = () => chooseCategory(b.dataset.cat);
  });
}

function chooseCategory(key) {
  state.category = key;
  state.categoryTitle = CATEGORIES[key].title;
  pages = buildPages(key);
  idx = 0;
  tg.HapticFeedback.impactOccurred("light");
  transitionTo(renderCurrentPage);
}

function renderCurrentPage() {
  const page = pages[idx];
  const total = CATEGORIES[state.category].items.length;
  app.classList.toggle("top", page.type === "summary");

  if (page.type === "describe") {
    app.innerHTML = `
      <div class="progress">${state.categoryTitle}</div>
      <div class="question">Расскажите о ситуации</div>
      <p class="comment" style="margin-bottom:20px">${CATEGORIES[state.category].describePrompt}</p>
      <textarea id="input" placeholder="Опишите своими словами..."></textarea>
      <div class="err" id="err"></div>`;
    setupMainButton("Далее");
  } else if (page.type === "comment") {
    app.innerHTML = `
      <div class="progress">Вопрос ${page.qnum} из ${total}</div>
      <p class="comment">${page.text}</p>`;
    setupMainButton("Далее");
  } else if (page.type === "question") {
    app.innerHTML = `
      <div class="progress">Вопрос ${page.qnum} из ${total}</div>
      <div class="question">${page.text}</div>
      <textarea id="input" placeholder="Ваш ответ..."></textarea>
      <div class="err" id="err"></div>`;
    setupMainButton("Далее");
  } else if (page.type === "summary") {
    let html = `<div class="progress">${esc(state.categoryTitle)} · итог</div>
      <div class="title" style="margin-bottom:20px">Проверьте ответы</div>
      <div class="sum-block">
        <div class="sum-label">Ситуация</div>
        <div class="sum-text">${esc(state.description)}</div>
      </div>`;
    state.answers.forEach(a => {
      html += `<div class="sum-block">
        <div class="sum-q">${a.num}. ${esc(a.question)}</div>
        <div class="sum-text">${esc(a.answer)}</div>
      </div>`;
    });
    app.innerHTML = html;
    setupMainButton("Сохранить");
  }
}

function setupMainButton(text) {
  mb.setText(text);
  mb.show();
  mb.enable();
}

function handleNext() {
  const page = pages[idx];

  if (page.type === "describe") {
    const v = (document.getElementById("input").value || "").trim();
    if (v.length < 3) return showError("Опишите ситуацию хотя бы парой слов");
    state.description = v;
  } else if (page.type === "question") {
    const v = (document.getElementById("input").value || "").trim();
    if (v.length < 1) return showError("Напишите ответ, чтобы продолжить");
    state.answers.push({ num: page.qnum, question: page.text, answer: v });
  } else if (page.type === "summary") {
    submit();
    return;
  }

  tg.HapticFeedback.impactOccurred("light");
  idx += 1;
  transitionTo(renderCurrentPage);
}

function showError(msg) {
  const e = document.getElementById("err");
  if (e) e.textContent = msg;
  tg.HapticFeedback.notificationOccurred("error");
}

function submit() {
  tg.HapticFeedback.notificationOccurred("success");
  tg.sendData(JSON.stringify({
    category: state.category,
    categoryTitle: state.categoryTitle,
    description: state.description,
    answers: state.answers
  }));
}

// ── Старт ─────────────────────────────────────────────────────────────────
renderCategory();
