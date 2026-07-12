# Смоук-тест связки «Цель без хватки» → карточка цели в CloudStorage →
# практика «Перед делом» → счётчик шагов. Запуск: python3 tests/smoke_goal.py
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent

STUB = """
window.__sent = [];
window.__mb = { text: "", cb: null };
window.__cs = {};   // работающий in-memory CloudStorage
window.Telegram = { WebApp: {
  ready() {}, expand() {},
  MainButton: {
    setText(t) { window.__mb.text = t; }, show() {}, hide() {}, enable() {},
    onClick(cb) { window.__mb.cb = cb; }
  },
  BackButton: { show() {}, hide() {}, onClick() {} },
  HapticFeedback: { impactOccurred() {}, notificationOccurred() {} },
  CloudStorage: {
    getItem(k, cb) { cb(null, window.__cs[k] ?? null); },
    setItem(k, v, cb) { window.__cs[k] = String(v); cb(null, true); },
    removeItem(k, cb) { delete window.__cs[k]; cb(null, true); }
  },
  sendData(d) { window.__sent.push(d); },
  showAlert(m) { window.__alert = m; }
}};
"""


def mb_click(page):
    page.evaluate("window.__mb.cb()")
    page.wait_for_timeout(650)


def fill_next(page, text):
    page.wait_for_selector("#input", timeout=5000)
    page.fill("#input", text)
    mb_click(page)


def run():
    html = (
        "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>"
        f"<div id='app'></div><script>{STUB}</script>"
        "<script src='../app.js'></script></body></html>"
    )
    test_html = ROOT / "tests" / "_smoke_goal.html"
    test_html.write_text(html, encoding="utf-8")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(f"file://{test_html}")

        # ── Слой 1: «Цель без хватки» ──
        page.wait_for_selector("[data-cat=longterm_goal]", timeout=5000)
        # скрытая категория не должна светиться в меню
        assert page.locator("[data-cat=pre_step]").count() == 0, "pre_step виден в меню"
        page.click("[data-cat=longterm_goal]")
        page.wait_for_timeout(650)

        fill_next(page, "Выпустить свой курс по продуктовой аналитике за год")
        for answer in [
            "Разбираю аналитику честно и делюсь регулярно",   # направление
            "Курс запущен, первые сто учеников, живые отзывы",  # образ
            "Страх, что назовут дилетантом, — и я замолкаю",    # препятствие
            "Если замолкаю от страха — публикую черновик как есть",  # если-то
        ]:
            mb_click(page)          # страница-комментарий
            fill_next(page, answer)  # страница-вопрос

        # выбор дня пересмотра
        page.wait_for_selector(".bucket-btn[data-d=Воскресенье]", timeout=5000)
        page.click(".bucket-btn[data-d=Воскресенье]")
        mb_click(page)

        # итог → сохранить
        page.wait_for_selector("#sum-desc", timeout=5000)
        mb_click(page)

        sent = page.evaluate("window.__sent")
        assert len(sent) == 1, f"ожидался 1 sendData, got {len(sent)}; ошибки: {errors}"
        data = json.loads(sent[0])
        assert data["category"] == "longterm_goal"
        day_items = [a for a in data["answers"] if a["question"] == "День пересмотра цели"]
        assert day_items and day_items[0]["answer"] == "Воскресенье", "день пересмотра не попал в выгрузку"

        goal = json.loads(page.evaluate("window.__cs['goal']"))
        assert goal["dir"].startswith("Разбираю аналитику"), f"карточка цели: {goal}"
        assert goal["day"] == "Воскресенье" and goal["steps"] == 0

        # ── Слой 2: «Перед делом» ──
        page.evaluate("mode = 'menu'; renderCategory()")
        page.wait_for_selector("#goal-go", timeout=5000)
        page.click("#goal-go")
        page.wait_for_timeout(650)

        # первый вопрос показывает направление
        page.wait_for_selector(".situation", timeout=5000)
        assert "Разбираю аналитику" in page.inner_text(".situation")
        fill_next(page, "Написать план первого модуля")
        fill_next(page, "План выйдет стройным. Если выйдет по-другому — я оставлю его кривым и продолжу")
        fill_next(page, "Пишу 30 минут не открывая чужие курсы для сравнения")

        page.wait_for_selector(".sum-edit", timeout=5000)
        mb_click(page)  # Сохранить

        sent = page.evaluate("window.__sent")
        assert len(sent) == 2, f"ожидалось 2 sendData, got {len(sent)}"
        practice = json.loads(sent[1])
        assert practice["category"] == "pre_step"
        assert len(practice["answers"]) == 3
        assert practice["description"] == "", "у практики не должно быть description"

        goal = json.loads(page.evaluate("window.__cs['goal']"))
        assert goal["steps"] == 1, f"счётчик шагов не увеличился: {goal}"

        # кнопка на меню показывает счётчик
        page.evaluate("mode = 'menu'; renderCategory()")
        page.wait_for_selector("#goal-go", timeout=5000)
        assert "шагов: 1" in page.inner_text("#goal-go")

        assert not errors, f"JS-ошибки: {errors}"
        browser.close()
    test_html.unlink()
    print("SMOKE_GOAL_OK")


if __name__ == "__main__":
    try:
        run()
    except AssertionError as e:
        print(f"FAIL: {e}")
        sys.exit(1)
