import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        path = os.path.abspath("index.html")
        await page.goto(f"file://{path}")

        async def get_box(selector):
            return await page.evaluate(f"""
                (selector) => {{
                    const el = document.querySelector(selector);
                    const rect = el.getBoundingClientRect();
                    return {{ x: rect.x, y: rect.y, w: rect.width, h: rect.height }};
                }}
            """, selector)

        print("Checking initial state...")
        # Should be off-screen
        tools_box = await get_box("#tools-panel")
        print(f"Tools X: {tools_box['x']}")
        assert tools_box['x'] < 0

        print("Opening Tools Panel...")
        await page.click("button:has-text('時差計算')")
        await page.wait_for_timeout(600)
        tools_box = await get_box("#tools-panel")
        print(f"Tools X: {tools_box['x']}")
        assert tools_box['x'] >= 0

        print("Closing Tools Panel...")
        await page.click("#tools-panel button:has-text('✕')")
        await page.wait_for_timeout(600)
        tools_box = await get_box("#tools-panel")
        print(f"Tools X: {tools_box['x']}")
        assert tools_box['x'] < 0

        print("Opening Lesson Panel...")
        await page.click("button:has-text('レッスン')")
        await page.wait_for_timeout(600)
        lesson_box = await get_box("#lesson-panel")
        print(f"Lesson X: {lesson_box['x']}")
        assert lesson_box['x'] < 1280

        print("Closing Lesson Panel...")
        await page.click("#lesson-panel button:has-text('✕')")
        await page.wait_for_timeout(600)
        lesson_box = await get_box("#lesson-panel")
        print(f"Lesson X: {lesson_box['x']}")
        assert lesson_box['x'] >= 1280

        print("Opening Quiz Panel...")
        await page.click("button:has-text('クイズ')")
        await page.wait_for_timeout(600)
        quiz_box = await get_box("#quiz-panel")
        print(f"Quiz Y: {quiz_box['y']}")
        assert quiz_box['y'] < 720 # viewport height default is 720

        print("Closing Quiz Panel...")
        await page.click("#quiz-panel button:has-text('✕')")
        await page.wait_for_timeout(600)
        quiz_box = await get_box("#quiz-panel")
        print(f"Quiz Y: {quiz_box['y']}")
        assert quiz_box['y'] >= 720

        await page.screenshot(path="final_app_state_verified.png")
        print("Full UI verification complete. Screenshot saved.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
