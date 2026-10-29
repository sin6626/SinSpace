import { defineComponent } from 'vue'
import styles from './index.module.css'
import { splitContent } from './murmur-images'

// 列表里一条碎碎念的正文：文字原样换行，图片按保存的宽度显示（和前台一致）
export const MurmurBody = defineComponent({
  props: { content: { type: String, required: true } },
  setup(props) {
    return () => (
      <div class={styles.body}>
        {splitContent(props.content).map((segment, index) =>
          segment.kind === 'text' ? (
            <p key={index} class={styles.bodyText}>
              {segment.text}
            </p>
          ) : (
            <img
              key={index}
              class={styles.bodyImage}
              src={segment.src}
              alt={segment.alt}
              loading="lazy"
              style={{ width: `${segment.width}%` }}
            />
          ),
        )}
      </div>
    )
  },
})
