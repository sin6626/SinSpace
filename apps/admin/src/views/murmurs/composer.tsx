import { ImagePlus as ImageIcon } from 'lucide-vue-next'
import { NButton } from 'naive-ui'
import type { PropType } from 'vue'
import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { filesApi } from '~/api/files'
import { useImagePreview } from './image-preview'
import type { StageImage } from './image-stage'
import { ImageStage } from './image-stage'
import styles from './index.module.css'
import { composeMurmur, defaultWidth, parseMurmur } from './murmur-images'

let uploadSeed = 0

// 写碎碎念的输入框：新建（页面顶部常驻）和编辑（就地替换那一条）共用。
// 文本框只放文字；⌘V 粘贴或拖进来的图片传到图床后排在下面，可拖角/边缩放（竖图贴进来先自动缩小）；⌘↵ 提交，编辑时 Esc 取消。
export const MurmurComposer = defineComponent({
  props: {
    initialContent: { type: String, default: '' },
    submitText: { type: String, default: '记下' },
    placeholder: { type: String, default: '想到什么，随口说一句…' },
    autofocus: { type: Boolean, default: false },
    onSubmit: {
      type: Function as PropType<(content: string) => Promise<unknown>>,
      required: true,
    },
    onCancel: { type: Function as PropType<() => void> },
  },
  setup(props) {
    const initial = parseMurmur(props.initialContent)
    const text = ref(initial.text)
    const images = ref<StageImage[]>(
      initial.images.map((image) => ({
        ...image,
        key: `saved-${uploadSeed++}`,
      })),
    )
    const submitting = ref(false)
    const dragOver = ref(false)
    const textarea = ref<HTMLTextAreaElement>()
    const fileInput = ref<HTMLInputElement>()
    const previews = new Set<string>()
    const viewer = useImagePreview()

    const uploading = computed(() =>
      images.value.some((image) => image.uploading),
    )
    const canSubmit = computed(
      () =>
        !submitting.value &&
        !uploading.value &&
        (text.value.trim() !== '' || images.value.length > 0),
    )

    onMounted(() => {
      if (props.autofocus) {
        const element = textarea.value!
        element.focus()
        element.setSelectionRange(element.value.length, element.value.length)
      }
    })
    onBeforeUnmount(() => previews.forEach((url) => URL.revokeObjectURL(url)))

    const upload = async (file: File) => {
      const preview = URL.createObjectURL(file)
      previews.add(preview)
      const key = `upload-${uploadSeed++}`
      images.value.push({
        key,
        alt: '',
        src: '',
        width: 100,
        preview,
        uploading: true,
      })
      // 读出原图宽高：竖图（如全身照）默认缩小，用户已经拖过就不再改
      const probe = new Image()
      probe.src = preview
      probe
        .decode()
        .then(() => {
          const image = images.value.find((item) => item.key === key)
          if (image && image.width === 100)
            image.width = defaultWidth(probe.naturalWidth, probe.naturalHeight)
        })
        .catch(() => {
          // 读不出尺寸（格式不支持解码）就保持 100%，不影响上传
        })
      try {
        const { url } = await filesApi.upload(file, 'image')
        const image = images.value.find((item) => item.key === key)
        if (image) Object.assign(image, { src: url, uploading: false })
      } catch {
        images.value = images.value.filter((item) => item.key !== key)
        toast.error('图片上传失败')
      }
    }

    const uploadAll = (files: Iterable<File>) => {
      const list = [...files].filter((file) => file.type.startsWith('image/'))
      list.forEach(upload)
      return list.length > 0
    }

    const onPaste = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.items ?? [])].flatMap(
        (item) => (item.kind === 'file' && item.getAsFile()) || [],
      )
      if (uploadAll(files)) event.preventDefault()
    }

    const onDrop = (event: DragEvent) => {
      dragOver.value = false
      if (
        event.dataTransfer?.files.length &&
        uploadAll(event.dataTransfer.files)
      )
        event.preventDefault()
    }

    const submit = async () => {
      if (!canSubmit.value) return
      submitting.value = true
      try {
        await props.onSubmit(composeMurmur(text.value, images.value))
        if (!props.onCancel) {
          text.value = ''
          images.value = []
        }
      } finally {
        submitting.value = false
      }
    }

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        submit()
      } else if (event.key === 'Escape' && props.onCancel) {
        event.preventDefault()
        props.onCancel()
      }
    }

    return () => (
      <div
        class={styles.composer}
        data-drag-over={dragOver.value ? '' : undefined}
        onDragover={(event: DragEvent) => {
          if (event.dataTransfer?.types.includes('Files')) {
            event.preventDefault()
            dragOver.value = true
          }
        }}
        onDragleave={() => (dragOver.value = false)}
        onDrop={onDrop}
        onKeydown={onKeydown}
      >
        <textarea
          ref={textarea}
          class={styles.textarea}
          value={text.value}
          placeholder={props.placeholder}
          aria-label="碎碎念内容"
          onInput={(event: Event) =>
            (text.value = (event.target as HTMLTextAreaElement).value)
          }
          onPaste={onPaste}
        />
        {images.value.length > 0 && (
          <ImageStage
            images={images.value}
            onResize={(index, width) => (images.value[index].width = width)}
            onRemove={(index) => images.value.splice(index, 1)}
            onZoom={(index) =>
              viewer.open(
                images.value.map((image) => image.preview || image.src),
                index,
              )
            }
          />
        )}
        <div class={styles.composerFooter}>
          <div class={styles.tools}>
            <button
              type="button"
              class={styles.toolButton}
              aria-label="添加图片"
              onClick={() => fileInput.value?.click()}
            >
              <ImageIcon />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event: Event) => {
                const input = event.target as HTMLInputElement
                if (input.files) uploadAll(input.files)
                input.value = ''
              }}
            />
            <span class={styles.hint}>
              <kbd>⌘V</kbd> 贴图 · <kbd>⌘↵</kbd> {props.submitText}
              {props.onCancel && (
                <>
                  {' '}
                  · <kbd>Esc</kbd> 取消
                </>
              )}
            </span>
          </div>
          <div class={styles.tools}>
            {props.onCancel && (
              <NButton size="small" quaternary onClick={props.onCancel}>
                取消
              </NButton>
            )}
            <NButton
              size="small"
              type="primary"
              round
              disabled={!canSubmit.value}
              loading={submitting.value}
              onClick={submit}
            >
              {uploading.value ? '等图片传完' : props.submitText}
            </NButton>
          </div>
        </div>
        <viewer.ImagePreview />
      </div>
    )
  },
})
