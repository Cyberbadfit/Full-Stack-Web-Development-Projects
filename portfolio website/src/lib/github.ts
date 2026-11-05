import { fallbackProjects, type Project } from '../data/projects'

type ApiRepo = { name: string; description: string | null; language: string | null; html_url: string; homepage: string | null; fork: boolean }
export type GithubProfile = { public_repos: number; followers: number }

const endpoint = 'https://api.github.com/users/Cyberbadfit'
const classify = (repo: ApiRepo): Project['category'] => {
  if (repo.name.includes('C-Language')) return 'Programming'
  if (repo.name.includes('Full-Stack')) return 'Full Stack'
  return 'Frontend'
}

export async function getGithubData(signal?: AbortSignal): Promise<{ profile?: GithubProfile; projects: Project[]; live: boolean }> {
  try {
    const [profileResponse, repoResponse] = await Promise.all([
      fetch(endpoint, { signal }), fetch(`${endpoint}/repos?sort=updated&per_page=100`, { signal }),
    ])
    if (!repoResponse.ok) throw new Error('GitHub repositories are unavailable')
    const repos = (await repoResponse.json() as ApiRepo[]).filter((repo) => !repo.fork && repo.name !== 'Cyberbadfit')
    const projects = repos.map((repo) => ({
      name: repo.name.replaceAll('-', ' '), description: repo.description || 'Public project repository on GitHub.', language: repo.language || 'Repository', url: repo.html_url,
      demo: repo.homepage && /^https?:\/\//.test(repo.homepage) ? repo.homepage : undefined, category: classify(repo),
    }))
    return { profile: profileResponse.ok ? await profileResponse.json() as GithubProfile : undefined, projects: projects.length ? projects : fallbackProjects, live: true }
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error
    return { projects: fallbackProjects, live: false }
  }
}
