# Смоук-тест режима sort («Сортировка ожиданий») в headless-браузере.
# Стаб Telegram.WebApp + прогон полного флоу до sendData, проверка payload.
# Запуск: python3 tests/smoke_sort.py
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent

STUB = """
window.__sent = null;
window.__mb = { text: "", cb: null };
window.Telegram = { WebApp: {
  ready() {}, expand() {},
  MainButton: {
    setText(t) { window.__mb.text = t; }, show() {}, hide() {}, enable() {},
    onClick(cb) { window.__mb.cb = cb; }
  },
  BackButton: { show() {}, hide() {}, onClick() {} },
  HapticFeedback: { impactOccurred() {}, notificationOccurred() {} },
  CloudStorage: null,
  sendData(d) { window.__sent = d; },
  showAlert(m) { window.__alert = m; }
}};
"""


def wait_page(page, selector):
    page.wait_for_selector(selector, timeout=5000)


def mb_click(page):
    page.evaluate("window.__mb.cb()")
    page.wait_for_timeout(650)  # transitionTo fade = 550ms


def run():
    html = (
        "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>"
        f"<div id='app'></div><script>{STUB}</script>"
        "<script src='../app.js'></script></body></html>"
    )
    test_html = ROOT / "tests" / "_smoke.html"
    test_html.write_text(html, encoding="utf-8")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(f"file://{test_html}")

        # меню → категория
        wait_page(page, "[data-cat=expectations]")
        page.click("[data-cat=expectations]")
        page.wait_for_timeout(650)

        # describe
        wait_page(page, "#input")
        page.fill("#input", "Завтра выступаю с докладом перед командой")
        mb_click(page)

        # explist: 3 ожидания (третье оставляем в поле — должно подхватиться по «Далее»)
        wait_page(page, "#exp-input")
        for text in ["Все должны быть в восторге", "Я не должен запнуться ни разу"]:
            page.fill("#exp-input", text)
            page.click("#exp-add")
        assert page.locator(".exp-row").count() == 2, "ожидания не добавились в список"
        page.fill("#exp-input", "Хочу уложиться в 20 минут")
        mb_click(page)

        # bucket 1 → мир
        wait_page(page, ".bucket-btn")
        page.click(".bucket-btn[data-b=world]")
        mb_click(page)
        # bucket 2 → я
        wait_page(page, ".bucket-btn")
        page.click(".bucket-btn[data-b=self]")
        mb_click(page)
        # bucket 3 → предпочтение
        wait_page(page, ".bucket-btn")
        page.click(".bucket-btn[data-b=pref]")
        mb_click(page)

        # reword для «мир»
        wait_page(page, "#input")
        page.fill("#input", "Мне бы хотелось тёплого приёма, но я переживу и сдержанный")
        mb_click(page)
        # reword для «я»
        wait_page(page, "#input")
        page.fill("#input", "Я постараюсь говорить спокойно, и запинка не перечеркнёт доклад")
        mb_click(page)

        # summary: правим первую переформулировку прямо в итоге
        wait_page(page, "#sum-rw-0")
        page.fill("#sum-rw-0", "Мне бы хотелось тёплого приёма, но пойдёт любой честный отклик")
        mb_click(page)  # Сохранить → submit → sendData

        sent = page.evaluate("window.__sent")
        assert sent, f"sendData не вызван; ошибки страницы: {errors}"
        data = json.loads(sent)
        assert data["category"] == "expectations"
        ans = data["answers"]
        assert len(ans) == 3, f"ожидалось 3 items, got {len(ans)}"
        by_role = {a["role"]: a for a in ans}
        assert by_role["Требование к миру"]["answer"].endswith("любой честный отклик"), "правка из итога не подхватилась"
        assert by_role["Требование к себе"]["question"] == "Я не должен запнуться ни разу"
        p_item = by_role["Предпочтение"]
        assert p_item["question"] == p_item["answer"] == "Хочу уложиться в 20 минут"
        assert not errors, f"JS-ошибки: {errors}"

        browser.close()
    test_html.unlink()
    print("SMOKE_SORT_OK")


if __name__ == "__main__":
    try:
        run()
    except AssertionError as e:
        print(f"FAIL: {e}")
        sys.exit(1)
