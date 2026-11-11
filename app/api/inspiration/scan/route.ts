import { defaultInspirationRules, fallbackInspirationSignals } from "@/lib/inspirationRules";
import type { InspirationRule, InspirationScanPayload, InspirationSignal } from "@/lib/types";
import { NextResponse } from "next/server";

const googleTrendGeos = ["US", "GB", "IN", "JP", "KR", "SG", "CA", "AU"];
const googleTrendGeoLabels: Record<string, string> = {
  US: "美国",
  GB: "英国",
  IN: "印度",
  JP: "日本",
  KR: "韩国",
  SG: "新加坡",
  CA: "加拿大",
  AU: "澳大利亚"
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)));
}

function stripXml(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTag(item: string, tag: string) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripXml(match[1]) : "";
}

function getRawTag(item: string, tag: string) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1] : "";
}

function scoreRule(title: string, rule: InspirationRule) {
  const lower = title.toLowerCase();
  return rule.keywords.reduce((score, keyword) => {
    const key = keyword.toLowerCase().trim();
    if (!key) return score;
    if (/^[a-z0-9]+$/i.test(key)) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return score + (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(lower) ? 1 : 0);
    }
    return score + (lower.includes(key) ? 1 : 0);
  }, 0);
}

function matchRule(title: string, rules: InspirationRule[]) {
  const globalRule = rules.find((rule) => rule.id === "global-trending");
  const ranked = rules
    .filter((rule) => rule.id !== "global-trending")
    .map((rule) => ({ rule, score: scoreRule(title, rule) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.score ? ranked[0].rule : globalRule ?? rules[0];
}

function cleanNewsTitle(title: string, source: string) {
  const cleaned = stripXml(title)
    .replace(/\s+-\s+[^-]{2,60}$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!source) return cleaned;
  return cleaned.replace(new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), "").trim();
}

function buildHotspotBody(title: string, source: string, rule: InspirationRule) {
  const primaryChannel = rule.channels[0] ?? "内容";
  return `热点内容：${source} 正在报道这个变化。它属于「${rule.scope}」里的新信号，可以做成${primaryChannel}，重点补清楚发生了什么、谁会受影响、为什么现在值得看。`;
}

function fallbackNewsUrl(title: string, source: string) {
  const query = encodeURIComponent([title, source].filter(Boolean).join(" "));
  return `https://news.google.com/search?q=${query}&hl=zh-CN&gl=US&ceid=US:zh-Hans`;
}

function usableUrl(value: string, title: string, source: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : fallbackNewsUrl(title, source);
  } catch {
    return fallbackNewsUrl(title, source);
  }
}

function uniqueSignals(signals: InspirationSignal[]) {
  const seen = new Set<string>();
  const result: InspirationSignal[] = [];
  for (const signal of signals) {
    const key = signal.title.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(signal);
  }
  return result;
}

function trafficValue(value: string) {
  const normalized = value.toLowerCase().replace(/,/g, "").replace(/\+/g, "").trim();
  const match = normalized.match(/(\d+(?:\.\d+)?)(k|m)?/);
  if (!match) return 0;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return 0;
  if (match[2] === "m") return base * 1_000_000;
  if (match[2] === "k") return base * 1_000;
  return base;
}

function signalFromRssItem(item: string, rule: InspirationRule, index: number, scannedAt: string): InspirationSignal {
  const source = getTag(item, "source") || "Google News";
  const title = cleanNewsTitle(getTag(item, "title"), source) || "未命名热点";
  const url = usableUrl(getTag(item, "link"), title, source);
  const body = buildHotspotBody(title, source, rule);
  return {
    id: `live-${rule.id}-${index}-${Date.now()}`,
    title,
    state: index < 2 ? "高相关" : "可跟进",
    body,
    metrics: [rule.channels[0] ?? "短视频", source.slice(0, 18), "全球最新", "需核实"],
    source,
    region: "全球",
    url,
    ruleId: rule.id,
    ruleName: rule.label,
    whyRelated: `为什么相关：这条热点属于「${rule.label}」范围，${rule.keepRule}`,
    angles: [
      `围绕「${title}」解释它和 ${rule.scope} 有什么关系`,
      "做一个真实案例或对比解释",
      "拆成一个短视频开头和公众号分析"
    ],
    formats: rule.channels,
    risks: [rule.rejectRule, "发布前需要打开原始来源核实时间、适用范围和是否全面开放。"],
    relatedMaterials: ["官方公告", "产品截图", "历史同类选题", "素材库案例"],
    scannedAt
  };
}

async function fetchRuleSignals(rule: InspirationRule, scannedAt: string) {
  const query = encodeURIComponent(rule.keywords.slice(0, 4).join(" OR "));
  const url = `https://news.google.com/rss/search?q=${query}&hl=zh-CN&gl=US&ceid=US:zh-Hans`;
  const response = await fetch(url, {
    headers: { "User-Agent": "AI-Content-Workbench/0.1" },
    next: { revalidate: 600 }
  });
  if (!response.ok) return [];
  const xml = await response.text();
  return xml
    .split("<item>")
    .slice(1)
    .map((item, index) => signalFromRssItem(item, rule, index, scannedAt))
    .filter((signal) => signal.title && signal.title !== "未命名热点")
    .slice(0, 5);
}

function signalFromTrendItem(item: string, geo: string, rules: InspirationRule[], index: number, scannedAt: string): InspirationSignal {
  const title = cleanNewsTitle(getTag(item, "title"), "") || "未命名热搜";
  const traffic = getTag(item, "ht:approx_traffic") || "热度上升";
  const newsItem = getRawTag(item, "ht:news_item");
  const newsTitle = getTag(newsItem || item, "ht:news_item_title");
  const newsUrl = getTag(newsItem || item, "ht:news_item_url");
  const source = getTag(newsItem || item, "ht:picture_source") || getTag(newsItem || item, "ht:news_item_source") || "Google Trends";
  const rule = matchRule(`${title} ${newsTitle}`, rules);
  const region = googleTrendGeoLabels[geo] ?? geo;
  const url = usableUrl(newsUrl || getTag(item, "link"), title, source);
  return {
    id: `trend-${geo}-${index}-${Date.now()}`,
    title,
    state: index < 3 ? "热搜中" : "可跟进",
    body: `Google Trends ${region}热搜：${title}。搜索热度约 ${traffic}${newsTitle ? `，关联报道：${newsTitle}` : ""}。`,
    metrics: ["Google热搜", region, traffic, "需核实"],
    source: source === "Google Trends" ? `Google Trends · ${region}` : source,
    region,
    url,
    ruleId: rule.id,
    ruleName: rule.label,
    whyRelated: `为什么相关：这条热搜命中「${rule.label}」，可以判断它是否和账号内容、业务或用户情绪有关。`,
    angles: [
      `这条热搜「${title}」为什么突然被搜？`,
      "它和我的账号定位、产品或受众有什么关系？",
      "能不能做成一个反常识观点、热点解释或案例拆解？"
    ],
    formats: rule.channels,
    risks: [rule.rejectRule, "Google Trends 只代表搜索热度，不等于事实结论；发布前要核实来源和时间。"],
    relatedMaterials: ["Google Trends 热搜", "关联报道", "素材库案例", "历史同类选题"],
    scannedAt
  };
}

async function fetchTrendSignalsForGeo(geo: string, rules: InspirationRule[], scannedAt: string) {
  const url = `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AI-Content-Workbench/0.1",
      Accept: "application/rss+xml,text/xml,*/*"
    },
    next: { revalidate: 600 }
  });
  if (!response.ok) return [];
  const xml = await response.text();
  return xml
    .split("<item>")
    .slice(1)
    .map((item, index) => signalFromTrendItem(item, geo, rules, index, scannedAt))
    .filter((signal) => signal.title && signal.title !== "未命名热搜")
    .slice(0, 8);
}

async function fetchGoogleTrendSignals(rules: InspirationRule[], scannedAt: string) {
  const settled = await Promise.allSettled(googleTrendGeos.map((geo) => fetchTrendSignalsForGeo(geo, rules, scannedAt)));
  return uniqueSignals(
    settled
      .flatMap((item) => item.status === "fulfilled" ? item.value : [])
      .sort((a, b) => {
        const trafficGap = trafficValue(b.metrics[2] ?? "") - trafficValue(a.metrics[2] ?? "");
        if (trafficGap !== 0) return trafficGap;
        const aHot = a.state === "热搜中" ? 1 : 0;
        const bHot = b.state === "热搜中" ? 1 : 0;
        return bHot - aHot;
      })
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as InspirationScanPayload;
  const rules = Array.isArray(body.rules) && body.rules.length > 0 ? body.rules : defaultInspirationRules;
  const scannedAt = new Date().toLocaleString("zh-CN", { hour12: false });
  const limit = Math.max(10, Math.min(body.limit ?? 20, 30));

  try {
    const [trendSignals, newsSignals] = await Promise.all([
      fetchGoogleTrendSignals(rules, scannedAt),
      Promise.all(rules.map((rule) => fetchRuleSignals(rule, scannedAt))).then((items) => items.flat())
    ]);
    const liveSignals = uniqueSignals([...trendSignals, ...newsSignals])
      .map((signal) => {
        const rule = matchRule(`${signal.title} ${signal.body}`, rules);
        return rule.id === signal.ruleId ? signal : { ...signal, ruleId: rule.id, ruleName: rule.label };
      })
      .slice(0, limit);

    if (liveSignals.length > 0) {
      return NextResponse.json({
        scannedAt,
        sourceMode: trendSignals.length > 0 ? "google-trends-rss" : "live-rss",
        summary: `已按 ${rules.length} 套规则扫描 Google Trends 热搜和 Google News，返回 ${liveSignals.length} 条可转成内容的全球热点。`,
        rules,
        signals: liveSignals
      });
    }
  } catch {
    // Public RSS can be rate limited or unreachable. Fall through to deterministic MVP data.
  }

  return NextResponse.json({
    scannedAt,
    sourceMode: "fallback",
    summary: `实时热点源暂不可用，已按 ${rules.length} 套规则返回内置灵感卡片，后台可继续配置真实热点 API。`,
    rules,
    signals: fallbackInspirationSignals
      .map((signal) => ({ ...signal, url: signal.url || fallbackNewsUrl(signal.title, signal.source), scannedAt }))
      .slice(0, limit)
  });
}
