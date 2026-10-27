// Actual authenticated MatterWorkspace with synthetic API responses. No model
// call, customer matter or production origin is used by this regression.
import assert from "node:assert/strict";
export async function run({ page, base, userId }) {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
  const matter = {
    id: "scroll-regression",
    role: "owner",
    sees: "full",
    status: "open",
    jurisdiction: "CH",
    core: {
      title: "Synthetic scrolling check",
      summary: "",
      area: "",
      facts: [],
      hide: [],
    },
    participants: [{ sub: userId, role: "owner", alias: "Owner" }],
    events: [
      {
        id: 1,
        at: new Date().toISOString(),
        kind: "message",
        actor: userId,
        role: "user",
        text: "A synthetic question.",
      },
      {
        id: 2,
        at: new Date().toISOString(),
        kind: "message",
        actor: "agent",
        role: "assistant",
        text: "A synthetic paragraph with no legal or personal content.\n\n".repeat(
          90,
        ),
      },
    ],
    items: [],
    approvals: [],
    documents: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  let pending;
  let reads = 0;
  await page.route("**/api/matters/scroll-regression", (route) => {
    reads++;
    return route.fulfill({ json: { matter } });
  });
  await page.route("**/api/matters/scroll-regression/messages", (route) => {
    pending = route;
  });
  for (const width of [390, 1280]) {
    pending = null;
    const readsBefore = reads;
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${base}/de/matters/scroll-regression`);
    await page.locator(".ck-input").waitFor();
    await page.locator(".ck-input").fill("Synthetic follow-up question.");
    await page.locator(".ck-input").press("Enter");
    await page.locator(".ck-live").waitFor();
    for (let attempt = 0; !pending && attempt < 50; attempt++)
      await page.waitForTimeout(20);
    assert.ok(pending, "the real workspace sent through its message route");
    const position = () =>
      page.evaluate(() => document.scrollingElement.scrollTop);
    const bottom = await position();
    await page.mouse.move(width / 2, 400);
    await page.mouse.wheel(0, -480);
    await page.waitForTimeout(200);
    const reading = await position();
    assert.ok(
      reading < bottom - 200,
      `Causius ${width}: upward scroll reaches the page`,
    );
    const status = await page.locator(".ck-live").textContent();
    // Causius changes its working message every four seconds. Wait for a real
    // status transition, rather than merely rerendering a static mock.
    await page.waitForFunction(
      (previous) =>
        document.querySelector(".ck-live")?.textContent !== previous,
      status,
      { timeout: 6500 },
    );
    assert.ok(
      Math.abs((await position()) - reading) < 4,
      `Causius ${width}: working status preserves reading position`,
    );
    if (width === 390) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
      const beforeTouch = await position();
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 195, y: 180 }],
      });
      for (let y = 210; y <= 570; y += 30) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: 195, y }],
        });
        await page.waitForTimeout(25);
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await page.waitForTimeout(500);
      assert.ok(
        (await position()) < beforeTouch - 100,
        "Causius phone: upward touch remains free",
      );
      await cdp.detach();
    }
    let stable = 0,
      last = await position();
    for (let attempt = 0; stable < 3 && attempt < 40; attempt++) {
      await page.waitForTimeout(100);
      const current = await position();
      stable = Math.abs(current - last) < 1 ? stable + 1 : 0;
      last = current;
    }
    assert.ok(
      stable >= 3,
      "touch momentum settles before testing answer completion",
    );
    const beforeAnswer = await position();
    await pending.fulfill({
      json: {
        matter: {
          ...matter,
          events: [
            ...matter.events,
            {
              id: 3,
              at: new Date().toISOString(),
              kind: "message",
              actor: userId,
              role: "user",
              text: "Synthetic follow-up question.",
            },
            {
              id: 4,
              at: new Date().toISOString(),
              kind: "message",
              actor: "agent",
              role: "assistant",
              text: "Synthetic completed answer.",
            },
          ],
        },
      },
    });
    await page.locator(".ck-live").waitFor({ state: "detached" });
    await page.waitForTimeout(250);
    assert.ok(
      Math.abs((await position()) - beforeAnswer) < 4,
      `Causius ${width}: answer completion preserves reading position (${beforeAnswer} -> ${await position()})`,
    );
    await page.evaluate(() => {
      localStorage.setItem(
        "causius.model.pick.v1",
        JSON.stringify("synthetic-model"),
      );
      window.dispatchEvent(new Event("storage"));
    });
    await page.waitForTimeout(200);
    assert.equal(
      reads - readsBefore,
      1,
      "status updates, answer completion and model changes do not reload the conversation",
    );
    console.log(
      `PASS actual Causius matter workspace at ${width}px: upward scroll, working status and completed answer${width === 390 ? ", touch swipe" : ""}`,
    );
  }
}
