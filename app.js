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
  .situation { background: var(--secondary-bg); border-radius: 12px;
    padding: 10px 14px; margin-bottom: 18px; font-size: 14px;
    color: var(--hint); line-height: 1.45; white-space: pre-wrap; }
  .situation b { display: block; font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }
  .role-q { margin-bottom: 20px; }
  .role-q-text { font-size: 16px; font-weight: 600; line-height: 1.35; margin-bottom: 8px; }
  .role-q textarea { min-height: 76px; }
  .sum-role { font-size: 17px; font-weight: 700; margin: 24px 0 12px; }
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
        comment: "Иногда полезно вспомнить, ради чего всё это вообще затевалось.",
        question: "Что в моей жизни изменится к лучшему через месяц или год, если я буду делать это регулярно?"
      },
      {
        comment: "«Не хочу» — это часто не лень, а страх, усталость или растерянность перед большой задачей.",
        question: "Почему мне не хочется — задача неприятная, слишком большая или непонятная?"
      },
      {
        comment: "Большая задача пугает — поэтому проще начать с совсем маленького шага.",
        question: "Что я могу сделать прямо сейчас за пару минут?"
      },
      {
        comment: "Когда не хочется, легко уговорить себя «потом». Тут стоит быть честным с собой.",
        question: "Я правда решил этого не делать — или просто убегаю от дискомфорта?"
      },
      {
        comment: "Иногда проще действовать не из настроения, а из того, каким человеком хочешь быть.",
        question: "Как бы поступил человек, который серьёзно относится к этой цели?"
      },
      {
        comment: "Дело пойдёт легче, если сделать его чуть приятнее.",
        question: "Как сделать это занятие хоть немного приятнее?"
      },
      {
        comment: "Когда мотивации нет, лучше не раздумывать, а просто начать.",
        question: "Могу ли я просто начать — не обещая себе закончить?"
      }
    ]
  },
  failure: {
    title: "Неудача",
    describePrompt: "Опишите своими словами: какая неудача произошла и в какой ситуации?",
    items: [
      {
        comment: "Сначала просто отдели факты от оценки самого себя:",
        question: "Что именно произошло?"
      },
      {
        comment: "Важно понять, оцениваешь ли ты себя целиком — или всего один эпизод.",
        question: "Я говорю о себе в целом — или об одном конкретном случае?"
      },
      {
        comment: "Общие ярлыки редко бывают правдой — у реальных фактов всегда есть границы.",
        question: "В чём конкретно у меня не получилось?"
      },
      {
        comment: "Часто это не черта характера, а просто сегодняшний уровень, который можно поднять.",
        question: "Это что-то неизменное — или то, что можно развить?"
      },
      {
        comment: "Не делай из результата приговор — лучше разбери, что к нему привело.",
        question: "Дело было в нехватке навыка?"
      },
      {
        comment: "Честный взгляд — это не сладкая ложь, но и не нападение на себя.",
        question: "Как сказать об этом честно, но не нападая на себя?"
      },
      {
        comment: "Ярлыки загоняют в тупик, а конкретные факты подсказывают, что делать дальше.",
        question: "Что я могу улучшить в первую очередь?"
      }
    ]
  },
  envy: {
    title: "Ревность / зависть",
    describePrompt: "Опишите своими словами: в какой ситуации вы почувствовали ревность или зависть?",
    items: [
      {
        comment: "Начать стоит с конкретики — размытое чувство разобрать трудно, а конкретную ситуацию можно.",
        question: "Что именно произошло и в какой момент я почувствовал зависть или ревность?"
      },
      {
        comment: "За любой сильной эмоцией стоит мысль. Важно поймать её точную формулировку.",
        question: "Какая мысль промелькнула в голове в тот момент?"
      },
      {
        comment: "Зависть почти всегда про сравнение. Полезно увидеть, с кем и по какому критерию я сравниваю.",
        question: "С кем я себя сравниваю и что именно у него есть, чего, как мне кажется, нет у меня?"
      },
      {
        comment: "Мысли при зависти часто искажены: «у него всё, у меня ничего», «он лучше во всём». Стоит свериться с фактами.",
        question: "Какие факты подтверждают мою мысль, а какие ей противоречат?"
      },
      {
        comment: "Мы видим чужую витрину, но не закулисье. Полная картина обычно сложнее.",
        question: "Чего я не знаю о его ситуации — какой ценой и каким трудом это далось?"
      },
      {
        comment: "Зависть часто подсвечивает то, что для меня по-настоящему важно. Это можно использовать.",
        question: "Что это чувство говорит о моих собственных желаниях и ценностях?"
      },
      {
        comment: "Понимание стоит перевести в действие — маленький конкретный шаг снимает напряжение лучше, чем размышления.",
        question: "Какой один маленький шаг я могу сделать в сторону того, что для меня важно?"
      }
    ]
  },
  anger: {
    title: "Гнев",
    describePrompt: "Опишите своими словами: в какой ситуации вы почувствовали гнев?",
    items: [
      {
        comment: "Гнев легче разобрать, когда он привязан к конкретному эпизоду, а не к общему «всё бесит».",
        question: "Что именно произошло прямо перед тем, как я разозлился?"
      },
      {
        comment: "Тело сигналит о гневе раньше, чем мы это осознаём. Эти сигналы — ранний звоночек.",
        question: "Где и как я почувствовал гнев в теле и насколько он сильный по шкале 0–10?"
      },
      {
        comment: "За гневом почти всегда стоит мысль-интерпретация: «он специально», «так нельзя», «это несправедливо».",
        question: "Какая мысль вспыхнула в голове в этот момент?"
      },
      {
        comment: "Гнев часто возникает, когда нарушено какое-то наше правило или ожидание.",
        question: "Какое моё ожидание или правило здесь оказалось нарушено?"
      },
      {
        comment: "Мы легко приписываем другому злой умысел, хотя обычно есть и другие объяснения.",
        question: "Как ещё можно объяснить его поведение, не предполагая, что он хотел навредить?"
      },
      {
        comment: "Гнев толкает к импульсивным действиям — полезно сверить их с тем, что мне действительно важно.",
        question: "Если я поступлю под влиянием гнева, приблизит ли это меня к тому, чего я хочу?"
      },
      {
        comment: "Прежде чем действовать, гнев нужно снизить — на пике решения почти всегда хуже.",
        question: "Что поможет мне снизить накал прямо сейчас (пауза, дыхание, выйти, отложить ответ)?"
      },
      {
        comment: "Завершить стоит конкретным действием, а не просто пониманием.",
        question: "Какой конкретный следующий шаг я выберу — что именно сделаю или скажу, чтобы решить ситуацию?"
      }
    ]
  },
  council: {
    title: "Совет семи ролей",
    mode: "roles",
    describeTitle: "Идея для развития продукта",
    describePrompt: "Опишите своими словами идею для развития продукта.",
    roles: [
      {
        title: "Клиент",
        questions: [
          "Какую реальную проблему это решает для меня?",
          "В какой момент я буду этим пользоваться?",
          "Что может раздражать или пугать меня?",
          "За что я действительно согласился бы платить?"
        ]
      },
      {
        title: "Продавец",
        questions: [
          "Как объяснить ценность одним предложением?",
          "Какое возражение клиента будет самым сильным?",
          "Какое доказательство поможет закрыть продажу?",
          "Почему клиент должен действовать сейчас?"
        ]
      },
      {
        title: "Продуктовый менеджер",
        questions: [
          "Какое поведение пользователя должно измениться?",
          "Какой показатель подтвердит ценность?",
          "Как проверить гипотезу без полноценной разработки?",
          "Какая самая маленькая рабочая версия решения?"
        ]
      },
      {
        title: "Маркетолог",
        questions: [
          "Для какого сегмента это особенно важно?",
          "Какими словами сам клиент описывает проблему?",
          "В каком канале можно найти такого клиента?",
          "Что заставит его обратить внимание?"
        ]
      },
      {
        title: "Финансовый директор",
        questions: [
          "Как это повлияет на выручку, удержание и расходы?",
          "Какая здесь экономика на одного пользователя?",
          "Что должно быть правдой, чтобы решение окупилось?",
          "Какой финансовый риск мы недооцениваем?"
        ]
      },
      {
        title: "Операционный руководитель или разработчик",
        questions: [
          "Что станет сложным при росте в десять раз?",
          "Какие зависимости и ограничения не учтены?",
          "Что будет дорого поддерживать?",
          "Как упростить решение в два раза?"
        ]
      },
      {
        title: "Инвестор или владелец бизнеса",
        questions: [
          "Соответствует ли это основной стратегии?",
          "Создаёт ли это устойчивое преимущество?",
          "Какие доказательства нужны перед серьёзными инвестициями?",
          "Что мы не сможем сделать, если выберем это направление?"
        ]
      }
    ]
  }
  // сюда легко добавляются новые категории
};

