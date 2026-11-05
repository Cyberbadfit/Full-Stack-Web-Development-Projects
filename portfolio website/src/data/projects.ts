export type Project = {
  name: string
  description: string
  language: string
  url: string
  demo?: string
  category: 'Frontend' | 'Full Stack' | 'Programming'
}

export const fallbackProjects: Project[] = [
  { name: 'Nexus Hackathon 2026', description: 'Official website for a university-exclusive hackathon spanning AI/ML, data science, DevOps, computer vision, full-stack development, and an Ultimate Challenge track.', language: 'JavaScript', url: 'https://github.com/Cyberbadfit/Nexus-Hackathon-2026', demo: 'https://nexus-hackathon-2026-three.vercel.app', category: 'Frontend' },
  { name: 'Full Stack Web Development Projects', description: 'A collection of practical web applications focused on responsive interfaces, API integration, database management, and user-friendly functionality.', language: 'JavaScript', url: 'https://github.com/Cyberbadfit/Full-Stack-Web-Development-Projects', category: 'Full Stack' },
  { name: 'Responsive Frontend Web Development', description: 'Responsive web development work focused on adaptable interfaces and consistent experiences across mobile, tablet, and desktop screens.', language: 'CSS', url: 'https://github.com/Cyberbadfit/Responsive-frontend-web-development', category: 'Frontend' },
  { name: 'C Language Programs', description: 'Small, focused C programs for hands-on practice with variables, loops, functions, arrays, pointers, and problem-solving fundamentals.', language: 'C', url: 'https://github.com/Cyberbadfit/C-Language-Programs', category: 'Programming' },
]
