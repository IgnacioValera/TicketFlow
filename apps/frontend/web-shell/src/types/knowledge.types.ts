export interface KnowledgeArticle {
  id: string
  title: string
  content: string
  tags: string
  topic: string
  category: { id: string; name: string } | null
  author?: { id: string; fullName: string } | null
  createdAt?: string
  updatedAt?: string
}

export function parseKnowledgeTags(tags: string) {
  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function knowledgeExcerpt(content: string, max = 160) {
  const compact = content.replace(/\s+/g, ' ').trim()
  if (compact.length <= max) return compact
  return `${compact.slice(0, max).trim()}…`
}

export function knowledgeTopic(article: Pick<KnowledgeArticle, 'topic' | 'category'>) {
  return article.category?.name || article.topic || 'General'
}
