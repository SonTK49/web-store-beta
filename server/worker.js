/**
 * Web Store API — server mini chạy trên Cloudflare Workers.
 *
 * Nhận app do bạn bè gửi từ trang submit.html và đẩy lên repo GitHub bằng token của chủ repo.
 * Token KHÔNG bao giờ lộ ra trình duyệt: nó chỉ nằm trong biến bí mật của Worker.
 *
 * Biến môi trường (Cloudflare → Worker → Settings → Variables and Secrets):
 *   GITHUB_TOKEN   (Secret)  Fine-grained token, chỉ repo web-store, quyền Contents + Pull requests: Read and write
 *   INVITE_CODES   (Secret)  Danh sách mã mời, cách nhau dấu phẩy. Có thể kèm tên: "Nam:caro-2026,Linh:hoa-sen-77"
 *   REPO           (Text)    "<tên-tài-khoản>/web-store"
 *   ALLOWED_ORIGIN (Text)    "https://<tên-tài-khoản>.github.io" (nhiều địa chỉ: cách nhau dấu phẩy)
 *   PUBLISH_MODE   (Text)    "review" (mặc định: tạo Pull Request chờ bạn duyệt) hoặc "direct" (đăng thẳng)
 *   BRANCH         (Text)    tùy chọn, mặc định "main"
 *
 * Các đường dẫn (đều là POST, kèm header X-Invite-Code):
 *   /check   → kiểm tra mã mời
 *   /blob    → tải lên 1 file (body: {"content":"<base64>","encoding":"base64"}) → { sha }
 *   /submit  → { app:{slug,title,type,category,description,author,color}, files:[{path,sha}], update }
 */

const MAX_BLOB_BYTES = 36 * 1024 * 1024; // ~25 MB file gốc sau khi mã hóa base64
const MAX_FILES = 1000;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const SEGMENT_RE = /^[\p{L}\p{N}_\-][\p{L}\p{N}\p{M} ._()\-\[\]+@,~]*$/u;
const SHA_RE = /^[0-9a-f]{40}$/;

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!cors) return json({ error: "Trang này không được phép gửi app." }, 403, {});

    const path = new URL(req.url).pathname.replace(/\/+$/, "");
    try {
      if (req.method !== "POST") return json({ error: "Không tìm thấy." }, 404, cors);
      for (const k of ["GITHUB_TOKEN", "INVITE_CODES", "REPO"])
        if (!env[k]) return json({ error: `Server chưa cấu hình biến ${k}.` }, 500, cors);

      const who = checkInvite(req.headers.get("x-invite-code"), env);
      if (!who) return json({ error: "Mã mời không đúng hoặc đã bị thu hồi." }, 401, cors);

      if (path === "/check") return json({ ok: true, name: who.name, mode: mode(env) }, 200, cors);
      if (path === "/blob") return json(await uploadBlob(req, env), 200, cors);
      if (path === "/submit") return json(await submit(req, env, who), 200, cors);
      return json({ error: "Không tìm thấy." }, 404, cors);
    } catch (e) {
      return json({ error: e.publicMessage || "Lỗi server: " + (e.message || e) }, e.httpStatus || 500, cors);
    }
  },
};

// ---------- helpers ----------
const mode = env => (env.PUBLISH_MODE === "direct" ? "direct" : "review");
const branch = env => env.BRANCH || "main";
const fail = (status, msg) => Object.assign(new Error(msg), { httpStatus: status, publicMessage: msg });

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, "content-type": "application/json; charset=utf-8" } });
}

function corsHeaders(req, env) {
  const origin = req.headers.get("origin") || "";
  const allowed = (env.ALLOWED_ORIGIN || "*").split(",").map(s => s.trim().replace(/\/+$/, "")).filter(Boolean);
  const ok = allowed.includes("*") || allowed.includes(origin);
  if (!ok) return null;
  return {
    "access-control-allow-origin": allowed.includes("*") ? "*" : origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-invite-code",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

function checkInvite(code, env) {
  code = (code || "").trim();
  if (!code) return null;
  for (const item of env.INVITE_CODES.split(",")) {
    const raw = item.trim();
    if (!raw) continue;
    const i = raw.lastIndexOf(":");
    const name = i > 0 ? raw.slice(0, i).trim() : "";
    const value = i > 0 ? raw.slice(i + 1).trim() : raw;
    if (value && safeEqual(value, code)) return { name };
  }
  return null;
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function gh(env, method, path, body) {
  const api = env.GITHUB_API || "https://api.github.com";
  const r = await fetch(api + path, {
    method,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "web-store-worker",
      ...(body != null ? { "content-type": "application/json" } : {}),
    },
    body: body == null ? undefined : typeof body === "string" || body instanceof ArrayBuffer ? body : JSON.stringify(body),
  });
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!r.ok) {
    const e = new Error(`GitHub ${r.status}: ${data.message || "lỗi không rõ"}`);
    e.ghStatus = r.status;
    if (r.status === 401 || r.status === 403) { e.httpStatus = 502; e.publicMessage = "Token GitHub của server hết hạn hoặc thiếu quyền. Hãy báo chủ Web Store."; }
    throw e;
  }
  return data;
}

// ---------- /blob ----------
async function uploadBlob(req, env) {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BLOB_BYTES) throw fail(413, "File quá lớn (tối đa 25 MB mỗi file).");
  // Chuyển thẳng nội dung sang GitHub, không giải mã → tốn rất ít CPU của Worker.
  const body = await req.arrayBuffer();
  if (!body.byteLength || body.byteLength > MAX_BLOB_BYTES) throw fail(413, "File rỗng hoặc quá lớn (tối đa 25 MB).");
  const head = new TextDecoder().decode(body.slice(0, 16));
  if (!head.startsWith('{"content":"')) throw fail(400, "Dữ liệu file không hợp lệ.");
  const d = await gh(env, "POST", `/repos/${env.REPO}/git/blobs`, body);
  return { sha: d.sha };
}

