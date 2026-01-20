// Fetch repo stats from GitHub API, cached to avoid rate limits.

export async function handler(event) {
  try {
    const reposParam = event.queryStringParameters?.repos || "";
    const repos = reposParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);

    if (repos.length === 0) {
      return json(400, { error: "Missing repos query parameter" });
    }

    // Optional: set GITHUB_TOKEN in Netlify env vars for higher rate limits
    const token = process.env.GITHUB_TOKEN;

    const results = {};
    for (const fullName of repos) {
      const url = `https://api.github.com/repos/${fullName}`;

      const res = await fetch(url, {
        headers: {
          "Accept": "application/vnd.github+json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          "User-Agent": "my-own-website",
        },
      });

      if (!res.ok) {
        results[fullName] = { error: `GitHub API error: ${res.status}` };
        continue;
      }

      const data = await res.json();

      results[fullName] = {
        full_name: data.full_name,
        html_url: data.html_url,
        stargazers_count: data.stargazers_count,
        forks_count: data.forks_count,
        open_issues_count: data.open_issues_count,
        language: data.language,
        updated_at: data.updated_at,
      };
    }

    // Cache 15 minutes
    return json(200, results, { "Cache-Control": "public, max-age=900" });
  } catch (e) {
    console.error(e);
    return json(500, { error: "Server error" });
  }
}

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
    body: JSON.stringify(body),
  };
}
