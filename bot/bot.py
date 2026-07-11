import asyncio
import base64
import gzip
import html
import json
import logging
import os
import sqlite3
from datetime import datetime
from pathlib import Path

from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    BotCommand,
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
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
            answer       TEXT,
            role         TEXT
        );
        """
    )
    # миграция: добавить колонку role в существующую БД, если её нет
    cols = [r[1] for r in con.execute("PRAGMA table_info(answers)")]
    if "role" not in cols:
        con.execute("ALTER TABLE answers ADD COLUMN role TEXT")
    con.commit()
    con.close()


def save_response(message, data, raw):
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
            raw,
        ),
    )
    response_id = cur.lastrowid
    answers = data.get("answers", [])
    for a in answers:
        con.execute(
            "INSERT INTO answers (response_id, q_num, question, answer, role) VALUES (?, ?, ?, ?, ?)",
            (response_id, a.get("num"), a.get("question"), a.get("answer"), a.get("role")),
        )
    con.commit()
    con.close()
    return response_id, len(answers)


def _esc(s):
    return html.escape(s or "")


def get_user_sessions(user_id):
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    rows = con.execute(
        "SELECT id, created_at, category_title, description FROM responses "
        "WHERE tg_user_id = ? ORDER BY id DESC",
        (user_id,),
    ).fetchall()
    con.close()
    return rows


def get_session(response_id, user_id):
    # Жёсткая фильтрация по tg_user_id — чужую сессию открыть нельзя
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    resp = con.execute(
        "SELECT * FROM responses WHERE id = ? AND tg_user_id = ?",
        (response_id, user_id),
    ).fetchone()
    answers = []
    if resp:
        answers = con.execute(
            "SELECT q_num, question, answer, role FROM answers "
            "WHERE response_id = ? ORDER BY id",
            (response_id,),
        ).fetchall()
    con.close()
    return resp, answers


def format_session(resp, answers):
    when = resp["created_at"][:16].replace("T", " ")
    parts = [
        f"🧩 <b>{_esc(resp['category_title'])}</b> · {when}",
        f"📌 {_esc(resp['description'])}",
        "",
    ]
    last_role = None
    for a in answers:
        if a["role"] and a["role"] != last_role:
            parts.append(f"\n<b>{_esc(a['role'])}</b>")
            last_role = a["role"]
        parts.append(f"• {_esc(a['question'])}\n  → {_esc(a['answer'])}")
    return "\n".join(parts)


async def send_long(message, text):
    # Telegram лимит ~4096 символов — режем по строкам
    limit = 3900
    chunk = ""
    for line in text.split("\n"):
        if len(chunk) + len(line) + 1 > limit:
            if chunk.strip():
                await message.answer(chunk, parse_mode="HTML")
            chunk = ""
        chunk += line + "\n"
    if chunk.strip():
        await message.answer(chunk, parse_mode="HTML")


async def show_my_sessions(message: Message):
    rows = get_user_sessions(message.from_user.id)
    if not rows:
        await message.answer(
            "У вас пока нет сохранённых ответов. Нажмите «🧭 Начать» и пройдите форму 🙂"
        )
        return
    lines = ["📚 <b>Ваши сохранённые ответы</b>", ""]
    keyboard = []
    for r in rows[:20]:
        date = r["created_at"][:10]
        lines.append(f"#{r['id']} · {date} · {_esc(r['category_title'])}")
        keyboard.append(
            [InlineKeyboardButton(
                text=f"#{r['id']} · {r['category_title']}",
                callback_data=f"view:{r['id']}",
            )]
        )
    if len(rows) > 20:
        lines.append(f"\n…и ещё {len(rows) - 20}. Показаны последние 20.")
    await message.answer(
        "\n".join(lines),
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=keyboard),
    )


@dp.message(CommandStart())
async def start(message: Message):
    # Mini App с sendData открывается ТОЛЬКО кнопкой reply-клавиатуры
    kb = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🧭 Начать", web_app=WebAppInfo(url=FORM_URL))],
            [KeyboardButton(text="📚 Мои ответы")],
        ],
        resize_keyboard=True,
    )
    await message.answer(
        "Привет! Это помощник для разбора проблем по шагам.\n"
        "Нажми «🧭 Начать», выбери тему и пройди вопросы.\n"
        "«📚 Мои ответы» — посмотреть свои сохранённые сессии. 👇",
        reply_markup=kb,
    )


@dp.message(F.web_app_data)
async def on_form(message: Message):
    raw = message.web_app_data.data
    try:
        data = json.loads(raw)
        # длинные сессии приходят gzip-сжатыми: {"gz": "<base64>"} (лимит sendData — 4096 байт)
        if isinstance(data, dict) and set(data.keys()) == {"gz"}:
            raw = gzip.decompress(base64.b64decode(data["gz"])).decode("utf-8")
            data = json.loads(raw)
    except (json.JSONDecodeError, ValueError, OSError):
        await message.answer("⚠️ Не удалось разобрать данные формы.")
        return

    response_id, n = save_response(message, data, raw)

    await message.answer(
        "✅ Спасибо! Твои ответы сохранены.\n\n"
        f"🧩 Тема: <b>{data.get('categoryTitle', '—')}</b>\n"
        f"📝 Ответов записано: <b>{n}</b>\n"
        f"🔖 Номер сессии: <b>#{response_id}</b>\n\n"
        "Посмотреть все свои ответы — команда /my или кнопка «📚 Мои ответы».",
        parse_mode="HTML",
    )


@dp.message(Command("my"))
async def cmd_my(message: Message):
    await show_my_sessions(message)


@dp.message(F.text == "📚 Мои ответы")
async def btn_my(message: Message):
    await show_my_sessions(message)


@dp.callback_query(F.data.startswith("view:"))
async def cb_view(cb: CallbackQuery):
    try:
        rid = int(cb.data.split(":", 1)[1])
    except (ValueError, IndexError):
        await cb.answer("Некорректный запрос", show_alert=True)
        return
    resp, answers = get_session(rid, cb.from_user.id)
    if not resp:
        await cb.answer("Сессия не найдена", show_alert=True)
        return
    await send_long(cb.message, format_session(resp, answers))
    await cb.answer()


def _created_ms(created_at, fallback_id):
    try:
        return int(datetime.fromisoformat(created_at).timestamp() * 1000)
    except Exception:
        return 1_000_000_000_000 + int(fallback_id)


def build_sync_sessions(user_id):
    # Собираем все сессии пользователя в формате Mini App (готовые пары вопрос-ответ)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    resps = con.execute(
        "SELECT * FROM responses WHERE tg_user_id = ? ORDER BY id", (user_id,)
    ).fetchall()
    out = []
    for r in resps:
        arows = con.execute(
            "SELECT question, answer, role FROM answers WHERE response_id = ? ORDER BY id",
            (r["id"],),
        ).fetchall()
        items = [
            {"question": a["question"], "answer": a["answer"], "role": a["role"]}
            for a in arows
        ]
        out.append({
            "c": r["category"],
            "ct": r["category_title"],
            "t": str(_created_ms(r["created_at"], r["id"])),
            "d": r["description"] or "",
            "items": items,
        })
    con.close()
    return out


def _b64(sessions):
    # gzip + base64url — компактно, чтобы уместиться в лимит длины URL кнопки Telegram
    raw = json.dumps(sessions, ensure_ascii=False).encode()
    return base64.urlsafe_b64encode(gzip.compress(raw)).decode().rstrip("=")


def build_sync_parts(sessions, budget=1500):
    # Пакуем сессии в части так, чтобы каждая ссылка уместилась в лимит URL.
    # Сессия, не влезающая в одну ссылку даже одна, режется на фрагменты
    # ("f", (t, i, n, кусок b64)) — приложение соберёт их обратно через CloudStorage.
    parts, cur = [], []
    for s in sessions:
        single = _b64([s])
        if len(single) > budget:
            if cur:
                parts.append(("s", cur))
                cur = []
            n = -(-len(single) // budget)  # ceil
            for i in range(n):
                parts.append(("f", (s["t"], i, n, single[i * budget:(i + 1) * budget])))
        elif cur and len(_b64(cur + [s])) > budget:
            parts.append(("s", cur))
            cur = [s]
        else:
            cur.append(s)
    if cur:
        parts.append(("s", cur))
    return parts


def _part_url(kind, data, sid, k, total):
    base = f"{FORM_URL}?part={k}&total={total}&gz=1"
    if sid:
        base += f"&sid={sid}"
    if kind == "s":
        return f"{base}&restore={_b64(data)}"
    t, i, n, chunk = data
    return f"{base}&frag={t}:{i}:{n}&restore={chunk}"


@dp.message(Command("sync"))
async def cmd_sync(message: Message):
    sessions = build_sync_sessions(message.from_user.id)
    if not sessions:
        await message.answer("Нет сохранённых записей для синхронизации.")
        return
    sid = str(int(message.date.timestamp()))
    # Данные gzip-сжаты; держим URL кнопки коротким (лимит длины у web_app-кнопок жёсткий)
    for budget in (1500, 1000, 700):
        parts = build_sync_parts(sessions, budget)
        total = len(parts)
        rows = [
            [InlineKeyboardButton(
                text=f"🔄 Синхронизировать {k}/{total}",
                web_app=WebAppInfo(url=_part_url(kind, data, sid, k, total)),
            )]
            for k, (kind, data) in enumerate(parts, 1)
        ]
        try:
            await message.answer(
                f"🔄 Синхронизация истории из БД: <b>{len(sessions)}</b> записей, <b>{total}</b> "
                f"{'часть' if total == 1 else 'частей'}.\n\n"
                "Нажимай кнопки <b>по порядку</b> (1, 2, …). Первая очистит текущую in-app "
                "историю и зальёт всё из базы заново. После последней открой «📚 Мои ответы».",
                parse_mode="HTML",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=rows),
            )
            return
        except Exception as e:
            logging.warning("sync send failed at budget %s: %s", budget, e)
            continue
    await message.answer(
        "Не удалось сформировать синхронизацию — записи слишком большие для передачи ссылкой. "
        "Смотри их через /my."
    )


@dp.message(Command("restore"))
async def cmd_restore(message: Message):
    parts = (message.text or "").split()
    if len(parts) < 2 or not parts[1].isdigit():
        await message.answer("Укажи номер записи, например: /restore 13")
        return
    rid = int(parts[1])
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    r = con.execute(
        "SELECT * FROM responses WHERE id = ? AND tg_user_id = ?",
        (rid, message.from_user.id),
    ).fetchone()
    if not r:
        con.close()
        await message.answer("Запись не найдена.")
        return
    arows = con.execute(
        "SELECT question, answer, role FROM answers WHERE response_id = ? ORDER BY id",
        (rid,),
    ).fetchall()
    con.close()
    session = {
        "c": r["category"],
        "ct": r["category_title"],
        "t": str(_created_ms(r["created_at"], r["id"])),
        "d": r["description"] or "",
        "items": [
            {"question": a["question"], "answer": a["answer"], "role": a["role"]}
            for a in arows
        ],
    }
    single = _b64([session])
    budget = 1500
    if len(single) <= budget:
        rows = [[InlineKeyboardButton(
            text=f"➕ Восстановить #{rid}",
            web_app=WebAppInfo(url=f"{FORM_URL}?merge=1&gz=1&restore={single}"),
        )]]
        hint = "нажми кнопку."
    else:
        # запись не влезает в одну ссылку — режем на фрагменты, приложение соберёт
        n = -(-len(single) // budget)
        rows = [
            [InlineKeyboardButton(
                text=f"➕ Восстановить #{rid} ({i + 1}/{n})",
                web_app=WebAppInfo(
                    url=f"{FORM_URL}?merge=1&gz=1&part={i + 1}&total={n}"
                        f"&frag={session['t']}:{i}:{n}&restore={single[i * budget:(i + 1) * budget]}"
                ),
            )]
            for i in range(n)
        ]
        hint = "нажимай кнопки по порядку."
    try:
        await message.answer(
            f"Восстановить запись #{rid} (<b>{html.escape(r['category_title'])}</b>) в приложение — "
            f"{hint} Остальная история не тронется; добавится/обновится только эта запись.",
            parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=rows),
        )
    except Exception as e:
        logging.warning("restore send failed: %s", e)
        await message.answer("Не удалось сформировать ссылку восстановления (запись слишком большая).")


async def main():
    init_db()
    bot = Bot(TOKEN)
    await bot.set_my_commands([
        BotCommand(command="start", description="Начать"),
        BotCommand(command="my", description="Мои сохранённые ответы"),
        BotCommand(command="sync", description="Синхронизировать историю в приложение"),
    ])
    me = await bot.get_me()
    logging.info("Бот запущен: @%s | FORM_URL=%s", me.username, FORM_URL)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
