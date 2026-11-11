import { NextResponse } from "next/server";
import dns from "node:dns/promises";
import net from "node:net";

type TestCredential = {
  apiKey?: string;
  endpoint?: string;
  modelId?: string;
  secretId?: string;
};

type TestModel = {
  provider?: string;
  name?: string;
  endpoint?: string;
  modelId?: string;
  credential?: TestCredential;
};

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isBenchmarkIpv4(address: string) {
  const [a, b] = address.split(".").map((part) => Number(part));
  return a === 198 && (b === 18 || b === 19);
}

function isPrivateIpv6(address: string) {
  const lower = address.toLowerCase();
  const mappedIpv4 = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedIpv4) return isPrivateIpv4(mappedIpv4[1]!);
  return lower === "::" || lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb");
}

function isBlockedAddress(address: string) {
  const family = net.isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return true;
}

async function assertPublicEndpoint(rawEndpoint: string) {
  let url: URL;
  try {
    url = new URL(rawEndpoint.trim());
  } catch {
    return { ok: false as const, message: "Endpoint 格式不正确，请填写完整的 HTTPS 地址。" };
  }

  if (url.protocol !== "https:") {
    return { ok: false as const, message: "为避免 API Key 泄露和内网探测，测试连接只允许 HTTPS Endpoint。" };
  }

  if (url.username || url.password) {
    return { ok: false as const, message: "Endpoint 不允许包含用户名或密码，请把鉴权信息放到 API Key 字段。" };
  }

  const hostname = url.hostname.toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    return { ok: false as const, message: "测试连接不能访问 localhost 或本地域名。" };
  }

  const literalIp = net.isIP(hostname);
  if (literalIp === 4 && isBenchmarkIpv4(hostname)) {
    return { ok: false as const, message: "测试连接不能直接访问保留地址。" };
  }

  const addresses = literalIp ? [{ address: hostname }] : await dns.lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some((item) => isBlockedAddress(item.address))) {
    return { ok: false as const, message: "测试连接不能访问内网、回环、链路本地或保留地址。" };
  }

  url.search = "";
  url.hash = "";
  return { ok: true as const, url };
}

function appendPath(baseUrl: URL, suffix: string) {
  const url = new URL(baseUrl.toString());
  url.pathname = `${url.pathname.replace(/\/+$/, "")}${suffix}`;
  return url.toString();
}

function modelUrls(endpoint: URL) {
  const normalizedPath = endpoint.pathname.replace(/\/+$/, "");
  const urls = [appendPath(endpoint, "/models")];
  if (!/\/(v1|v1beta|api\/v3)$/i.test(normalizedPath)) {
    urls.push(appendPath(endpoint, "/v1/models"));
  }
  return Array.from(new Set(urls));
}

async function tryFetch(url: string, model: TestModel, credential: TestCredential) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${credential.apiKey}`,
      "Content-Type": "application/json"
    };
    if (model.provider?.includes("Claude")) {
      headers["anthropic-version"] = "2023-06-01";
      headers["x-api-key"] = credential.apiKey ?? "";
    }
    if (credential.secretId) {
      headers["X-Secret-Id"] = credential.secretId;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store"
    });

    return {
      ok: response.ok,
      status: response.status,
      url
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  let body: { model?: TestModel };
  try {
    body = (await request.json()) as { model?: TestModel };
  } catch {
    return NextResponse.json({ ok: false, message: "请求 JSON 格式不正确。" }, { status: 400 });
  }

  const model = body.model;
  const credential = model?.credential ?? {};
  const endpoint = credential.endpoint || model?.endpoint;

  if (!model) {
    return NextResponse.json({ ok: false, message: "没有收到模型配置。" }, { status: 400 });
  }

  if (!credential.apiKey?.trim()) {
    return NextResponse.json({ ok: false, message: "请先填写 API Key / Token。" }, { status: 400 });
  }

  if (!endpoint?.trim()) {
    return NextResponse.json({ ok: false, message: "请先填写 Base URL / Endpoint。" }, { status: 400 });
  }

  try {
    const publicEndpoint = await assertPublicEndpoint(endpoint);
    if (!publicEndpoint.ok) {
      return NextResponse.json({ ok: false, message: publicEndpoint.message }, { status: 400 });
    }

    const attempts = [];
    for (const url of modelUrls(publicEndpoint.url)) {
      const result = await tryFetch(url, model, credential);
      attempts.push(result);
      if (result.ok) {
        return NextResponse.json({
          ok: true,
          message: `${model.provider ?? model.name ?? "模型"} 连接成功。`,
          endpoint: result.url,
          status: result.status,
          modelId: credential.modelId || model.modelId
        });
      }
    }

    const last = attempts.at(-1);
    return NextResponse.json(
      {
        ok: false,
        message: `${model.provider ?? model.name ?? "模型"} 暂未连通，请检查 Key、Endpoint、模型 ID 或厂商是否支持 /models 测试接口。`,
        endpoint: last?.url,
        status: last?.status,
        modelId: credential.modelId || model.modelId
      },
      { status: 502 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error && error.name === "AbortError" ? "连接超时，请检查 Endpoint 或网络。" : "连接测试失败，请检查配置。",
        detail: error instanceof Error ? error.message : "unknown error",
        modelId: credential.modelId || model.modelId
      },
      { status: 502 }
    );
  }
}
