import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createApp } from "./app.js";
import { buildMetrics } from "./observability/metrics.js";
import { toErrorResponse } from "./core/errors.js";

const app = createApp();
const port = Number(process.env.PORT || 8080);
const publicRoot = join(process.cwd(), "public");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function send(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

async function sendStatic(res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const absolutePath = join(publicRoot, safePath);

  if (!absolutePath.startsWith(publicRoot)) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return true;
  }

  try {
    const data = await readFile(absolutePath);
    const type = contentTypes[extname(absolutePath)] || "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

function routeParam(pathname, prefix) {
  if (!pathname.startsWith(prefix)) return null;
  const value = pathname.slice(prefix.length).split("/")[0];
  return value || null;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && (url.pathname === "/" || url.pathname.startsWith("/assets/"))) {
      const served = await sendStatic(res, url.pathname);
      if (served) return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return send(res, 200, { ok: true, service: "agentic-operations-platform" });
    }

    if (req.method === "POST" && url.pathname === "/tasks") {
      const body = await readJson(req);
      const task = app.dispatcher.createTask(body);
      return send(res, 202, task);
    }

    if (req.method === "GET" && url.pathname === "/tasks") {
      return send(res, 200, { tasks: app.dispatcher.listTasks() });
    }

    const taskId = routeParam(url.pathname, "/tasks/");
    if (req.method === "GET" && taskId && !url.pathname.endsWith("/audit")) {
      return send(res, 200, app.dispatcher.getTask(taskId));
    }

    if (req.method === "GET" && taskId && url.pathname.endsWith("/audit")) {
      return send(res, 200, { events: app.audit.list({ taskId }) });
    }

    if (req.method === "POST" && taskId && url.pathname.endsWith("/cancel")) {
      const body = await readJson(req);
      return send(res, 200, app.dispatcher.cancelTask(taskId, body.reason || "cancelled_by_user"));
    }

    if (req.method === "GET" && url.pathname === "/approvals") {
      return send(res, 200, { approvals: app.approvals.list({ status: url.searchParams.get("status") || undefined }) });
    }

    const approvalId = routeParam(url.pathname, "/approvals/");
    if (req.method === "POST" && approvalId && url.pathname.endsWith("/decision")) {
      const body = await readJson(req);
      return send(res, 200, app.approvals.decide(approvalId, body));
    }

    if (req.method === "GET" && url.pathname === "/audit") {
      return send(res, 200, { events: app.audit.list() });
    }

    if (req.method === "GET" && url.pathname === "/knowledge") {
      const query = url.searchParams.get("q");
      if (query) {
        return send(res, 200, app.knowledgeGraph.search({
          query,
          entity_filters: url.searchParams.getAll("type"),
          max_results: Number(url.searchParams.get("limit") || 8),
          min_confidence: Number(url.searchParams.get("min_confidence") || 0)
        }));
      }
      return send(res, 200, app.knowledgeGraph.snapshot());
    }

    if (req.method === "GET" && url.pathname === "/metrics") {
      return send(res, 200, buildMetrics(app));
    }

    return send(res, 404, { error: { code: "not_found", message: "Route not found" } });
  } catch (error) {
    const status = error.status || 500;
    return send(res, status, toErrorResponse(error));
  }
});

server.listen(port, () => {
  console.log(`Agentic Operations Platform listening on http://localhost:${port}`);
});