// ── Состояние ────────────────────────────────────────────────────────────────
let state = { category: null, categoryTitle: null };
let answers = {};   // pageIndex -> string | string[]  (черновик, временные значения)
let pages = [];
let idx = -1;

// ── Черновик (временное хранилище, отдельно от сохранённого в БД) ──────────
const STORAGE_KEY = "psy_draft_v1";
function saveDraft() {
  if (!state.category) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ category: state.category, idx, answers }));
  } catch (e) {}
}
function loadDraft() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (e) { return null; }
}
function clearDraft() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}

const app = document.getElementById("app");
const mb = tg.MainButton;
mb.onClick(handleNext);

function buildPages(catKey) {
  const cat = CATEGORIES[catKey];
  const p = [{ type: "describe" }];
  if (cat.mode === "roles") {
    cat.roles.forEach((r, i) => {
      p.push({ type: "role", title: r.title, questions: r.questions, roleNum: i + 1, roleTotal: cat.roles.length });
    });
  } else {
    cat.items.forEach((it, i) => {
      p.push({ type: "comment", text: it.comment, qnum: i + 1 });
      p.push({ type: "question", text: it.question, qnum: i + 1 });
    });
  }
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
  tg.BackButton.hide();
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
  answers = {};
  idx = 0;
  saveDraft();
  tg.HapticFeedback.impactOccurred("light");
  transitionTo(renderCurrentPage);
}

