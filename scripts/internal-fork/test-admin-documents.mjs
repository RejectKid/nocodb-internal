import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const origin = process.env.NC_QA_URL || "http://localhost:8080";
const email = process.env.NC_QA_EMAIL;
const password = process.env.NC_QA_PASSWORD;
if (!email || !password)
  throw new Error(
    "Set NC_QA_EMAIL and NC_QA_PASSWORD to a test super-admin account. Use a disposable database."
  );
const artifacts = await mkdtemp(path.join(tmpdir(), "nocodb-documents-qa-"));
console.log("QA artifacts:", artifacts);
const require = createRequire(
  new URL("../../packages/nc-gui/package.json", import.meta.url)
);
const { chromium } = require("@playwright/test");
const browser = await chromium.launch({
  channel: process.env.NC_QA_BROWSER_CHANNEL || "chrome",
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const consoleWarnings = [];
page.on("console", (entry) => {
  if (entry.type() === "error") errors.push(entry.text());
  if (entry.type() === "warning") consoleWarnings.push(entry.text());
});
try {
  await page.goto(origin + "/signin");
  await page.getByPlaceholder("Enter your work email").fill(email);
  await page
    .getByPlaceholder("Enter your password", { exact: true })
    .fill(password);
  const loginResponse = page.waitForResponse(
    (r) =>
      r.url().includes("/auth/user/signin") && r.request().method() === "POST"
  );
  await page.getByRole("button", { name: "SIGN IN" }).click();
  const login = await (await loginResponse).json();
  await page.waitForURL((url) => !url.pathname.includes("signin"));
  await page.waitForTimeout(1200);
  if (await page.getByRole("button", { name: "Skip", exact: true }).isVisible())
    await page.getByRole("button", { name: "Skip", exact: true }).click();
  const headers = {
    "xc-auth": login.token,
    "content-type": "application/json",
  };
  const baseResponse = await fetch(origin + "/api/v2/meta/bases", {
    method: "POST",
    headers,
    body: JSON.stringify({ title: "Document QA " + Date.now() }),
  });
  const base = await baseResponse.json();
  if (!base.id)
    throw new Error("Base creation failed: " + JSON.stringify(base));
  console.log("Base created", base.id, base.fk_workspace_id);
  await page.goto(origin + "/");
  await page.getByTestId("nc-sidebar-userinfo").click();
  await page
    .getByRole("link", { name: "Internal administration", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Internal administration" })
    .waitFor();
  await page.getByText("Runtime", { exact: true }).waitFor();
  await page.getByRole("button", { name: "users", exact: true }).click();
  await page.getByRole("button", { name: "Inspect user" }).first().click();
  await page.getByRole("heading", { name: "Workspace memberships" }).waitFor();
  console.log("Admin overview and user inspection passed");
  await page.screenshot({ path: path.join(artifacts, "nocodb-admin-qa.png") });
  await page.goto(origin + `/${base.fk_workspace_id}/${base.id}`);
  await page.getByTestId("nc-home-create-new-btn").click();
  await page
    .getByRole("link", { name: "Documents — create or import", exact: true })
    .click();
  await page
    .getByRole("button", { name: "New document", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "New document", exact: true }).click();
  await page.locator('.tiptap[contenteditable="true"]').waitFor();
  await page
    .locator('.tiptap[contenteditable="true"]')
    .fill("Created through the document UI.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Saved", { exact: true }).waitFor();
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON", exact: true }).click();
  const download = await exported;
  await download.saveAs(path.join(artifacts, "nocodb-document-qa-export.json"));
  await page
    .getByTestId("document-import-input")
    .setInputFiles({
      name: "Imported Notes.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("# Imported heading\n\nTest **content**."),
    });
  await page.getByRole("button", { name: /Imported Notes/ }).waitFor();
  await page.getByRole("heading", { name: "Imported heading" }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: /Imported Notes/ }).click();
  await page.getByRole("heading", { name: "Imported heading" }).waitFor();
  console.log(
    "Create, edit, save, JSON download, Markdown import, reload and reopen passed"
  );
  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  await (
    await pdfDownload
  ).saveAs(path.join(artifacts, "nocodb-document-qa.pdf"));
  await page.getByPlaceholder("Add a comment").fill("QA collaboration comment");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await page.getByText("QA collaboration comment", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await page.getByText("Resolved", { exact: true }).waitFor();
  await page
    .getByTestId("document-import-input")
    .setInputFiles(path.join(artifacts, "nocodb-document-qa-export.json"));
  await page
    .getByText("Created through the document UI.", { exact: true })
    .waitFor();
  const docPath = `/api/internal/v1/workspaces/${base.fk_workspace_id}/bases/${base.id}/documents`;
  const anon = await fetch(origin + "" + docPath);
  if (anon.status !== 401)
    throw new Error("Anonymous document access not denied: " + anon.status);
  console.log(
    "Authenticated PDF download, comments/resolution, JSON reimport and anonymous denial passed"
  );
  await page.screenshot({
    path: path.join(artifacts, "nocodb-documents-qa.png"),
  });
  await page.goto(origin + "/internal/admin");
  await page.getByRole("button", { name: "bases", exact: true }).click();
  await page.getByPlaceholder("Search", { exact: true }).fill(base.title);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("button", { name: "Disable documents", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enable documents", exact: true })
    .waitFor();
  const disabled = await fetch(origin + docPath, { headers });
  if (![403, 404].includes(disabled.status))
    throw new Error(
      "Disabled base still exposes documents: " + disabled.status
    );
  await page
    .getByRole("button", { name: "Enable documents", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Disable documents", exact: true })
    .waitFor();
  const enabled = await fetch(origin + docPath, { headers });
  if (enabled.status !== 200)
    throw new Error("Re-enabled documents unavailable: " + enabled.status);
  console.log(
    "Base-menu navigation and admin disable/re-enable with direct API enforcement passed"
  );
  console.log("PAGE_ERRORS", JSON.stringify(errors));
  console.log("CONSOLE_WARNINGS", JSON.stringify(consoleWarnings));
  if (errors.length) throw new Error(errors.join("\n"));
} catch (e) {
  console.error(e);
  console.log("URL", page.url());
  console.log((await page.locator("body").innerText()).slice(0, 6000));
  console.log("PAGE_ERRORS", JSON.stringify(errors));
  await page.screenshot({
    path: path.join(artifacts, "nocodb-documents-qa-failure.png"),
  });
  process.exitCode = 1;
} finally {
  await browser.close();
}
