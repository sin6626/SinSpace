import type { PropType } from 'vue'
import { defineComponent } from 'vue'
import styles from './index.module.css'
import { splitContent } from './murmur-images'

// 列表里一条碎碎念的正文：文字原样换行，图片按保存的宽度显示（和前台一致），点图片放大看
export const MurmurBody = defineComponent({
  props: {
    content: { type: String, required: true },
    onZoom: {
      type: Function as PropType<(srcs: string[], index: number) => void>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const segments = splitContent(props.content)
      const srcs = segments.flatMap((segment) =>
        segment.kind === 'image' ? [segment.src] : [],
      )
      let imageIndex = 0
      return (
        <div class={styles.body}>
          {segments.map((segment, index) => {
            if (segment.kind === 'text')
              return (
                <p key={index} class={styles.bodyText}>
                  {segment.text}
                </p>
              )
            const current = imageIndex++
            return (
              <button
                key={index}
                type="button"
                class={styles.bodyImage}
                style={{ width: `${segment.width}%` }}
                aria-label={`放大看第 ${current + 1} 张图`}
                onClick={() => props.onZoom(srcs, current)}
              >
                <img src={segment.src} alt={segment.alt} loading="lazy" />
              </button>
            )
          })}
        </div>
      )
    }
  },
})
