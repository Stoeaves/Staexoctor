export function getCdnUrl(owner, repo, branch, path) {
  return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`;
}