function renderCurrentPage() {
  const page = pages[idx];
  const cat = CATEGORIES[state.category];
  const total = (cat.items || []).length;
  const description = answers[0] || "";
  app.classList.toggle("top", page.type === "summary" || page.type === "question" || page.type === "role");
  tg.BackButton.show();

  if (page.type === "describe") {
    app.innerHTML = `
      <div class="progress">${state.categoryTitle}</div>
      <div class="question">${cat.describeTitle || "Расскажите о ситуации"}</div>
      <p class="comment" style="margin-bottom:20px">${cat.describePrompt}</p>
      <textarea id="input" placeholder="Опишите своими словами..."></textarea>
      <div class="err" id="err"></div>`;
    bindInputs(["input"]);
    setupMainButton("Далее");
  } else if (page.type === "comment") {
    app.innerHTML = `
      <div class="progress">Вопрос ${page.qnum} из ${total}</div>
      <p class="comment">${page.text}</p>`;
    setupMainButton("Далее");
  } else if (page.type === "question") {
    app.innerHTML = `
      <div class="situation"><b>Ваша ситуация</b>${esc(description)}</div>
      <div class="progress">Вопрос ${page.qnum} из ${total}</div>
      <div class="question">${page.text}</div>
      <textarea id="input" placeholder="Ваш ответ..."></textarea>
      <div class="err" id="err"></div>`;
    bindInputs(["input"]);
    setupMainButton("Далее");
  } else if (page.type === "role") {
    let html = `<div class="situation"><b>Идея</b>${esc(description)}</div>
      <div class="progress">Роль ${page.roleNum} из ${page.roleTotal}</div>
      <div class="title" style="margin-bottom:18px">${esc(page.title)}</div>`;
    page.questions.forEach((q, i) => {
      html += `<div class="role-q">
        <div class="role-q-text">${esc(q)}</div>
        <textarea id="input-${i}" placeholder="Ваш ответ..."></textarea>
      </div>`;
    });
    html += `<div class="err" id="err"></div>`;
    app.innerHTML = html;
    bindInputs(page.questions.map((q, i) => "input-" + i));
    setupMainButton("Далее");
  } else if (page.type === "summary") {
    const descLabel = cat.mode === "roles" ? "Идея" : "Ситуация";
    let html = `<div class="progress">${esc(state.categoryTitle)} · итог</div>
      <div class="title" style="margin-bottom:20px">Проверьте ответы</div>
      <div class="sum-block">
        <div class="sum-label">${descLabel}</div>
        <div class="sum-text">${esc(description)}</div>
      </div>`;
    pages.forEach((p, pi) => {
      if (p.type === "question") {
        html += `<div class="sum-block">
          <div class="sum-q">${p.qnum}. ${esc(p.text)}</div>
          <div class="sum-text">${esc(answers[pi] || "")}</div>
        </div>`;
      } else if (p.type === "role") {
        html += `<div class="sum-role">${esc(p.title)}</div>`;
        const arr = answers[pi] || [];
        p.questions.forEach((q, qi) => {
          html += `<div class="sum-block">
            <div class="sum-q">${esc(q)}</div>
            <div class="sum-text">${esc(arr[qi] || "")}</div>
          </div>`;
        });
      }
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
    const v = val("input");
    if (v.length < 3) return showError("Опишите ситуацию хотя бы парой слов");
    answers[idx] = v;
  } else if (page.type === "question") {
    const v = val("input");
    if (v.length < 1) return showError("Напишите ответ, чтобы продолжить");
    answers[idx] = v;
  } else if (page.type === "role") {
    const arr = [];
    for (let i = 0; i < page.questions.length; i++) {
      const v = val("input-" + i);
      if (v.length < 1) return showError("Пожалуйста, ответьте на все вопросы роли");
      arr.push(v);
    }
    answers[idx] = arr;
  } else if (page.type === "summary") {
    submit();
    return;
  }

  saveDraft();
  tg.HapticFeedback.impactOccurred("light");
  idx += 1;
  transitionTo(renderCurrentPage);
}

function handleBack() {
  // удаляем временные значения шага, с которого уходим
  delete answers[idx];
  if (idx <= 0) {
    // назад к выбору категории — черновик сбрасываем целиком
    idx = -1;
    state.category = null;
    state.categoryTitle = null;
    pages = [];
    answers = {};
    clearDraft();
    transitionTo(renderCategory);
    return;
  }
  saveDraft();
  idx -= 1;
  transitionTo(renderCurrentPage);
}

function showError(msg) {
  const e = document.getElementById("err");
  if (e) e.textContent = msg;
  tg.HapticFeedback.notificationOccurred("error");
}

function val(id) {
  const el = document.getElementById(id);
  return el ? (el.value || "").trim() : "";
}

// Восстанавливает значения текущей страницы из черновика и сохраняет ввод на лету
function bindInputs(ids) {
  const stored = answers[idx];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (ids.length > 1) {
      if (Array.isArray(stored) && stored[i] != null) el.value = stored[i];
    } else if (typeof stored === "string") {
      el.value = stored;
    }
    el.oninput = () => {
      if (ids.length > 1) {
        const cur = Array.isArray(answers[idx]) ? answers[idx] : [];
        cur[i] = el.value;
        answers[idx] = cur;
      } else {
        answers[idx] = el.value;
      }
      saveDraft();
    };
  });
}

