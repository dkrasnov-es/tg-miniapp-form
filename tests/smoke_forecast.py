# Смоук-тест «Прогноз vs реальность»: фаза «до» → карточка в CS → кнопка
# «Проверить прогноз» → фаза «после» → сравнение → sendData + статистика.
# Запуск: python3 tests/smoke_forecast.py
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent

STUB = """
window.__sent = [];
window.__mb = { text: "", cb: null };
window.__cs = {};
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


def set_scale(page, i, value):
    page.evaluate(
        f"const el = document.getElementById('scale-{i}');"
        f"el.value = {value}; el.dispatchEvent(new Event('input'));"
        f"el.oninput && el.oninput();"
    )


def run():
    html = (
        "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>"
        f"<div id='app'></div><script>{STUB}</script>"
        "<script src='../app.js'></script></body></html>"
    )
    test_html = ROOT / "tests" / "_smoke_forecast.html"
    test_html.write_text(html, encoding="utf-8")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(f"file://{test_html}")

        # ── фаза «до» ──
        page.wait_for_selector("#exp-go", timeout=5000)
        assert "Прогноз vs реальность" in page.inner_text("#exp-go")
        assert page.locator("[data-cat=forecast]").count() == 0, "forecast виден в общем меню"
        page.click("#exp-go")
        page.wait_for_timeout(650)

        page.wait_for_selector("#input", timeout=5000)
        page.fill("#input", "Подойти к незнакомому спикеру после митапа и задать вопрос")
        mb_click(page)

        page.wait_for_selector("#scale-0", timeout=5000)
        set_scale(page, 0, 3)   # как пройдёт: мрачно
        set_scale(page, 1, 8)   # вероятность отказа: высокая
        set_scale(page, 2, 2)   # понравлюсь: вряд ли
        mb_click(page)          # «Записать прогноз»

        page.wait_for_selector("#exp-home", timeout=5000)
        exp = json.loads(page.evaluate("window.__cs['exp']"))
        assert exp["before"] == {"outcome": 3, "reject": 8, "liked": 2}, f"карточка: {exp}"
        assert page.evaluate("window.__sent.length") == 0, "фаза «до» не должна слать sendData"

        # ── меню: кнопка проверки ──
        page.click("#exp-home")
        page.wait_for_timeout(650)
        page.wait_for_selector("#exp-go", timeout=5000)
        assert "Проверить прогноз" in page.inner_text("#exp-go")
        page.click("#exp-go")
        page.wait_for_timeout(650)

        # ── фаза «после» ──
        page.wait_for_selector("#scale-0", timeout=5000)
        assert "на самом деле" in page.inner_text(".question")
        set_scale(page, 0, 8)   # прошло отлично
        set_scale(page, 1, 2)   # неловкости почти не было
        set_scale(page, 2, 7)   # понравился
        mb_click(page)

        page.wait_for_selector("#input", timeout=5000)
        page.fill("#input", "Спикер сам предложил продолжить разговор за кофе")
        mb_click(page)

        # ── сравнение ──
        page.wait_for_selector(".cmp-row", timeout=5000)
        assert page.locator(".cmp-row").count() == 3
        body = page.inner_text("#app")
        assert "3 → 8" in body and "8 → 2" in body and "2 → 7" in body, body
        # gap = ((8-3) + (8-2) + (7-2)) / 3 = 16/3 ≈ 5,3
        assert "реальность лучше прогноза на 5,3" in body, body
        mb_click(page)  # Сохранить

        sent = page.evaluate("window.__sent")
        assert len(sent) == 1, f"ожидался 1 sendData, got {len(sent)}; ошибки: {errors}"
        data = json.loads(sent[0])
        assert data["category"] == "forecast"
        roles = [a["role"] for a in data["answers"]]
        assert roles.count("Прогноз") == 3 and roles.count("Реальность") == 4, roles
        gap_item = [a for a in data["answers"] if a["role"] is None][0]
        assert gap_item["answer"] == "+5,3", gap_item

        # эксперимент закрыт, статистика накоплена
        assert page.evaluate("window.__cs['exp']") is None
        stats = json.loads(page.evaluate("window.__cs['expstats']"))
        assert stats["n"] == 1 and abs(stats["sum"] - 16 / 3) < 0.01, stats

        # меню снова предлагает новый прогноз
        page.evaluate("mode = 'menu'; renderCategory()")
        page.wait_for_selector("#exp-go", timeout=5000)
        assert "Прогноз vs реальность" in page.inner_text("#exp-go")

        assert not errors, f"JS-ошибки: {errors}"
        browser.close()
    test_html.unlink()
    print("SMOKE_FORECAST_OK")


if __name__ == "__main__":
    try:
        run()
    except AssertionError as e:
        print(f"FAIL: {e}")
        sys.exit(1)
