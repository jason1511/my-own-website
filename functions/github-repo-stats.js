const DEFAULT_ALLOWED_OWNER = "jason1511";
const MAX_REPOSITORIES = 10;
const SUCCESS_CACHE_SECONDS = 900;
const ERROR_CACHE_SECONDS = 60;

export async function onRequestGet(context) {
  try {
    const requestUrl = new URL(context.request.url);
    const allowedOwner = String(
      context.env.GITHUB_ALLOWED_OWNER || DEFAULT_ALLOWED_OWNER
    ).toLowerCase();

    const parsedRepos = parseRepositories(
      requestUrl.searchParams.get("repos") || ""
    );

    if (parsedRepos.length === 0) {
      return json({ error: "Missing repos query parameter" }, 400);
    }

    const invalidRepo = parsedRepos.find(
      (repo) => repo.owner.toLowerCase() !== allowedOwner
    );

    if (invalidRepo) {
      return json(
        { error: `Repository owner must be ${allowedOwner}` },
        400
      );
    }

    const repos = parsedRepos
      .slice(0, MAX_REPOSITORIES)
      .map((repo) => repo.fullName)
      .sort((a, b) => a.localeCompare(b));

    const cache = globalThis.caches?.default;
    const cacheKey = createCacheKey(requestUrl, repos);

    if (cache) {
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) return cachedResponse;
    }

    const token = context.env.GITHUB_TOKEN;
    const results = {};
    let hasUpstreamError = false;

    // Keep requests sequential to reduce the chance of GitHub secondary limits.
    for (const fullName of repos) {
      const [owner, repository] = fullName.split("/");
      const apiUrl = `https://api.github.com/repos/${encodeURIComponent(
        owner
      )}/${encodeURIComponent(repository)}`;

      const response = await fetch(apiUrl, {
        headers: {
          Accept: "application/vnd.github+json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "User-Agent": "jason-leonard-portfolio",
        },
      });

      if (!response.ok) {
        hasUpstreamError = true;
        results[fullName] = {
          error: githubErrorMessage(response.status),
        };
        continue;
      }

      const data = await response.json();

      results[fullName] = {
        full_name: data.full_name,
        html_url: data.html_url,
        stargazers_count: toNumber(data.stargazers_count),
        forks_count: toNumber(data.forks_count),
        open_issues_count: toNumber(data.open_issues_count),
        language: data.language || null,
        updated_at: data.updated_at || null,
      };
    }

    const cacheSeconds = hasUpstreamError
      ? ERROR_CACHE_SECONDS
      : SUCCESS_CACHE_SECONDS;
    const response = json(results, 200, {
      "Cache-Control": `public, max-age=${cacheSeconds}`,
    });

    if (cache) {
      const cacheWrite = cache.put(cacheKey, response.clone());
      if (typeof context.waitUntil === "function") {
        context.waitUntil(cacheWrite);
      } else {
        await cacheWrite;
      }
    }

    return response;
  } catch (error) {
    console.error(error);
    return json({ error: "Server error" }, 500);
  }
}

function parseRepositories(value) {
  const seen = new Set();
  const repositories = [];

  for (const rawValue of String(value).split(",")) {
    const fullName = rawValue.trim();
    if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(fullName)) continue;

    const key = fullName.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    const [owner, repository] = fullName.split("/");
    repositories.push({ owner, repository, fullName });
  }

  return repositories;
}

function createCacheKey(requestUrl, repos) {
  const cacheUrl = new URL(requestUrl.origin + requestUrl.pathname);
  cacheUrl.searchParams.set("repos", repos.join(","));
  return new Request(cacheUrl.toString(), { method: "GET" });
}

function githubErrorMessage(status) {
  if (status === 403 || status === 429) {
    return "GitHub statistics are temporarily rate limited";
  }

  if (status === 404) {
    return "GitHub repository not found";
  }

  return `GitHub API error: ${status}`;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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