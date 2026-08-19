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

// 1. Stack Overflow API (Tags: webhooks, stripe-api)
async function fetchStackOverflow() {
  try {
    const url = "https://api.stackexchange.com/2.3/questions?pagesize=25&order=desc&sort=creation&tagged=webhooks&site=stackoverflow&filter=withbody";
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.items || []).map(q => ({
      id: `so_${q.question_id}`,
      title: q.title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&"),
      body: (q.body || "").replace(/<[^>]*>?/gm, " ").slice(0, 350),
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

// 2. Dev.to API (Artikler og diskussioner om webhooks)
async function fetchDevTo() {
  try {
    const url = "https://dev.to/api/articles?tag=webhooks&per_page=20";
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

// 3. Hacker News Algolia Search API (Målrettet søgning på webhook-relaterede emner)
async function fetchHackerNews() {
  try {
    const query = encodeURIComponent("webhook OR stripe webhook OR svix OR hookdeck");
    const url = `https://hn.algolia.com/api/v1/search_by_date?query=${query}&tags=(story,comment)&hitsPerPage=25`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.hits || []).map(hit => {
      const title = hit.story_title || hit.title || (hit.comment_text ? hit.comment_text.slice(0, 80) + "..." : "Hacker News Diskussion");
      const body = (hit.comment_text || hit.story_text || "").replace(/<[^>]*>?/gm, " ").slice(0, 350);
      const postUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;

      return {
        id: `hn_${hit.objectID}`,
        title: title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&"),
        body: body,
        url: postUrl,
        source: "Hacker News",
        author: hit.author || "HN User",
        createdAt: new Date(hit.created_at).getTime(),
        tags: ["hackernews", "webhook"]
      };
    });
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
      // Evaluer reel købsintention / pain points
      if (
        text.includes("error") || 
        text.includes("failed") || 
        text.includes("retry") || 
        text.includes("debug") || 
        text.includes("stripe") || 
        text.includes("monitor") ||
        text.includes("lost")
      ) {
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
    // Sikrer at alle viste resultater rent faktisk er webhook-relevante
    .filter(lead => {
      const fullText = `${lead.title} ${lead.body}`.toLowerCase();
      return KEYWORDS.some(k => fullText.includes(k.toLowerCase()));
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ leads: processed, count: processed.length });
}
