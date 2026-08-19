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

// 1. Hent fra Reddit
async function fetchRedditPosts() {
  const subString = SUBREDDITS.join("+");
  const url = `https://www.reddit.com/r/${subString}/new.json?limit=25`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "UseNeedLens-Bot/1.0 (contact: support@useneedlens.com)"
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    return (data.data?.children || []).map(child => ({
      id: `reddit_${child.data.id}`,
      title: child.data.title,
      body: child.data.selftext || "",
      url: `https://reddit.com${child.data.permalink}`,
      source: `r/${child.data.subreddit}`,
      createdUtc: child.data.created_utc * 1000
    }));
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