// ---------- /submit ----------
function clean(s, max) { return String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max); }

function validate(body) {
  const a = body?.app || {};
  const slug = String(a.slug || "");
  if (!SLUG_RE.test(slug)) throw fail(400, "Tên thư mục app không hợp lệ (chỉ a-z, 0-9 và dấu gạch ngang).");
  const title = clean(a.title, 80);
  if (!title) throw fail(400, "Thiếu tên app.");
  const meta = {
    title,
    type: a.type === "tool" ? "tool" : "game",
    category: clean(a.category, 40),
    description: clean(a.description, 500),
    author: clean(a.author, 60),
    color: /^#[0-9a-f]{6}$/i.test(a.color || "") ? a.color : "",
  };

  const files = Array.isArray(body.files) ? body.files : [];
  if (!files.length) throw fail(400, "Chưa có file nào.");
  if (files.length > MAX_FILES) throw fail(400, `Quá nhiều file (tối đa ${MAX_FILES}).`);
  const seen = new Set();
  const out = [];
  for (const f of files) {
    const p = String(f?.path || "").normalize("NFC");
    const segs = p.split("/");
    if (!p || p.length > 300 || segs.some(s => !SEGMENT_RE.test(s)))
      throw fail(400, `Tên file không hợp lệ: ${p.slice(0, 120)}`);
    if (!SHA_RE.test(f.sha || "")) throw fail(400, "Thiếu dữ liệu file, hãy thử gửi lại.");
    if (p === "app.json") continue; // app.json do server tự tạo từ thông tin đã kiểm tra
    if (seen.has(p)) throw fail(400, `File bị trùng: ${p}`);
    seen.add(p);
    out.push({ path: p, sha: f.sha });
  }
  if (!seen.has("index.html")) throw fail(400, "Thiếu index.html ở thư mục gốc của app.");
  return { slug, meta, files: out, update: !!body.update };
}

async function submit(req, env, who) {
  let body;
  try { body = await req.json(); } catch { throw fail(400, "Dữ liệu gửi lên không hợp lệ."); }
  const { slug, meta, files, update } = validate(body);
  const repo = `/repos/${env.REPO}`;
  const base = branch(env);
  const sender = who.name || meta.author || "bạn bè";
  if (!meta.author && who.name) meta.author = who.name;

  for (let attempt = 0; attempt < 3; attempt++) {
    const ref = await gh(env, "GET", `${repo}/git/ref/heads/${encodeURIComponent(base)}`);
    const parent = ref.object.sha;
    const commit = await gh(env, "GET", `${repo}/git/commits/${parent}`);

    // Tìm file cũ của app (nếu đã có) để thay thế sạch sẽ
    const prefix = `apps/${slug}/`;
    const tree = await gh(env, "GET", `${repo}/git/trees/${commit.tree.sha}?recursive=1`);
    const existing = (tree.tree || []).filter(t => t.type === "blob" && t.path.startsWith(prefix)).map(t => t.path);
    if (existing.length && !update)
      throw fail(409, "Đã có app dùng tên thư mục này. Hãy đổi tên thư mục, hoặc đánh dấu là cập nhật app cũ.");

    const keep = new Set(files.map(f => prefix + f.path).concat(prefix + "app.json"));
    const entries = [
      ...files.map(f => ({ path: prefix + f.path, mode: "100644", type: "blob", sha: f.sha })),
      { path: prefix + "app.json", mode: "100644", type: "blob", content: JSON.stringify(meta, null, 2) + "\n" },
      ...existing.filter(p => !keep.has(p)).map(p => ({ path: p, mode: "100644", type: "blob", sha: null })),
    ];
    const newTree = await gh(env, "POST", `${repo}/git/trees`, { base_tree: commit.tree.sha, tree: entries });
    const verb = existing.length ? "Cập nhật" : "Thêm";
    const message = `${verb} app: ${meta.title} (gửi bởi ${sender})`;
    const newCommit = await gh(env, "POST", `${repo}/git/commits`, { message, tree: newTree.sha, parents: [parent] });

    if (mode(env) === "direct") {
      try {
        await gh(env, "PATCH", `${repo}/git/refs/heads/${encodeURIComponent(base)}`, { sha: newCommit.sha, force: false });
        return { ok: true, mode: "direct", slug };
      } catch (e) {
        if (e.ghStatus === 422 && attempt < 2) continue; // có người vừa đăng cùng lúc → làm lại trên bản mới nhất
        throw e;
      }
    }

    const head = `submit/${slug}-${Date.now().toString(36)}`;
    await gh(env, "POST", `${repo}/git/refs`, { ref: `refs/heads/${head}`, sha: newCommit.sha });
    const pr = await gh(env, "POST", `${repo}/pulls`, {
      title: message,
      head,
      base,
      body: [
        `**${meta.title}** (${meta.type === "tool" ? "Tiện ích" : "Game"}${meta.category ? " · " + meta.category : ""})`,
        meta.description && `> ${meta.description}`,
        `Gửi bởi: ${sender} · ${files.length} file · thư mục \`${prefix}\``,
        "",
        "Bấm **Merge pull request** để đưa app lên Web Store.",
      ].filter(Boolean).join("\n\n"),
    });
    return { ok: true, mode: "review", slug, url: pr.html_url };
  }
  throw fail(503, "Server đang bận, hãy thử lại sau ít phút.");
}