function submit() {
  const description = (answers[0] || "").trim();
  const out = [];
  let num = 0;
  pages.forEach((p, pi) => {
    if (p.type === "question") {
      num++;
      out.push({ num, question: p.text, answer: (answers[pi] || "").trim(), role: null });
    } else if (p.type === "role") {
      const arr = answers[pi] || [];
      p.questions.forEach((q, qi) => {
        num++;
        out.push({ num, question: q, answer: (arr[qi] || "").trim(), role: p.title });
      });
    }
  });
  clearDraft();   // черновик больше не нужен — данные уходят на постоянное сохранение
  tg.HapticFeedback.notificationOccurred("success");
  tg.sendData(JSON.stringify({
    category: state.category,
    categoryTitle: state.categoryTitle,
    description,
    answers: out
  }));
}

// ── Старт ─────────────────────────────────────────────────────────────────
function init() {
  tg.BackButton.onClick(handleBack);
  const draft = loadDraft();
  if (draft && draft.category && CATEGORIES[draft.category]) {
    state.category = draft.category;
    state.categoryTitle = CATEGORIES[draft.category].title;
    pages = buildPages(draft.category);
    answers = draft.answers || {};
    idx = (typeof draft.idx === "number" && draft.idx >= 0 && draft.idx < pages.length) ? draft.idx : 0;
    renderCurrentPage();
  } else {
    renderCategory();
  }
}
init();
