import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the Athlete care route shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Athlete 送迎ルート<\/title>/i);
  assert.match(html, /src="\/care-route\/"/);
  assert.match(html, /title="Athlete 送迎ルート"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("bundles the care route app assets", async () => {
  const [indexHtml, appJs] = await Promise.all([
    readFile(new URL("../public/care-route/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/care-route/app.js", import.meta.url), "utf8"),
  ]);

  assert.match(indexHtml, /<h1>Athlete 送迎ルート<\/h1>/);
  assert.match(indexHtml, /CSV・Excel一覧からまとめて登録/);
  assert.match(indexHtml, /CSV\/Excelファイルは選択すると自動登録されます/);
  assert.match(appJs, /loadBulkImportFile/);
  assert.match(appJs, /顧客名簿とプルダウンへ反映しました/);
});
