// Konfiguration: Nøgleord og subreddits
const KEYWORDS = [
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

// 1. Hent fra Reddit via offentligt JSON-feed
async function fetchRedditPosts() {
  const subString = SUBREDDITS.join("+");
  const url = `https://www.reddit.com/r/${subString}/new.json?limit=25`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "UseNeedLens-Bot/1.0 (contact: support@useneedlens.com)"
      }
    });

    if (!response.ok) {
      console.error(`[Reddit Error] Status: ${response.status}`);
      return [];
    }

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

// 2. Hent fra Hacker News via åbent API
async function fetchHackerNewsPosts() {
  try {
    const res = await fetch("https://hacker-news.firebaseio.com/v0/newstories.json");
    const storyIds = await res.json();
    const top20Ids = storyIds.slice(0, 20);

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

// 3. Match mod søgeord
function matchesKeywords(text) {
  const normalized = text.toLowerCase();
  return KEYWORDS.filter(keyword => normalized.includes(keyword.toLowerCase()));
}

// 4. Hovedscanner
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
      console.log("\n🎯 MATCH FUNDET!");
      console.log(`Kilde:    ${post.source}`);
      console.log(`Titel:    ${post.title}`);
      console.log(`Keywords: ${matchedKeywords.join(", ")}`);
      console.log(`Link:     ${post.url}`);
    }
  }

  if (matchesCount === 0) {
    console.log(`Scannet ${allPosts.length} nye opslag. Ingen nye matches lige nu.`);
  }
}

// Kør første gang
runScan();

// Kør derefter hvert 2. minut
setInterval(runScan, 2 * 60 * 1000);
