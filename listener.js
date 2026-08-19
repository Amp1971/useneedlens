const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

const KEYWORDS = [
  "the", // Midlertidigt testord
  "webhook failed",
  "webhook error",
  "stripe webhook",
  "webhook debugging",
  "missed webhook",
  "hookdeck",
  "svix"
];

const SUBREDDITS = ["webdev", "nextjs", "SaaS", "stripe", "node"];
const SEEN_POSTS = new Set();

// Send notifikation til Slack
async function sendToSlack(post, matchedKeywords) {
  if (!SLACK_WEBHOOK_URL) {
    console.log("[Slack] Ingen webhook konfigureret, skipper notifikation.");
    return;
  }

  const payload = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🎯 Nyt potentielt lead fundet!",
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Kilde:*\n${post.source}`
          },
          {
            type: "mrkdwn",
            text: `*Søgeord:*\n\`${matchedKeywords.join(", ")}\``
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*<${post.url}|${post.title}>*\n\n${post.body ? post.body.slice(0, 250) + "..." : "_Ingen brødtekst_"}`
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Åbn tråd ↗️"
            },
            url: post.url,
            style: "primary"
          }
        ]
      },
      {
        type: "divider"
      }
    ]
  };

  try {
    const res = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.error(`[Slack Error] Status: ${res.status}`);
    } else {
      console.log(`[Slack] Notifikation sendt for: ${post.title}`);
    }
  } catch (err) {
    console.error("[Slack Fetch Error]:", err.message);
  }
}

// 1. Pålidelig Reddit scanner via åbent RSS feed
async function fetchRedditPosts() {
  // Søger på tværs af de valgte subreddits via Googles realtidsfeed
  const query = encodeURIComponent(`site:reddit.com/r/ (${SUBREDDITS.join(" OR ")})`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    if (!response.ok) {
      console.log(`[Reddit Feed Status]: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const items = xml.split("<item>");
    items.shift(); // Fjern header

    return items.map(item => {
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
      const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);
      const guidMatch = item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);

      const rawTitle = titleMatch ? titleMatch[1] : "";
      const rawDesc = descMatch ? descMatch[1] : "";
      
      // Rens HTML tags og html entities
      const title = rawTitle.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      const body = rawDesc.replace(/<[^>]*>?/gm, " ").replace(/&amp;/g, "&").slice(0, 400);

      return {
        id: guidMatch ? guidMatch[1] : `reddit_${Math.random()}`,
        title: title,
        body: body,
        url: linkMatch ? linkMatch[1] : "https://reddit.com",
        source: "Reddit (Live Feed)",
        createdUtc: Date.now()
      };
    });
  } catch (error) {
    console.error("[Reddit Fetch Failed]:", error.message);
    return [];
  }
}
// 2. Hent fra Hacker News
async function fetchHackerNewsPosts() {
  try {
    const res = await fetch("https://hacker-news.firebaseio.com/v0/newstories.json");
    const storyIds = await res.json();
    const top20Ids = (storyIds || []).slice(0, 20);

    const posts = await Promise.all(
      top20Ids.map(async id => {
        const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        const item = await itemRes.json();
        if (!item || !item.title) return null;

        return {
          id: `hn_${item.id}`,
          title: item.title,
          body: item.text || "",
          url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
          source: "Hacker News",
          createdUtc: item.time * 1000
        };
      })
    );

    return posts.filter(Boolean);
  } catch (error) {
    console.error("[HN Fetch Failed]:", error.message);
    return [];
  }
}

function matchesKeywords(text) {
  const normalized = text.toLowerCase();
  return KEYWORDS.filter(keyword => normalized.includes(keyword.toLowerCase()));
}

async function runScan() {
  console.log(`\n🔍 [${new Date().toLocaleTimeString()}] Scanner Reddit & Hacker News...`);

  const [redditPosts, hnPosts] = await Promise.all([
    fetchRedditPosts(),
    fetchHackerNewsPosts()
  ]);

  const allPosts = [...redditPosts, ...hnPosts];
  let matchesCount = 0;

  for (const post of allPosts) {
    if (SEEN_POSTS.has(post.id)) continue;
    SEEN_POSTS.add(post.id);

    const contentToSearch = `${post.title} ${post.body}`;
    const matchedKeywords = matchesKeywords(contentToSearch);

    if (matchedKeywords.length > 0) {
      matchesCount++;
      console.log(`\n🎯 Match fundet: ${post.title}`);
      await sendToSlack(post, matchedKeywords);
    }
  }

  if (matchesCount === 0) {
    console.log(`Scannet ${allPosts.length} opslag. Ingen nye matches.`);
  }
}

await runScan();
process.exit(0);
