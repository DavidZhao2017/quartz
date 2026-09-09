import { FullSlug, isFolderPath, resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { Date, getDate } from "./Date"
import { QuartzComponent, QuartzComponentProps } from "./types"

export type SortFn = (f1: QuartzPluginData, f2: QuartzPluginData) => number

export function byDateAndAlphabetical(): SortFn {
  return (f1, f2) => {
    if (f1.dates && f2.dates) {
      return getDate(f2)!.getTime() - getDate(f1)!.getTime()
    } else if (f1.dates && !f2.dates) {
      return -1
    } else if (!f1.dates && f2.dates) {
      return 1
    }
    const f1Title = f1.frontmatter?.title.toLowerCase() ?? ""
    const f2Title = f2.frontmatter?.title.toLowerCase() ?? ""
    return f1Title.localeCompare(f2Title)
  }
}

export function byDateAndAlphabeticalFolderFirst(): SortFn {
  return (f1, f2) => {
    const f1IsFolder = isFolderPath(f1.slug ?? "")
    const f2IsFolder = isFolderPath(f2.slug ?? "")
    if (f1IsFolder && !f2IsFolder) return -1
    if (!f1IsFolder && f2IsFolder) return 1

    if (f1.dates && f2.dates) {
      return getDate(f2)!.getTime() - getDate(f1)!.getTime()
    } else if (f1.dates && !f2.dates) {
      return -1
    } else if (!f1.dates && f2.dates) {
      return 1
    }
    const f1Title = f1.frontmatter?.title.toLowerCase() ?? ""
    const f2Title = f2.frontmatter?.title.toLowerCase() ?? ""
    return f1Title.localeCompare(f2Title)
  }
}

type Props = {
  limit?: number
  sort?: SortFn
} & QuartzComponentProps

function getCoverUrl(page: QuartzPluginData): string | undefined {
  return (
    page.frontmatter?.cover ??
    page.frontmatter?.image ??
    page.frontmatter?.socialImage ??
    undefined
  )
}

function getExcerpt(page: QuartzPluginData): string | undefined {
  const fm = page.frontmatter
  if (fm?.description) return fm.description
  if (page.text) {
    return page.text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[#*`_>~]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120)
  }
  return undefined
}

function getReadingTime(page: QuartzPluginData): string | undefined {
  const text = page.text?.replace(/\s+/g, "") ?? ""
  if (!text) return undefined
  const minutes = Math.max(1, Math.ceil(text.length / 300))
  return `${minutes} 分钟`
}

export const PageList: QuartzComponent = ({ cfg, fileData, allFiles, limit, sort }: Props) => {
  const sorter = sort ?? byDateAndAlphabeticalFolderFirst()
  let list = allFiles.sort(sorter)
  if (limit) list = list.slice(0, limit)

  return (
    <ul class="section-ul">
      {list.map((page) => {
        const title = page.frontmatter?.title ?? page.slug ?? "(untitled)"
        const tags = page.frontmatter?.tags ?? []
        const cover = getCoverUrl(page)
        const excerpt = getExcerpt(page)
        const reading = getReadingTime(page)
        const date = page.dates ? getDate(page) : undefined

        return (
          <li class="section-li">
            <article class="section">
              <a
                class="section-cover"
                href={resolveRelative(fileData.slug!, page.slug!)}
                aria-label={title}
              >
                {cover ? (
                  <img class="section-cover__img" src={cover} alt="" loading="lazy" />
                ) : (
                  <span class="section-cover__placeholder">
                    {(title[0] ?? "·").toUpperCase()}
                  </span>
                )}
              </a>
              <div class="desc">
                {tags.length > 0 && (
                  <ul class="tags">
                    {tags.slice(0, 3).map((tag) => (
                      <li>
                        <a
                          class="internal tag-link"
                          href={resolveRelative(fileData.slug!, `tags/${tag}` as FullSlug)}
                          onclick={(e) => e.stopPropagation()}
                        >
                          {tag}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                <h3>
                  <a
                    href={resolveRelative(fileData.slug!, page.slug!)}
                    class="internal internal-link"
                  >
                    {title}
                  </a>
                </h3>
                {excerpt && <p class="excerpt">{excerpt}</p>}
                <p class="meta">
                  {date && <Date date={date} locale={cfg.locale} />}
                  {reading && <span> · {reading}</span>}
                </p>
              </div>
            </article>
          </li>
        )
      })}
    </ul>
  )
}

PageList.css = ``
