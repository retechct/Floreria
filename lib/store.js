const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

// PostgreSQL is shared by all serverless instances. Disk mode is for one Node process.
function createStore({ databaseUrl = process.env.DATABASE_URL, directory = process.env.DATA_DIR } = {}) {
  const production = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  const diskAllowed = !process.env.VERCEL && (!production || Boolean(directory));
  const folder = path.resolve(directory || path.join(__dirname, "..", ".runtime"));
  const pool = databaseUrl ? new (require("pg").Pool)({ connectionString: databaseUrl, max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000 }) : null;
  let ready;
  let queue = Promise.resolve();
  const serial = (fn) => {
    const result = queue.then(fn);
    queue = result.catch(() => {});
    return result;
  };

  async function init() {
    if (!ready) ready = (async () => {
      if (pool) {
        await pool.query("CREATE TABLE IF NOT EXISTS shop_documents (key text PRIMARY KEY, value jsonb NOT NULL)");
        await pool.query("CREATE TABLE IF NOT EXISTS shop_images (id text PRIMARY KEY, content bytea NOT NULL)");
      } else {
        if (!diskAllowed) throw Object.assign(new Error("Configura DATABASE_URL para guardar los datos de la tienda."), { status: 503 });
        await fs.mkdir(path.join(folder, "images"), { recursive: true });
      }
    })().catch((error) => { ready = undefined; throw error; });
    return ready;
  }

  function fileFor(key) {
    return path.join(folder, `${crypto.createHash("sha256").update(key).digest("hex")}.json`);
  }

  async function read(key, fallback = null) {
    await init();
    if (pool) {
      const result = await pool.query("SELECT value FROM shop_documents WHERE key = $1", [key]);
      return result.rows[0]?.value ?? structuredClone(fallback);
    }
    try { return JSON.parse(await fs.readFile(fileFor(key), "utf8")); }
    catch (error) { if (error.code === "ENOENT") return structuredClone(fallback); throw error; }
  }

  async function update(key, fallback, change) {
    await init();
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("INSERT INTO shop_documents (key, value) VALUES ($1, $2::jsonb) ON CONFLICT DO NOTHING", [key, JSON.stringify(fallback)]);
        const result = await client.query("SELECT value FROM shop_documents WHERE key = $1 FOR UPDATE", [key]);
        const next = await change(result.rows[0].value);
        await client.query("UPDATE shop_documents SET value = $2::jsonb WHERE key = $1", [key, JSON.stringify(next)]);
        await client.query("COMMIT");
        return next;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally { client.release(); }
    }
    return serial(async () => {
      const next = await change(await read(key, fallback));
      const target = fileFor(key);
      const temporary = `${target}.${crypto.randomUUID()}.tmp`;
      await fs.writeFile(temporary, JSON.stringify(next), { mode: 0o600 });
      await fs.rename(temporary, target);
      return next;
    });
  }

  async function saveImage(buffer) {
    await init();
    const id = crypto.createHash("sha256").update(buffer).digest("hex");
    if (pool) await pool.query("INSERT INTO shop_images (id, content) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, buffer]);
    else await fs.writeFile(path.join(folder, "images", `${id}.webp`), buffer);
    return `/api/media/${id}`;
  }

  async function readImage(id) {
    await init();
    if (!/^[a-f0-9]{64}$/.test(id)) return null;
    if (pool) return (await pool.query("SELECT content FROM shop_images WHERE id = $1", [id])).rows[0]?.content || null;
    try { return await fs.readFile(path.join(folder, "images", `${id}.webp`)); }
    catch (error) { if (error.code === "ENOENT") return null; throw error; }
  }

  return { read, update, saveImage, readImage, init, mode: pool ? "postgres" : "disk", close: () => pool?.end() };
}

module.exports = { createStore };
