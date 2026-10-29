import type { MurmurModel, MurmurResponse } from '~/models/murmur'

import { request } from '~/utils/request'

export const murmursApi = {
  getList: (params: { page: number; size?: number }) =>
    request.get<MurmurResponse>('/murmurs', { params }),

  create: (data: { content: string }) =>
    request.post<MurmurModel>('/murmurs', { data }),

  update: (id: string, data: { content: string }) =>
    request.put<MurmurModel>(`/murmurs/${id}`, { data }),

  delete: (id: string) => request.delete<void>(`/murmurs/${id}`),
}
