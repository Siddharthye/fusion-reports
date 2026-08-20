import { z } from 'zod'

const categorySchema = z.enum([
  'fire',
  'medical',
  'security',
  'harassment',
  'infrastructure',
  'other',
])

export const submitReportSchema = z.object({
  text: z.string().min(3).max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  category: categorySchema.default('other'),
  reporterToken: z.string().min(1).max(80),
  /**
   * Optional backfill timestamp. Used by the demo storm and by buyers
   * replaying historical report queues through the pipeline.
   */
  at: z.iso.datetime({ offset: true, local: true }).optional(),
})

export const stormSchema = z.object({
  scenario: z.enum(['fire', 'medical', 'harassment']).default('fire'),
  /**
   * `true` (default) drips reports in real time so the console is watchable;
   * `false` fires them instantly with back-dated timestamps spread over ~90s —
   * what the smoke tests use.
   */
  pace: z.boolean().default(true),
})
