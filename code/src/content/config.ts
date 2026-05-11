import { defineCollection, z } from 'astro:content';

const airdrops = defineCollection({
  type: 'content',
  schema: z.object({
    project: z.string(),
    chain: z.string(),
    blurb: z.string(),
    action: z.string(),
    effort: z.string(),
    costFloor: z.string(),
    deadline: z.coerce.string(),
    risk: z.enum(['verified', 'unverified', 'suspect']),
    officialUrl: z.string().url(),
    twitter: z.string().optional(),
    addedOn: z.coerce.string(),
    lastChecked: z.coerce.string().optional(),
    status: z.enum(['active', 'ended']).default('active'),
  }),
});

export const collections = { airdrops };
