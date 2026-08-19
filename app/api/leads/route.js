import { NextResponse } from "next/server";

const KEYWORDS = [
  "webhook",
  "webhooks",
  "stripe webhook",
  "webhook failure",
  "webhook debugging",
  "svix",
  "hookdeck"
];

// 1. Stack Overflow API
async function fetchStackOverflow() {
  try {
    const url = "https://api.stackexchange.com/2.3/questions?pagesize=20&order=desc&sort=creation&tagged=webhooks&site=stackoverflow&filter=withbody";
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.items || []).map(q => ({
      id: `so_${q.question_id}`,
      title: q.title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&"),
      body: (q.body || "").replace(/<[^>]*>?/gm, " ").slice(0, 300),
      url: q.link,
      source: "Stack Overflow",
      author: q.owner?.display_name || "Anonymous",
      createdAt: q.creation_date * 1000,
      tags: q.tags || []
    }));
  } catch (err) {
    console.error("[SO Error]:", err.message);
    return [];
  }
}

// 2. Dev.to API
async function fetchDevTo() {
  try {
    const url = "https://dev.to/api/articles?tag=webhooks&per_page=15";
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();

    return (data || []).map(item => ({
      id: `dev_${item.id}`,
      title: item.title,
      body: item.description || "",
      url: item.url,
      source: "Dev.to",
      author: item.user?.username || "Dev Writer",
      createdAt: new Date(item.published_at).getTime(),
      tags: item.tag_list || []
    }));
  } catch (err) {
    console.error("[Dev.to Error]:", err.message);
    return [];
  }
}

// 3. Hacker News API
async function fetchHackerNews() {
  try {
    const res = await fetch("https://hacker-news.firebaseio.com/v0/newstories.json", { next: { revalidate: 300 } });
    const ids = (await res.json() || []).slice(0, 25);

    const posts = await Promise.all(
      ids.map(async id => {
        const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        const item = await itemRes.json();
        if (!item || !item.title) return null;
        return {
          id: `hn_${item.id}`,
          title: item.title,
          body: (item.text || "").replace(/<[^>]*>?/gm, " ").slice(0, 300),
          url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
          source: "Hacker News",
          author: item.by || "HN User",
          createdAt: item.time * 1000,
          tags: ["tech", "hn"]
        };
      })
    );

    return posts.filter(Boolean);
  } catch (err) {
    console.error("[HN Error]:", err.message);
    return [];
  }
}

export async function GET() {
  const [so, dev, hn] = await Promise.all([
    fetchStackOverflow(),
    fetchDevTo(),
    fetchHackerNews()
  ]);

  const rawLeads = [...so, ...dev, ...hn];

  const processed = rawLeads
    .map(lead => {
      const text = `${lead.title} ${lead.body}`.toLowerCase();
      const matched = KEYWORDS.filter(k => text.includes(k.toLowerCase()));

      let intent = "Low";
      if (text.includes("error") || text.includes("failed") || text.includes("debug") || text.includes("stripe")) {
        intent = "High";
      } else if (matched.length > 0) {
        intent = "Medium";
      }

      return {
        ...lead,
        matchedKeywords: matched.length > 0 ? matched : ["webhook"],
        intent
      };
    })
    .filter(lead => lead.matchedKeywords.length > 0)
    .sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ leads: processed, count: processed.length });
}
