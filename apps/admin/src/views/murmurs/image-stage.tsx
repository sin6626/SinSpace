import { X as RemoveIcon, ZoomIn as ZoomIcon } from 'lucide-vue-next'
import { NSpin } from 'naive-ui'
import type { PropType } from 'vue'
import { defineComponent, ref } from 'vue'
import styles from './index.module.css'
import type { MurmurImage } from './murmur-images'
import { clampWidth } from './murmur-images'

export type StageImage = MurmurImage & {
  key: string
  // 上传中先用本地预览显示
  preview?: string
  uploading?: boolean
}

// 四个角 + 四条边的中点。边也按原比例缩放（拖下边往上 = 整张图变小），不会把图压扁
type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
const handles: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
// 拖到这些宽度附近时吸附，方便对齐
const SNAPS = [25, 33, 50, 66, 75, 100]
const snap = (width: number) =>
  SNAPS.find((value) => Math.abs(value - width) <= 2) ?? width

// 编辑碎碎念时的图片区：每张图按当前宽度（占卡片宽度的百分比）显示，四角四边都能拖，按原比例缩放；
// 双击恢复 100%，聚焦后方向键每次调 5%，右上角放大看图、删掉。
export const ImageStage = defineComponent({
  props: {
    images: { type: Array as PropType<StageImage[]>, required: true },
    onResize: {
      type: Function as PropType<(index: number, width: number) => void>,
      required: true,
    },
    onRemove: {
      type: Function as PropType<(index: number) => void>,
      required: true,
    },
    onZoom: {
      type: Function as PropType<(index: number) => void>,
      required: true,
    },
  },
  setup(props) {
    const dragging = ref<string | null>(null)

    const startDrag = (event: PointerEvent, index: number, side: Handle) => {
      const handle = event.currentTarget as HTMLElement
      const frame = handle.parentElement!
      const row = frame.parentElement!
      const start = {
        x: event.clientX,
        y: event.clientY,
        width: frame.offsetWidth,
        aspect: frame.offsetHeight / frame.offsetWidth || 1,
      }
      // 往外拖变大、往里拖变小；边只看自己那个方向（signX 或 signY 为 0）
      const signX = side.includes('e') ? 1 : side.includes('w') ? -1 : 0
      const signY = side.startsWith('s') ? 1 : side.startsWith('n') ? -1 : 0
      event.preventDefault()
      handle.setPointerCapture(event.pointerId)
      dragging.value = props.images[index].key

      const move = (moveEvent: PointerEvent) => {
        // 横向、纵向拖动都换算成宽度变化，取变化大的那个，斜着拖也跟手
        const byX = signX * (moveEvent.clientX - start.x)
        const byY = (signY * (moveEvent.clientY - start.y)) / start.aspect
        const delta = Math.abs(byX) > Math.abs(byY) ? byX : byY
        props.onResize(
          index,
          snap(clampWidth(((start.width + delta) / row.offsetWidth) * 100)),
        )
      }
      const end = () => {
        dragging.value = null
        handle.removeEventListener('pointermove', move)
        handle.removeEventListener('pointerup', end)
        handle.removeEventListener('pointercancel', end)
      }
      handle.addEventListener('pointermove', move)
      handle.addEventListener('pointerup', end)
      handle.addEventListener('pointercancel', end)
    }

    const onKeydown = (event: KeyboardEvent, index: number) => {
      const step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 }[
        event.key
      ]
      if (!step) return
      event.preventDefault()
      props.onResize(index, clampWidth(props.images[index].width + step))
    }

    return () => (
      <div class={styles.stage} role="list" aria-label="图片">
        {props.images.map((image, index) => (
          <div key={image.key} class={styles.stageRow} role="listitem">
            <div
              class={styles.frame}
              data-dragging={dragging.value === image.key ? '' : undefined}
              style={{ width: `${image.width}%` }}
              tabindex={0}
              aria-label={`第 ${index + 1} 张图，宽度 ${image.width}%，方向键调整，双击恢复原宽`}
              onDblclick={() => props.onResize(index, 100)}
              onKeydown={(event: KeyboardEvent) => onKeydown(event, index)}
            >
              <img
                src={image.preview || image.src}
                alt={image.alt}
                draggable={false}
              />
              {image.uploading && (
                <div class={styles.uploading}>
                  <NSpin size="small" />
                  <span>上传中</span>
                </div>
              )}
              <span class={styles.widthBadge} aria-hidden="true">
                {image.width}%
              </span>
              <button
                type="button"
                class={[styles.imageButton, styles.zoomImage]}
                aria-label={`放大看第 ${index + 1} 张图`}
                onClick={() => props.onZoom(index)}
              >
                <ZoomIcon />
              </button>
              <button
                type="button"
                class={[styles.imageButton, styles.removeImage]}
                aria-label={`删掉第 ${index + 1} 张图`}
                onClick={() => props.onRemove(index)}
              >
                <RemoveIcon />
              </button>
              {handles.map((side) => (
                <span
                  key={side}
                  class={styles.handle}
                  data-corner={side}
                  aria-hidden="true"
                  onPointerdown={(event: PointerEvent) =>
                    startDrag(event, index, side)
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  },
})
