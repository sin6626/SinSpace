import { inject, provide } from 'vue'
import type { Ref } from 'vue'

export type OauthProviderType = 'github' | 'google'

export interface OauthData {
  providers: ProvidersItem[]
  public: Partial<Record<OauthProviderType, ProviderPublicConfig>>
  // SinPersonalSpace：Core 的后台配置接口会回显已保存的密钥，表单里掩码显示、可点眼睛查看。
  secrets?: Partial<Record<OauthProviderType, { clientSecret?: string }>>
}

interface ProvidersItem {
  type: OauthProviderType
  enabled: boolean
}

interface ProviderPublicConfig {
  clientId: string
}

export type FlatOauthData = Partial<
  Record<
    OauthProviderType,
    ProviderPublicConfig & {
      clientSecret: string
      enabled: boolean
      type: OauthProviderType
    }
  >
>

const ALL_OAUTH_PROVIDERS: OauthProviderType[] = ['github', 'google']

export function flattenOauthData(data: OauthData): FlatOauthData {
  const flatData: FlatOauthData = {}

  const providerMap = new Map(data.providers.map((p) => [p.type, p]))

  for (const providerType of ALL_OAUTH_PROVIDERS) {
    const provider = providerMap.get(providerType)
    const publicConfig = data.public[providerType]

    flatData[providerType] = {
      clientId: publicConfig?.clientId ?? '',
      clientSecret: data.secrets?.[providerType]?.clientSecret ?? '',
      enabled: provider?.enabled ?? false,
      type: providerType,
    }
  }

  return flatData
}

export const OauthDataInjectKey = Symbol.for('OauthDataInjectKey')

export const useProvideOauthData = () => (data: Ref<FlatOauthData>) => {
  return provide(OauthDataInjectKey, data)
}

export const useInjectOauthData = () =>
  inject(OauthDataInjectKey) as Ref<FlatOauthData>
