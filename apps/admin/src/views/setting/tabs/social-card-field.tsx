import { ImagePlus as ImageIcon, X as RemoveIcon } from 'lucide-vue-next'
import { NButton, NInput, NSpin } from 'naive-ui'
import type { PropType } from 'vue'
import { defineComponent, ref } from 'vue'
import { toast } from 'vue-sonner'
import { filesApi } from '~/api/files'

export type SocialCardValue = { id?: string; qr?: string }

// 把旧数据（只填了号码的字符串）也读成 { id, qr }
export const toCardValue = (value: unknown): SocialCardValue =>
  typeof value === 'string'
    ? { id: value }
    : value && typeof value === 'object'
      ? (value as SocialCardValue)
      : {}

// 社交链接里微信、QQ 这类“名片”平台的一行：号码 + 二维码。二维码可以点按钮选图，也可以在号码框里直接 ⌘V 粘贴，
// 传到图床后存地址；前台点图标弹出名片显示二维码和号码。保存个人资料时 Core 会把二维码登记为已引用，不会被清理。
export const SocialCardField = defineComponent({
  props: {
    value: {
      type: [String, Number, Object] as PropType<
        string | number | SocialCardValue | undefined
      >,
      default: undefined,
    },
    hint: { type: String, required: true },
    onUpdate: {
      type: Function as PropType<(value: SocialCardValue) => void>,
      required: true,
    },
  },
  setup(props) {
    const uploading = ref(false)
    const fileInput = ref<HTMLInputElement>()

    const upload = async (file: File) => {
      uploading.value = true
      try {
        const { url } = await filesApi.upload(file, 'image')
        props.onUpdate({ ...toCardValue(props.value), qr: url })
      } catch {
        toast.error('二维码上传失败')
      } finally {
        uploading.value = false
      }
    }

    const onPaste = (event: ClipboardEvent) => {
      const file = [...(event.clipboardData?.items ?? [])]
        .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
        ?.getAsFile()
      if (!file) return
      event.preventDefault()
      upload(file)
    }

    return () => {
      const card = toCardValue(props.value)
      return (
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <NInput
            class="min-w-0 flex-1"
            value={card.id ?? ''}
            onInput={(id) => props.onUpdate({ ...card, id })}
            placeholder={`${props.hint}；可 ⌘V 粘贴二维码`}
            inputProps={{ spellcheck: false, onPaste }}
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(event: Event) => {
              const input = event.target as HTMLInputElement
              const file = input.files?.[0]
              if (file) upload(file)
              input.value = ''
            }}
          />
          {card.qr ? (
            <div class="relative shrink-0">
              <a
                href={card.qr}
                target="_blank"
                rel="noopener noreferrer"
                title="查看二维码"
              >
                <img
                  src={card.qr}
                  alt="二维码"
                  class="block size-9 rounded-md border border-neutral-200 object-cover dark:border-neutral-700"
                />
              </a>
              <button
                type="button"
                aria-label="移除二维码"
                class="absolute -top-1.5 -right-1.5 flex size-4 cursor-pointer items-center justify-center rounded-full border-0 bg-neutral-700 text-white hover:bg-red-500"
                onClick={() => props.onUpdate({ ...card, qr: undefined })}
              >
                <RemoveIcon class="size-3" />
              </button>
            </div>
          ) : null}
          <NButton
            size="small"
            secondary
            disabled={uploading.value}
            onClick={() => fileInput.value?.click()}
          >
            {uploading.value ? (
              <NSpin size={14} />
            ) : (
              <ImageIcon class="mr-1 size-4" />
            )}
            {card.qr ? '更换二维码' : '上传二维码'}
          </NButton>
        </div>
      )
    }
  },
})
