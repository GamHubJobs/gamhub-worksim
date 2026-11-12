/**
 * The IT Knowledge Base: the service desk's articles (part of the app, so
 * available offline), and the task's own articles. Search, filter by
 * category or bookmarks, open an article, bookmark it.
 */
import { useState } from 'react'
import {
  getArticle,
  KB_CATEGORIES,
  searchKnowledge,
  type KbArticle,
  type KbCategory,
} from '../../content/knowledge/it'
import { Icon } from '../../ui/Icon'

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold text-slate-900">{title}</h3>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>
    </section>
  )
}

function ArticleView({
  article,
  bookmarked,
  onToggleBookmark,
  onBack,
}: {
  article: KbArticle
  bookmarked: boolean
  onToggleBookmark?: () => void
  onBack: () => void
}) {
  return (
    <article className="space-y-4" data-testid="kb-article">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-blue-800 hover:underline"
      >
        <Icon name="back" className="h-4 w-4" /> All articles
      </button>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-teal-700 uppercase">
            {article.category}
          </p>
          <h2 className="text-xl font-semibold text-slate-900">{article.title}</h2>
          <p className="mt-1 text-slate-700">{article.summary}</p>
        </div>
        {onToggleBookmark && (
          <button
            type="button"
            onClick={onToggleBookmark}
            aria-pressed={bookmarked}
            className={`flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
              bookmarked
                ? 'border-amber-300 bg-amber-50 text-amber-900'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon name="bookmark" className="h-4 w-4" />
            {bookmarked ? 'Bookmarked' : 'Bookmark'}
          </button>
        )}
      </header>
      <Section title="Symptoms" items={article.symptoms} />
      <Section title="Diagnose" items={article.diagnose} />
      <Section title="Resolve" items={article.resolve} />
      {article.escalate && (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <h3 className="font-semibold">When to escalate</h3>
          <p>{article.escalate}</p>
        </section>
      )}
      {article.concept && (
        <section className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
          <h3 className="font-semibold">Why it works this way</h3>
          <p>{article.concept}</p>
        </section>
      )}
    </article>
  )
}

export function KnowledgeBasePanel({
  taskArticles,
  bookmarks,
  onToggleBookmark,
  openArticle,
  onOpenArticle,
}: {
  /** The task's own articles (read-only guides that come with the queue). */
  taskArticles: Array<{ title: string; body: string }>
  bookmarks: string[]
  onToggleBookmark?: (id: string) => void
  /** The article to show (controlled by the shell, so hints can open one). */
  openArticle: string | null
  onOpenArticle: (id: string | null) => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<KbCategory | 'all' | 'bookmarks'>('all')
  const [taskOpen, setTaskOpen] = useState<number | null>(null)
  const article = openArticle ? getArticle(openArticle) : undefined

  const results = searchKnowledge(
    query,
    category === 'bookmarks' ? 'all' : category,
  ).filter((a) => category !== 'bookmarks' || bookmarks.includes(a.id))

  return (
    <div
      className="@container h-full overflow-y-auto bg-slate-50"
      data-testid="knowledge-base"
    >
      <div className="mx-auto max-w-5xl p-6">
        {article ? (
          <ArticleView
            article={article}
            bookmarked={bookmarks.includes(article.id)}
            onToggleBookmark={
              onToggleBookmark ? () => onToggleBookmark(article.id) : undefined
            }
            onBack={() => onOpenArticle(null)}
          />
        ) : (
          <div className="space-y-5">
            <header>
              <h2 className="text-xl font-semibold text-slate-900">Knowledge Base</h2>
              <p className="text-sm text-slate-600">
                The service desk’s procedures: diagnose, resolve, and when to escalate.
              </p>
            </header>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-60 flex-1">
                <span className="sr-only">Search the Knowledge Base</span>
                <Icon
                  name="search"
                  className="pointer-events-none absolute top-2 left-2.5 h-4 w-4 text-slate-400"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search: locked, printer, slow, phishing…"
                  aria-label="Search the Knowledge Base"
                  className="w-full rounded-md border border-slate-300 bg-white py-1.5 pr-3 pl-8 text-sm"
                />
              </label>
              <select
                aria-label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              >
                <option value="all">All categories</option>
                <option value="bookmarks">Bookmarked ({bookmarks.length})</option>
                {KB_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            {taskArticles.length > 0 && !query && category === 'all' && (
              <section>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  For this task
                </h3>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                  {taskArticles.map((a, i) => (
                    <li key={a.title}>
                      <button
                        type="button"
                        onClick={() => setTaskOpen(taskOpen === i ? null : i)}
                        aria-expanded={taskOpen === i}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-900 hover:bg-slate-50"
                      >
                        <Icon name="guide" className="h-4 w-4 text-teal-700" />
                        {a.title}
                      </button>
                      {taskOpen === i && (
                        <p className="px-4 pb-3 text-sm whitespace-pre-line text-slate-700">
                          {a.body}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                {query ? `Results (${results.length})` : 'Articles'}
              </h3>
              {results.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                  {category === 'bookmarks'
                    ? 'No bookmarks yet: open an article and bookmark it.'
                    : 'Nothing matches. Try another word, such as the error message.'}
                </p>
              ) : (
                <ul
                  className="grid gap-2 @2xl:grid-cols-2 @5xl:grid-cols-3"
                  aria-label="Articles"
                >
                  {results.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => onOpenArticle(a.id)}
                        className="h-full w-full rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-teal-400"
                        data-testid="kb-result"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold tracking-wide text-teal-700 uppercase">
                            {a.category}
                          </span>
                          {bookmarks.includes(a.id) && (
                            <Icon name="bookmark" className="h-4 w-4 text-amber-600" />
                          )}
                        </span>
                        <span className="mt-0.5 block font-medium text-slate-900">
                          {a.title}
                        </span>
                        <span className="mt-0.5 block text-sm text-slate-600">
                          {a.summary}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
