import { NextResponse } from "next/server";

const defaultEndpoint = "http://localhost:3333/mcp";
const repoUrl = "https://github.com/sansan0/TrendRadar.git";
const tools = [
  "get_latest_news",
  "get_trending_topics",
  "search_news",
  "get_latest_rss",
  "analyze_topic_trend",
  "aggregate_news",
  "trigger_crawl"
];

function normalizeEndpoint(value: unknown) {
  const raw = typeof value === "string" && value.trim() ? value.trim() : defaultEndpoint;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false as const, message: "TrendRadar Endpoint 格式不正确，默认应为 http://localhost:3333/mcp。" };
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!["http:", "https:"].includes(url.protocol) || !localHosts.has(url.hostname)) {
    return { ok: false as const, message: "MVP 阶段只允许测试本机 TrendRadar 服务，避免后台接口被当成外部探测器。" };
  }

  url.search = "";
  url.hash = "";
  return { ok: true as const, url };
}

async function probeMcp(endpoint: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "trendradar-init",
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "ai-content-workbench",
            version: "0.1.0"
          }
        }
      }),
      cache: "no-store",
      signal: controller.signal
    });

    return {
      reachable: response.status < 500,
      status: response.status,
      contentType: response.headers.get("content-type") ?? ""
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "TrendRadar MCP",
    repoUrl,
    defaultEndpoint,
    tools,
    installCommands: [
      "cd ~/Documents",
      `git clone ${repoUrl}`,
      "cd TrendRadar",
      "./setup-mac.sh",
      "./start-http.sh"
    ]
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { endpoint?: string };
  const normalized = normalizeEndpoint(body.endpoint);
  if (!normalized.ok) {
    return NextResponse.json({
      ok: false,
      message: normalized.message,
      repoUrl,
      defaultEndpoint,
      tools
    });
  }

  try {
    const probe = await probeMcp(normalized.url);
    return NextResponse.json({
      ok: probe.reachable,
      message: probe.reachable
        ? `TrendRadar MCP 有响应：${normalized.url.toString()}。可以作为灵感库热点源。`
        : `TrendRadar MCP 暂未连通：HTTP ${probe.status}。请确认 ./start-http.sh 已启动。`,
      endpoint: normalized.url.toString(),
      status: probe.status,
      contentType: probe.contentType,
      repoUrl,
      tools
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error && error.name === "AbortError"
        ? "TrendRadar MCP 连接超时，请确认服务已在 3333 端口启动。"
        : "TrendRadar MCP 暂未启动。先 clone 仓库，运行 ./setup-mac.sh，再运行 ./start-http.sh。",
      endpoint: normalized.url.toString(),
      repoUrl,
      tools
    });
  }
}
