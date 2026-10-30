import { NImagePreview } from 'naive-ui'
import { defineComponent, ref } from 'vue'

// 放大看图：列表里点图片、编辑区点放大按钮都用它。Naive UI 的图片预览自带缩放、旋转、原始大小；
// 同一条碎碎念有几张图时可以左右切换（按钮或方向键）。
export function useImagePreview() {
  const shown = ref<{ srcs: string[]; index: number } | null>(null)
  const step = (delta: number) => {
    const current = shown.value
    if (current)
      current.index =
        (current.index + delta + current.srcs.length) % current.srcs.length
  }

  const ImagePreview = defineComponent({
    setup() {
      return () => {
        const current = shown.value
        const many = (current?.srcs.length ?? 0) > 1
        return (
          <NImagePreview
            show={!!current}
            src={current?.srcs[current.index]}
            onUpdateShow={(show: boolean) => {
              if (!show) shown.value = null
            }}
            onPrev={many ? () => step(-1) : undefined}
            onNext={many ? () => step(1) : undefined}
          />
        )
      }
    },
  })

  return {
    open: (srcs: string[], index: number) => {
      shown.value = { srcs, index }
    },
    ImagePreview,
  }
}
