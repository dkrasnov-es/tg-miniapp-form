# tg-miniapp-form

Telegram Mini App «психологический помощник»: пошаговый разбор проблемы
(выбор темы → описание ситуации → комментарии и вопросы → итоговая страница → сохранение в БД).

## Структура

| Путь | Назначение |
|---|---|
| `index.html` | Mini App (статика, хостится на GitHub Pages) |
| `bot/bot.py` | Бот на aiogram (long-polling), принимает данные формы через `sendData`, пишет в SQLite |
| `bot/run.sh` | Keepalive-скрипт (перезапускает бота по pidfile) |
| `bot/.env.example` | Шаблон конфигурации (`BOT_TOKEN`, `FORM_URL`) |
| `bot/requirements.txt` | Зависимости бота |

## Как работает

```
index.html (GitHub Pages, HTTPS)
      │  Telegram.WebApp.sendData(JSON)
      ▼
bot/bot.py (long-polling, только исходящий трафик)
      │
      ▼
submissions.db  (таблицы responses + answers)
```

Mini App открывается кнопкой **reply-клавиатуры** — это обязательное условие Telegram
для работы `sendData()` (inline-кнопки требуют бэкенда с `answerWebAppQuery`).

## Запуск бота

```bash
cd bot
cp .env.example .env      # вписать BOT_TOKEN и FORM_URL
pip install -r requirements.txt
./run.sh                  # или из cron каждую минуту как keepalive
```

Cron-keepalive:

```
* * * * * /path/to/bot/run.sh >/dev/null 2>&1
```

## Схема БД

- `responses` — сессия: `created_at`, `tg_user_id`, `tg_username`, `category`, `category_title`, `description`, `raw`
- `answers` — по строке на ответ: `response_id`, `q_num`, `question`, `answer`
