import asyncio
import json
import logging
import os
import sqlite3
from pathlib import Path

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.types import (
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    WebAppInfo,
)

logging.basicConfig(level=logging.INFO)


def load_env():
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


load_env()
TOKEN = os.environ["BOT_TOKEN"]
FORM_URL = os.environ["FORM_URL"]  # постоянный HTTPS-адрес формы (GitHub Pages)

DB_PATH = Path(__file__).parent / "submissions.db"

dp = Dispatcher()


def init_db():
    con = sqlite3.connect(DB_PATH)
    con.executescript(
        """
        CREATE TABLE IF NOT EXISTS responses (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at    TEXT NOT NULL,
            tg_user_id    INTEGER,
            tg_username   TEXT,
            category      TEXT,
            category_title TEXT,
            description   TEXT,
            raw           TEXT
        );
        CREATE TABLE IF NOT EXISTS answers (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            response_id  INTEGER NOT NULL,
            q_num        INTEGER,
            question     TEXT,
            answer       TEXT
        );
        """
    )
    con.commit()
    con.close()


def save_response(message, data):
    con = sqlite3.connect(DB_PATH)
    cur = con.execute(
        """
        INSERT INTO responses
            (created_at, tg_user_id, tg_username, category, category_title, description, raw)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            message.date.isoformat(),
            message.from_user.id,
            message.from_user.username,
            data.get("category"),
            data.get("categoryTitle"),
            data.get("description"),
            message.web_app_data.data,
        ),
    )
    response_id = cur.lastrowid
    answers = data.get("answers", [])
    for a in answers:
        con.execute(
            "INSERT INTO answers (response_id, q_num, question, answer) VALUES (?, ?, ?, ?)",
            (response_id, a.get("num"), a.get("question"), a.get("answer")),
        )
    con.commit()
    con.close()
    return response_id, len(answers)


@dp.message(CommandStart())
async def start(message: Message):
    # Mini App с sendData открывается ТОЛЬКО кнопкой reply-клавиатуры
    kb = ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="🧭 Начать", web_app=WebAppInfo(url=FORM_URL))]],
        resize_keyboard=True,
    )
    await message.answer(
        "Привет! Это помощник для разбора проблем по шагам.\n"
        "Нажми кнопку ниже, выбери тему и пройди вопросы 👇",
        reply_markup=kb,
    )


@dp.message(F.web_app_data)
async def on_form(message: Message):
    try:
        data = json.loads(message.web_app_data.data)
    except json.JSONDecodeError:
        await message.answer("⚠️ Не удалось разобрать данные формы.")
        return

    response_id, n = save_response(message, data)

    await message.answer(
        "✅ Спасибо! Твои ответы сохранены.\n\n"
        f"🧩 Тема: <b>{data.get('categoryTitle', '—')}</b>\n"
        f"📝 Ответов записано: <b>{n}</b>\n"
        f"🔖 Номер сессии: <b>#{response_id}</b>",
        parse_mode="HTML",
    )


async def main():
    init_db()
    bot = Bot(TOKEN)
    me = await bot.get_me()
    logging.info("Бот запущен: @%s | FORM_URL=%s", me.username, FORM_URL)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
