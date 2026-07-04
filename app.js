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
  .history-open { margin-top: 18px; }
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
        comment: "Первое объяснение обычно самое мрачное и обвиняющее. Но у одного события почти всегда есть и другие, более спокойные толкования — их стоит специально поискать.",
        question: "Какие ещё объяснения произошедшего возможны, кроме самого негативного?"
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
  },
  social_during: {
    title: "Соц. тревога — на мероприятии",
    mode: "steps",
    describeTitle: "Ситуация",
    describePrompt: "Коротко: что за мероприятие и что сейчас происходит? (необязательно)",
    steps: [
      {
        title: "Цикл молчания",
        comment: "Разберите цепочку: ситуация → автоматическая мысль → прогноз → ощущения → поведение → последствие. Молчание снижает риск сказать неловкое, но и лишает шанса увидеть, что обычная реплика была бы принята нормально.",
        questions: [
          "Чего я сейчас боюсь?",
          "Что, как мне кажется, сейчас подумают другие?",
          "Как я прямо сейчас пытаюсь этого не допустить?",
          "Не мешает ли моё защитное поведение общению прямо сейчас?"
        ]
      },
      {
        title: "Факт против тревожного объяснения",
        comment: "Отделите наблюдаемый факт («минут двадцать я почти ничего не сказал») от тревожной интерпретации («я не умею общаться, всем со мной скучно»).",
        questions: [
          "Что я наблюдаю прямо сейчас, а что додумываю?",
          "Кто-то действительно показывает, что не хочет со мной разговаривать?",
          "Какие ещё причины могут объяснять отсутствие контакта?",
          "Возможно ли, что группа просто увлечена своим разговором?",
          "Стал бы я так же строго оценивать другого молчаливого человека?",
          "Какое объяснение здесь честное, но не унизительное?"
        ]
      },
      {
        title: "Внимание наружу, а не на себя",
        comment: "При тревоге внимание уходит внутрь («как я выгляжу?», «что обо мне думают?»). Потренируйтесь замечать содержание разговора, а не контролировать впечатление. Правило: не придумывать тему, а найти одну деталь в уже идущем разговоре и спросить о ней.",
        questions: [
          "О чём человек говорит прямо сейчас?",
          "Что в его рассказе мне действительно любопытно?",
          "Какую деталь я могу уточнить?",
          "Что он чувствует или считает важным в этой истории?",
          "Какой простой вопрос естественно следует из его последней фразы?"
        ]
      },
      {
        title: "Защитное поведение",
        comment: "Защитное поведение временно снижает тревогу, но поддерживает проблему: смотреть в телефон, держаться только рядом со знакомым, репетировать каждую фразу, говорить очень тихо, быстро сворачивать разговор. Убирать всё сразу не нужно — достаточно отказаться от одного.",
        questions: [
          "Что я делаю, чтобы никто не заметил моего волнения?",
          "Помогает ли это участвовать в общении или только прятаться?",
          "От какого одного защитного действия я могу отказаться прямо сейчас?"
        ]
      },
      {
        title: "Поведенческий эксперимент",
        comment: "Проверяется не «понравлюсь ли я всем», а конкретный тревожный прогноз. План: подойти к небольшой группе, послушать минуту, задать один вопрос по теме, не искать идеальную реплику, остаться ещё несколько минут. Цель — собрать данные, а не гарантировать приятный результат.",
        questions: [
          "Какой конкретный прогноз я проверяю и насколько в него верю (0–100%)?",
          "Что люди реально делают в ответ?",
          "Кто-нибудь явно отвергает меня?",
          "Отвечают ли мне хотя бы нейтрально?",
          "Насколько сбывается мой прогноз, от 0 до 100%?",
          "Что этот опыт показывает прямо сейчас, даже если разговор не идеален?"
        ]
      },
      {
        title: "Лестница сложности",
        comment: "Не обязательно сразу развлекать большую компанию. Ступени: поздороваться с одним → задать знакомому уточняющий вопрос → поговорить с одним пару минут → присоединиться к разговору двоих → сказать одну реплику в группе → начать разговор самому → остаться в группе, даже ощущая неловкость. Дальше — после нескольких повторений, а не одной идеальной попытки.",
        questions: [
          "На какой ступени я сейчас и какую выберу для следующей попытки?"
        ]
      },
      {
        title: "Критерий успеха",
        comment: "Сместите критерий с «чувствовать себя уверенно и всем понравиться» на «сделать одно социальное действие, несмотря на неловкость». Успех — это выполненное действие, а не отсутствие тревоги и не реакция окружающих.",
        questions: [
          "Какие 2–3 измеримые цели я ставлю на это мероприятие?",
          "Какое действие я засчитаю как успех, независимо от реакции других?"
        ]
      },
      {
        title: "Без послевечериночного «суда»",
        comment: "После события легко часами прокручивать разговоры и замечать только ошибки. Полезнее короткий разбор без приговора себе.",
        questions: [
          "Три наблюдаемых факта: что происходит без оценок?",
          "Что я делаю прямо сейчас несмотря на тревогу?",
          "Какой навык я хочу потренировать дальше?",
          "Что я не могу достоверно знать о мыслях других людей?"
        ]
      },
      {
        title: "Короткий протокол прямо в моменте",
        comment: "Если нужно собраться прямо на мероприятии — пройдите короткий протокол.",
        questions: [
          "Что происходит вокруг, а не внутри меня?",
          "Какая фраза прозвучала только что?",
          "Какую деталь я могу уточнить?",
          "Какое одно небольшое действие я сейчас сделаю?",
          "Могу ли я выдержать немного неловкости, не убегая в телефон?"
        ]
      }
    ]
  },
  social_post: {
    title: "Соц. тревога — пост-анализ",
    mode: "steps",
    describeTitle: "Что разбираем",
    describePrompt: "Коротко: какое мероприятие вы хотите разобрать? (необязательно)",
    steps: [
      {
        title: "Анализ или руминация?",
        comment: "Полезный анализ ограничен по времени, опирается на факты, учитывает разные объяснения и заканчивается конкретным выводом. Руминация многократно крутит один эпизод, ищет «что все обо мне подумали» и не ведёт к действию. Ограничьте разбор примерно 10–15 минутами.",
        questions: [
          "Это сейчас разбор, ведущий к выводу, — или повторное прокручивание без новой информации?"
        ]
      },
      {
        title: "Что произошло на уровне камеры",
        comment: "Опишите наблюдаемые действия без оценок себя: не «я весь вечер был жалким», а «пришёл, поздоровался с четырьмя людьми, слушал, дважды что-то сказал, десять минут говорил со знакомым».",
        questions: [
          "Сколько времени я был на мероприятии?",
          "С кем я говорил?",
          "Что именно я сказал или спросил?",
          "В какие моменты я молчал?",
          "Как люди фактически отвечали?",
          "Были ли явные признаки отвержения?"
        ]
      },
      {
        title: "Что мозг добавил к фактам",
        comment: "Запишите автоматические мысли буквально («я выглядел странно», «им было скучно», «все заметили, что я молчу», «я не вписываюсь»).",
        questions: [
          "Это наблюдение или моя интерпретация?",
          "Могу ли я знать это наверняка?",
          "Какой вывод относится к конкретному вечеру, а какой — ко всей моей личности?"
        ]
      },
      {
        title: "Доказательства за и против",
        comment: "Для каждой значимой мысли соберите обе колонки. Цель — не доказать, что всё прошло прекрасно, а увидеть полную картину, а не только обвиняющую часть.",
        questions: [
          "Какие доказательства за эту мысль?",
          "Какие доказательства против неё?",
          "Как выглядит полная картина, если учесть и то, и другое?"
        ]
      },
      {
        title: "Альтернативные объяснения",
        comment: "Не заменяйте негативную уверенность позитивной — честнее признать, что точно знать чужие мысли нельзя.",
        questions: [
          "Какие ещё три причины могли объяснять поведение людей?",
          "Могли ли они быть увлечены разговором, устать или сами волноваться?",
          "Могло ли моё молчание выглядеть просто как спокойствие, а не как странность?",
          "Могли ли люди ждать, что я сам проявлю желание поговорить?",
          "Что бы я подумал о другом человеке, который мало говорил?"
        ]
      },
      {
        title: "Что зависело от меня, а что нет",
        comment: "Разделите результат на то, что вне моего контроля (открытость компании, темы, настроение и динамика группы), и то, что в моём (подходил ли, задавал ли вопросы, рассказывал ли о себе, оставался ли после паузы, уходил ли в телефон). Это заменяет «со мной что-то не так» конкретным разбором поведения.",
        questions: [
          "Что в этой ситуации не полностью зависело от меня?",
          "Что зависело именно от меня?"
        ]
      },
      {
        title: "Защитные действия",
        comment: "В социальной ситуации легко прятать тревогу: смотреть в телефон, стоять в стороне, говорить только после репетиции, отвечать очень коротко, избегать взгляда, задавать вопросы, но ничего не рассказывать о себе.",
        questions: [
          "От чего это меня защищало?",
          "Как это помогло в моменте?",
          "Как оно помешало контакту?",
          "От какого одного защитного действия я попробую отказаться в следующий раз?"
        ]
      },
      {
        title: "Мерить действия, а не впечатление",
        comment: "Неудачный критерий — «я должен был чувствовать себя свободно и понравиться». Полезнее мерить конкретные действия. Можно одновременно признать: «включиться было трудно» и «я сделал несколько попыток и лучше понял, что мешало».",
        questions: [
          "Предпринял ли я хотя бы одну попытку контакта?",
          "Остался ли я в ситуации, несмотря на неловкость?",
          "Спросил ли я что-нибудь искренне?",
          "Дал ли я другим возможность узнать что-то обо мне?",
          "Что я сделал немного лучше, чем раньше?"
        ]
      },
      {
        title: "Ограниченный вывод",
        comment: "Вместо «я не умею общаться» сформулируйте конкретно и без приговора личности, например: «мне было трудно войти в уже сложившийся групповой разговор; из-за тревоги я больше наблюдал за собой, мало проявлял инициативу и быстро отступал после пауз».",
        questions: [
          "Как звучит честный, но ограниченный вывод об этом вечере — без обобщения на всю личность?"
        ]
      },
      {
        title: "Один эксперимент на следующий раз",
        comment: "Не длинный список исправлений, а одно проверяемое действие: поговорить с одним человеком до группы; задать два уточняющих вопроса; добавить факт о себе после ответа собеседника; не доставать телефон первые двадцать минут; выдержать одну неловкую паузу; один раз высказать мнение.",
        questions: [
          "Какое одно действие я попробую в следующий раз?",
          "Какой у меня прогноз и насколько я в нём уверен (0–100%)?"
        ]
      },
      {
        title: "Короткая форма для заметок",
        comment: "Сводка для быстрых заметок. После заполнения намеренно завершите разбор: «я извлёк всю доступную информацию; возвращаться без новых фактов не нужно».",
        questions: [
          "Факты: что произошло без оценок?",
          "Мысли: что я решил о себе и других?",
          "Неизвестное: чего я не могу знать наверняка?",
          "Защитное поведение: что я делал из-за тревоги?",
          "Альтернативы: какие ещё объяснения возможны?",
          "Успешные действия: что я всё-таки сделал?",
          "Вывод: какой навык требует развития?",
          "Эксперимент: что одно я попробую в следующий раз?"
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
let mode = "menu";  // menu | wizard | history | historyItem

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

// ── История сохранённых ответов (Telegram CloudStorage, своя у каждого юзера) ──
const CS = tg.CloudStorage;
function csGet(key) {
  return new Promise(res => { if (!CS) return res(null); CS.getItem(key, (e, v) => res(e ? null : v)); });
}
function csSet(key, val) {
  return new Promise(res => { if (!CS) return res(false); CS.setItem(key, val, (e, ok) => res(!e && ok)); });
}

function fmtDate(t) {
  const d = new Date(Number(t));
  const p = n => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

async function saveToHistory(description, items) {
  if (!CS) return;
  const t = String(Date.now());
  // Храним ГОТОВЫЕ пары вопрос-ответ — показ не зависит от текущей структуры категории
  const payload = { c: state.category, ct: state.categoryTitle, t, d: description, items };
  const ok = await csSet("s" + t, JSON.stringify(payload));
  if (!ok) return;  // не влезло/недоступно — в БД всё равно сохранено
  let list = [];
  try { list = JSON.parse((await csGet("hidx")) || "[]") || []; } catch (e) { list = []; }
  list.unshift({ t, c: state.category });
  list = list.slice(0, 50);
  await csSet("hidx", JSON.stringify(list));
}

// Преобразует карту ответов (легаси-формат) в готовые пары вопрос-ответ
function resolveItems(localPages, ans) {
  const out = [];
  localPages.forEach((p, pi) => {
    if (p.type === "question") {
      out.push({ question: p.text, answer: (ans[pi] || "").trim(), role: null });
    } else if (p.type === "role") {
      const arr = ans[pi] || [];
      p.questions.forEach((q, qi) => out.push({ question: q, answer: (arr[qi] || "").trim(), role: p.title }));
    } else if (p.type === "step") {
      const arr = ans[pi] || [];
      p.questions.forEach((q, qi) => {
        const a = (arr[qi] || "").trim();
        if (a) out.push({ question: q, answer: a, role: p.title });
      });
    }
  });
  return out;
}

// Для легаси-записей "Неудачи" выбираем структуру по ЧИСЛУ ответов:
// 7 вопросов = запись до шага про другие интерпретации, 8 = уже с ним.
function legacyCatDef(catKey, ans) {
  const cat = CATEGORIES[catKey];
  if (catKey === "failure") {
    const qCount = Object.keys(ans || {}).filter(k => Number(k) > 0).length;
    if (qCount < 8) {
      return Object.assign({}, cat, {
        items: cat.items.filter(q =>
          q.question !== "Какие ещё объяснения произошедшего возможны, кроме самого негативного?")
      });
    }
  }
  return cat;
}

// Разовая миграция: старые записи (ans по индексу) → новый формат (готовые пары).
// Выполняется на устройстве пользователя при открытии формы.
async function migrateHistory() {
  if (!CS) return;
  try { if ((await csGet("hmig")) === "3") return; } catch (e) { return; }
  let list = [];
  try { list = JSON.parse((await csGet("hidx")) || "[]") || []; } catch (e) { return; }
  for (const it of list) {
    let raw;
    try { raw = await csGet("s" + it.t); } catch (e) { continue; }
    if (!raw) continue;
    let sess;
    try { sess = JSON.parse(raw); } catch (e) { continue; }
    if (Array.isArray(sess.items)) continue;     // уже новый формат — не трогаем
    const cat = CATEGORIES[sess.c];
    if (!cat) continue;                           // категория недоступна — оставляем как есть
    const ans = sess.ans || {};
    const items = resolveItems(buildPagesFromCat(legacyCatDef(sess.c, ans)), ans);
    const payload = { c: sess.c, ct: cat.title, t: sess.t, d: ans[0] || "", items };
    try { await csSet("s" + sess.t, JSON.stringify(payload)); } catch (e) {}
  }
  try { await csSet("hmig", "3"); } catch (e) {}
}

function csRemove(key) {
  return new Promise(res => { if (!CS) return res(false); CS.removeItem(key, (e, ok) => res(!e && ok)); });
}

function b64urlToBytes(s) {
  s = String(s).replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

function b64urlDecode(s) {
  return new TextDecoder().decode(b64urlToBytes(s));
}

async function gunzipB64(b64) {
  const bytes = b64urlToBytes(b64);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const buf = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buf);
}

// Восстановление/синхронизация истории из ссылки (данные шлёт бот в URL) → CloudStorage
async function handleRestore() {
  if (!CS) return false;
  const params = new URLSearchParams(window.location.search);
  const restore = params.get("restore");
  if (!restore) return false;
  const gz = params.get("gz") === "1";
  if (gz && typeof DecompressionStream === "undefined") {
    mb.hide(); tg.BackButton.hide(); app.classList.remove("top");
    app.innerHTML = `<div class="title">Не удалось восстановить</div>
      <div class="subtitle">Нужна более свежая версия Telegram (поддержка распаковки данных).</div>`;
    return true;
  }
  let sessions;
  try {
    const json = gz ? await gunzipB64(restore) : b64urlDecode(restore);
    sessions = JSON.parse(json);
  } catch (e) { return false; }
  if (!Array.isArray(sessions)) return false;

  const sid = params.get("sid") || "";
  const part = params.get("part") || "1";
  const total = params.get("total") || "1";

  // Новый батч → очистить текущую историю и залить из БД заново (БД — источник истины)
  let lastSid = null;
  try { lastSid = await csGet("syncSid"); } catch (e) {}
  if (sid && sid !== lastSid) {
    let old = [];
    try { old = JSON.parse((await csGet("hidx")) || "[]") || []; } catch (e) { old = []; }
    for (const it of old) { await csRemove("s" + it.t); }
    await csSet("hidx", "[]");
    await csSet("syncSid", sid);
    await csSet("hmig", "3");   // не запускать миграцию поверх синхронизированных
  }

  const merge = params.get("merge") === "1";
  let list = [];
  try { list = JSON.parse((await csGet("hidx")) || "[]") || []; } catch (e) { list = []; }
  for (const s of sessions) {
    if (!s || !s.t) continue;
    if (merge && String(s.d || "").trim()) {
      // убрать устаревшие копии той же записи (та же категория + описание), чтобы не задваивалось
      const keep = [];
      for (const x of list) {
        if (x.t === s.t) continue;
        let dup = false;
        try {
          const ex = JSON.parse((await csGet("s" + x.t)) || "{}");
          const exd = ex.d != null ? ex.d : ((ex.ans && ex.ans[0]) || "");
          if (ex.c === s.c && String(exd).trim() === String(s.d).trim()) dup = true;
        } catch (e) {}
        if (dup) await csRemove("s" + x.t); else keep.push(x);
      }
      list = keep;
    }
    await csSet("s" + s.t, JSON.stringify(s));
    if (!list.some(x => x.t === s.t)) list.push({ t: s.t, c: s.c });
  }
  list.sort((a, b) => Number(b.t) - Number(a.t));
  await csSet("hidx", JSON.stringify(list));

  mb.hide();
  tg.BackButton.hide();
  app.classList.remove("top");
  const done = part === total;
  app.innerHTML = `<div class="title">Синхронизация</div>
    <div class="subtitle">Восстановлено в этой части: ${sessions.length}. Часть ${esc(part)} из ${esc(total)}.<br><br>
    ${done ? "Готово — открой «Мои ответы»." : "Нажми следующую кнопку «Синхронизировать» в чате с ботом."}</div>
    <button class="cat-btn" id="go-hist">📚 Мои ответы</button>`;
  const b = document.getElementById("go-hist");
  if (b) b.onclick = () => openHistory();
  return true;
}

async function openHistory() {
  mode = "history";
  mb.hide();
  tg.BackButton.show();
  app.classList.remove("top");
  app.innerHTML = `<div class="title">Мои ответы</div><div class="subtitle">Загрузка…</div>`;
  if (!CS) {
    app.innerHTML = `<div class="title">Мои ответы</div>
      <div class="subtitle">История недоступна в этой версии Telegram.</div>`;
    return;
  }
  let list = [];
  try { list = JSON.parse((await csGet("hidx")) || "[]") || []; } catch (e) { list = []; }
  if (!list.length) {
    app.innerHTML = `<div class="title">Мои ответы</div>
      <div class="subtitle">Здесь появятся ваши сохранённые ответы после прохождения формы.</div>`;
    return;
  }
  let html = `<div class="title">Мои ответы</div>
    <div class="subtitle">Выберите запись, чтобы посмотреть.</div>`;
  list.forEach(it => {
    const cat = CATEGORIES[it.c];
    const title = cat ? cat.title : it.c;
    html += `<button class="cat-btn" data-t="${it.t}">${esc(title)}
      <span class="cat-sub">${fmtDate(it.t)}</span></button>`;
  });
  app.innerHTML = html;
  app.querySelectorAll(".cat-btn[data-t]").forEach(b => {
    b.onclick = () => openHistoryItem(b.dataset.t);
  });
}

async function openHistoryItem(t) {
  mode = "historyItem";
  mb.hide();
  tg.BackButton.show();
  const raw = await csGet("s" + t);
  if (!raw) {
    app.classList.remove("top");
    app.innerHTML = `<div class="subtitle">Запись не найдена.</div>`;
    return;
  }
  let session;
  try { session = JSON.parse(raw); } catch (e) {
    app.innerHTML = `<div class="subtitle">Не удалось прочитать запись.</div>`;
    return;
  }
  transitionTo(() => renderHistoryItem(session));
}

function renderHistoryItem(session) {
  app.classList.add("top");
  const cat = CATEGORIES[session.c];
  const title = session.ct || (cat && cat.title) || session.c;

  // Новый формат: готовые пары вопрос-ответ — не зависят от текущей структуры категории
  if (Array.isArray(session.items)) {
    const description = session.d || "";
    let html = `<div class="progress">${esc(title)}</div>
      <div class="title" style="margin-bottom:20px">Сохранённые ответы</div>`;
    if (description) {
      const descLabel = cat && cat.mode === "roles" ? "Идея" : "Ситуация";
      html += `<div class="sum-block">
        <div class="sum-label">${descLabel}</div>
        <div class="sum-text">${esc(description)}</div>
      </div>`;
    }
    let lastRole = null;
    session.items.forEach(it => {
      if (it.role && it.role !== lastRole) {
        html += `<div class="sum-role">${esc(it.role)}</div>`;
        lastRole = it.role;
      }
      html += `<div class="sum-block">
        <div class="sum-q">${esc(it.question)}</div>
        <div class="sum-text">${esc(it.answer)}</div>
      </div>`;
    });
    app.innerHTML = html;
    return;
  }

  // Легаси-формат старых записей (только ответы по индексу) — best-effort
  if (!cat) { app.innerHTML = `<div class="subtitle">Категория недоступна.</div>`; return; }
  const ans = session.ans || {};
  const localPages = buildPagesFromCat(legacyCatDef(session.c, ans));
  const description = ans[0] || "";
  let html = `<div class="progress">${esc(cat.title)}</div>
    <div class="title" style="margin-bottom:20px">Сохранённые ответы</div>`;
  if (description) {
    const descLabel = cat.mode === "roles" ? "Идея" : "Ситуация";
    html += `<div class="sum-block">
      <div class="sum-label">${descLabel}</div>
      <div class="sum-text">${esc(description)}</div>
    </div>`;
  }
  localPages.forEach((p, pi) => {
    if (p.type === "question") {
      html += `<div class="sum-block">
        <div class="sum-q">${p.qnum}. ${esc(p.text)}</div>
        <div class="sum-text">${esc(ans[pi] || "")}</div>
      </div>`;
    } else if (p.type === "role") {
      html += `<div class="sum-role">${esc(p.title)}</div>`;
      const arr = ans[pi] || [];
      p.questions.forEach((q, qi) => {
        html += `<div class="sum-block">
          <div class="sum-q">${esc(q)}</div>
          <div class="sum-text">${esc(arr[qi] || "")}</div>
        </div>`;
      });
    } else if (p.type === "step") {
      const arr = ans[pi] || [];
      const filled = p.questions
        .map((q, qi) => ({ q, a: (arr[qi] || "").trim() }))
        .filter(x => x.a);
      if (filled.length) {
        html += `<div class="sum-role">${esc(p.title)}</div>`;
        filled.forEach(x => {
          html += `<div class="sum-block">
            <div class="sum-q">${esc(x.q)}</div>
            <div class="sum-text">${esc(x.a)}</div>
          </div>`;
        });
      }
    }
  });
  app.innerHTML = html;
}

const app = document.getElementById("app");
const mb = tg.MainButton;
mb.onClick(handleNext);

function buildPages(catKey) {
  return buildPagesFromCat(CATEGORIES[catKey]);
}

function buildPagesFromCat(cat) {
  const p = [{ type: "describe" }];
  if (cat.mode === "roles") {
    cat.roles.forEach((r, i) => {
      p.push({ type: "role", title: r.title, questions: r.questions, roleNum: i + 1, roleTotal: cat.roles.length });
    });
  } else if (cat.mode === "steps") {
    cat.steps.forEach((s, i) => {
      p.push({ type: "step", title: s.title, comment: s.comment, questions: s.questions, stepNum: i + 1, stepTotal: cat.steps.length });
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
  mode = "menu";
  mb.hide();
  tg.BackButton.hide();
  app.classList.remove("top");
  let html = `<div class="title">С какой проблемой поработаем?</div>
    <div class="subtitle">Выберите тему — дальше пройдём её по шагам.</div>`;
  for (const key in CATEGORIES) {
    html += `<button class="cat-btn" data-cat="${key}">${CATEGORIES[key].title}</button>`;
  }
  html += `<button class="cat-btn" disabled>Другие темы
    <span class="cat-sub">скоро</span></button>`;
  html += `<button class="cat-btn history-open" data-history="1">📚 Мои сохранённые ответы</button>`;
  app.innerHTML = html;
  app.querySelectorAll(".cat-btn[data-cat]").forEach(b => {
    b.onclick = () => chooseCategory(b.dataset.cat);
  });
  const hb = app.querySelector("[data-history]");
  if (hb) hb.onclick = () => openHistory();
}

function chooseCategory(key) {
  state.category = key;
  state.categoryTitle = CATEGORIES[key].title;
  mode = "wizard";
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
  app.classList.toggle("top", page.type === "summary" || page.type === "question" || page.type === "role" || page.type === "step");
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
  } else if (page.type === "step") {
    let html = "";
    if (description) html += `<div class="situation"><b>Ситуация</b>${esc(description)}</div>`;
    html += `<div class="progress">Шаг ${page.stepNum} из ${page.stepTotal}</div>
      <div class="title" style="margin-bottom:12px">${esc(page.title)}</div>`;
    if (page.comment) html += `<p class="comment" style="margin-bottom:20px">${esc(page.comment)}</p>`;
    page.questions.forEach((q, i) => {
      html += `<div class="role-q">
        <div class="role-q-text">${esc(q)}</div>
        <textarea id="input-${i}" placeholder="Необязательно…"></textarea>
      </div>`;
    });
    app.innerHTML = html;
    bindInputs(page.questions.map((q, i) => "input-" + i));
    setupMainButton("Далее");
  } else if (page.type === "summary") {
    let html = `<div class="progress">${esc(state.categoryTitle)} · итог</div>
      <div class="title" style="margin-bottom:20px">Проверьте ответы</div>`;
    if (description) {
      const descLabel = cat.mode === "roles" ? "Идея" : "Ситуация";
      html += `<div class="sum-block">
        <div class="sum-label">${descLabel}</div>
        <div class="sum-text">${esc(description)}</div>
      </div>`;
    }
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
      } else if (p.type === "step") {
        const arr = answers[pi] || [];
        const filled = p.questions
          .map((q, qi) => ({ q, a: (arr[qi] || "").trim() }))
          .filter(x => x.a);
        if (filled.length) {
          html += `<div class="sum-role">${esc(p.title)}</div>`;
          filled.forEach(x => {
            html += `<div class="sum-block">
              <div class="sum-q">${esc(x.q)}</div>
              <div class="sum-text">${esc(x.a)}</div>
            </div>`;
          });
        }
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
    const stepMode = CATEGORIES[state.category].mode === "steps";
    if (!stepMode && v.length < 3) return showError("Опишите ситуацию хотя бы парой слов");
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
  } else if (page.type === "step") {
    // все вопросы необязательные — просто сохраняем что есть
    const arr = [];
    for (let i = 0; i < page.questions.length; i++) arr.push(val("input-" + i));
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
  if (mode === "history") { transitionTo(renderCategory); return; }
  if (mode === "historyItem") { openHistory(); return; }
  // wizard: удаляем временные значения шага, с которого уходим
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

async function submit() {
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
    } else if (p.type === "step") {
      const arr = answers[pi] || [];
      p.questions.forEach((q, qi) => {
        const a = (arr[qi] || "").trim();
        if (a) { num++; out.push({ num, question: q, answer: a, role: p.title }); }
      });
    }
  });
  await saveToHistory(description, out);   // копия в CloudStorage — для просмотра внутри приложения
  clearDraft();            // черновик больше не нужен — данные уходят на постоянное сохранение
  tg.HapticFeedback.notificationOccurred("success");
  tg.sendData(JSON.stringify({
    category: state.category,
    categoryTitle: state.categoryTitle,
    description,
    answers: out
  }));
}

// ── Старт ─────────────────────────────────────────────────────────────────
async function init() {
  tg.BackButton.onClick(handleBack);
  if (await handleRestore()) return;   // режим восстановления истории из ссылки
  migrateHistory();   // разовая нормализация старых записей истории (async, не блокирует)
  const draft = loadDraft();
  if (draft && draft.category && CATEGORIES[draft.category]) {
    state.category = draft.category;
    state.categoryTitle = CATEGORIES[draft.category].title;
    mode = "wizard";
    pages = buildPages(draft.category);
    answers = draft.answers || {};
    idx = (typeof draft.idx === "number" && draft.idx >= 0 && draft.idx < pages.length) ? draft.idx : 0;
    renderCurrentPage();
  } else {
    renderCategory();
  }
}
init();
