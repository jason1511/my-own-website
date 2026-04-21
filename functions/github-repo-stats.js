export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const reposParam = url.searchParams.get("repos") || "";

    const repos = reposParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);

    if (repos.length === 0) {
      return json({ error: "Missing repos query parameter" }, 400);
    }

    const token = context.env.GITHUB_TOKEN;
    const results = {};

    for (const fullName of repos) {
      const apiUrl = `https://api.github.com/repos/${fullName}`;

      const res = await fetch(apiUrl, {
        headers: {
          Accept: "application/vnd.github+json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

    return json(results, 200, {
      "Cache-Control": "public, max-age=900",
    });
  } catch (error) {
    console.error(error);
    return json({ error: "Server error" }, 500);
  }
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}