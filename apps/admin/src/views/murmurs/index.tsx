import {
  MessageCircleMore as EmptyIcon,
  Pencil as PencilIcon,
  Trash2 as TrashIcon,
} from 'lucide-vue-next'
import { NButton, NPopconfirm, NSkeleton, NTooltip } from 'naive-ui'
import type { PropType } from 'vue'
import { computed, defineComponent, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { murmursApi } from '~/api/murmurs'
import type { MurmurModel } from '~/models/murmur'

import { MurmurComposer } from './composer'
import { useImagePreview } from './image-preview'
import styles from './index.module.css'
import { MurmurBody } from './murmur-body'

const PAGE_SIZE = 20
const dayKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

function dayLabel(date: Date) {
  const today = new Date()
  const yesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1,
  )
  const name =
    dayKey(date) === dayKey(today)
      ? '今天'
      : dayKey(date) === dayKey(yesterday)
        ? '昨天'
        : null
  const day = date.toLocaleDateString('zh-CN', {
    ...(date.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
    month: 'long',
    day: 'numeric',
  })
  const full = `${day} ${date.toLocaleDateString('zh-CN', { weekday: 'short' })}`
  return name ? { name, detail: full } : { name: full, detail: '' }
}

const MurmurEntry = defineComponent({
  props: {
    item: { type: Object as PropType<MurmurModel>, required: true },
    editing: { type: Boolean, required: true },
    onEdit: { type: Function as PropType<() => void>, required: true },
    onCancel: { type: Function as PropType<() => void>, required: true },
    onSave: {
      type: Function as PropType<(content: string) => Promise<unknown>>,
      required: true,
    },
    onDelete: { type: Function as PropType<() => void>, required: true },
    onZoom: {
      type: Function as PropType<(srcs: string[], index: number) => void>,
      required: true,
    },
  },
  setup(props) {
    return () => (
      <article
        class={styles.entry}
        data-editing={props.editing ? '' : undefined}
      >
        <div class={styles.entryTime}>
          <time datetime={props.item.created}>
            {timeOf(props.item.created)}
          </time>
          {props.item.modified && (
            <span
              title={`改于 ${new Date(props.item.modified).toLocaleString('zh-CN')}`}
            >
              改过
            </span>
          )}
        </div>
        {props.editing ? (
          <MurmurComposer
            initialContent={props.item.content}
            submitText="保存"
            autofocus
            onSubmit={props.onSave}
            onCancel={props.onCancel}
          />
        ) : (
          <>
            <MurmurBody content={props.item.content} onZoom={props.onZoom} />
            <div class={styles.entryActions} role="group" aria-label="操作">
              <NTooltip placement="top">
                {{
                  trigger: () => (
                    <button
                      type="button"
                      class={styles.actionButton}
                      aria-label="编辑这条"
                      onClick={props.onEdit}
                    >
                      <PencilIcon />
                    </button>
                  ),
                  default: () => '编辑',
                }}
              </NTooltip>
              <NPopconfirm
                placement="left"
                positiveText="留着"
                negativeText="删掉"
                onNegativeClick={props.onDelete}
              >
                {{
                  trigger: () => (
                    <button
                      type="button"
                      class={[styles.actionButton, styles.deleteButton]}
                      aria-label="删除这条"
                    >
                      <TrashIcon />
                    </button>
                  ),
                  default: () => '删掉这条碎碎念？',
                }}
              </NPopconfirm>
            </div>
          </>
        )}
      </article>
    )
  },
})

// 后台“碎碎念”：顶部常驻输入框随手记一句，下面按天分组，从新到旧，可就地编辑
export default defineComponent({
  setup() {
    const items = ref<MurmurModel[]>([])
    const loading = ref(true)
    const loadingMore = ref(false)
    const page = ref(0)
    const hasMore = ref(false)
    const total = ref(0)
    const editingId = ref<string | null>(null)
    const viewer = useImagePreview()

    const load = async () => {
      const next = page.value + 1
      const res = await murmursApi.getList({ page: next, size: PAGE_SIZE })
      const known = new Set(items.value.map((item) => item.id))
      items.value.push(...res.data.filter((item) => !known.has(item.id)))
      page.value = next
      hasMore.value = res.pagination.hasNextPage
      total.value = res.pagination.total
    }

    onMounted(() => load().finally(() => (loading.value = false)))

    const loadMore = () => {
      loadingMore.value = true
      load().finally(() => (loadingMore.value = false))
    }

    const groups = computed(() => {
      const result: { key: string; date: Date; items: MurmurModel[] }[] = []
      for (const item of items.value) {
        const date = new Date(item.created)
        const key = dayKey(date)
        const last = result.at(-1)
        if (last?.key === key) last.items.push(item)
        else result.push({ key, date, items: [item] })
      }
      return result
    })

    const create = async (content: string) => {
      const created = await murmursApi.create({ content })
      items.value.unshift(created)
      total.value++
      toast.success('记下了')
    }

    const save = async (item: MurmurModel, content: string) => {
      const updated = await murmursApi.update(item.id, { content })
      Object.assign(item, updated)
      editingId.value = null
    }

    const remove = async (item: MurmurModel) => {
      await murmursApi.delete(item.id)
      items.value = items.value.filter((other) => other.id !== item.id)
      total.value--
      toast.success('删掉了')
    }

    return () => (
      <div class={styles.page}>
        <MurmurComposer autofocus onSubmit={create} />

        {loading.value ? (
          <div class={styles.thread} aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div key={i} class={styles.entry}>
                <NSkeleton text style={{ width: '2.5rem' }} />
                <NSkeleton text repeat={2} />
              </div>
            ))}
          </div>
        ) : items.value.length === 0 ? (
          <div class={styles.empty} role="status">
            <EmptyIcon class={styles.emptyIcon} />
            <p class={styles.emptyTitle}>还没有碎碎念</p>
            <p class={styles.emptyDescription}>
              问 AI 时学到的新词、突然冒出的念头，都可以随口记一句
            </p>
          </div>
        ) : (
          <div class={styles.timeline} role="feed" aria-label="碎碎念">
            <p class={styles.total}>一共 {total.value} 条</p>
            {groups.value.map((group) => {
              const { name, detail } = dayLabel(group.date)
              return (
                <section key={group.key} class={styles.day} aria-label={name}>
                  <header class={styles.dayHeader}>
                    <span class={styles.dayName}>{name}</span>
                    {detail && <span class={styles.dayDetail}>{detail}</span>}
                    <span class={styles.dayCount}>{group.items.length} 条</span>
                  </header>
                  <div class={styles.thread}>
                    {group.items.map((item) => (
                      <MurmurEntry
                        key={item.id}
                        item={item}
                        editing={editingId.value === item.id}
                        onEdit={() => (editingId.value = item.id)}
                        onCancel={() => (editingId.value = null)}
                        onSave={(content) => save(item, content)}
                        onDelete={() => remove(item)}
                        onZoom={viewer.open}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
            {hasMore.value ? (
              <NButton
                class={styles.more}
                quaternary
                loading={loadingMore.value}
                onClick={loadMore}
              >
                再往前翻翻
              </NButton>
            ) : (
              <p class={styles.end}>就这些了</p>
            )}
          </div>
        )}
        <viewer.ImagePreview />
      </div>
    )
  },
})
