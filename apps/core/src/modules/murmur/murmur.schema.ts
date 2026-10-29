import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const MurmurSchema = z.object({
  content: z.string().trim().min(1).max(10000),
  // 只在新建时生效：迁移旧速记时保留原来的时间
  created: z.coerce.date().optional(),
})

export class MurmurDto extends createZodDto(MurmurSchema) {}

export const MurmurPagerSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(50).default(20),
})

export class MurmurPagerDto extends createZodDto(MurmurPagerSchema) {}
