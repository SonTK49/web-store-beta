// Quét thư mục apps/ và tạo apps.json cho trang Web Store.
// Chạy tự động trên GitHub Actions mỗi khi có thay đổi; chạy tay: node scripts/build-apps.mjs
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = "apps";
const IMG = ["png", "jpg", "jpeg", "webp", "svg"];
const apps = [];

const git = (cmd) => {
  try { return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return ""; }
};
const findImage = (dir, base) => {
  for (const ext of IMG) if (fs.existsSync(path.join(dir, `${base}.${ext}`))) return `${base}.${ext}`;
  return null;
};
const fromHtml = (html, re) => (html.match(re) || [])[1]?.replace(/\s+/g, " ").trim() || "";

for (const slug of fs.readdirSync(ROOT).sort()) {
  const dir = path.join(ROOT, slug);
  if (slug.startsWith(".") || slug.startsWith("_") || !fs.statSync(dir).isDirectory()) continue;

  const entry = path.join(dir, "index.html");
  if (!fs.existsSync(entry)) { console.warn(`⚠ Bỏ qua ${slug}: thiếu index.html`); continue; }

  let meta = {};
  const metaFile = path.join(dir, "app.json");
  if (fs.existsSync(metaFile)) {
    try { meta = JSON.parse(fs.readFileSync(metaFile, "utf8")); }
    catch (e) { console.warn(`⚠ ${slug}/app.json sai cú pháp, dùng thông tin mặc định (${e.message})`); }
  }

  const html = fs.readFileSync(entry, "utf8");
  const icon = meta.icon || findImage(dir, "icon");
  const cover = meta.cover || findImage(dir, "cover");
  const added = Number(git(`git log --diff-filter=A --format=%ct -- "${dir}" | tail -1`)) || 0;
  const updated = Number(git(`git log -1 --format=%ct -- "${dir}"`)) || 0;

  apps.push({
    id: slug,
    title: meta.title || fromHtml(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || slug,
    type: meta.type === "tool" ? "tool" : "game",
    category: meta.category || "",
    description: meta.description || fromHtml(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i),
    author: meta.author || "",
    color: meta.color || "",
    icon: icon ? `${ROOT}/${slug}/${icon}` : null,
    cover: cover ? `${ROOT}/${slug}/${cover}` : null,
    path: `${ROOT}/${slug}/`,
    added: added * 1000,
    updated: updated * 1000,
  });
}

apps.sort((a, b) => b.added - a.added || a.title.localeCompare(b.title, "vi"));
fs.writeFileSync("apps.json", JSON.stringify({ generated: Date.now(), apps }, null, 2) + "\n");
console.log(`✓ apps.json: ${apps.length} app`);
