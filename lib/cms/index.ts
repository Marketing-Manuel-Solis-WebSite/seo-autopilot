import type { CMSAdapter, CMSSite } from './types'
import { wordpress } from './wordpress'
import { webflow } from './webflow'
import { github } from './github'
import { generic } from './generic'

const adapters: Record<string, CMSAdapter> = {
  wordpress,
  webflow,
  github,
}

export function getCMSAdapter(site: CMSSite): CMSAdapter {
  if (site.cmsType && adapters[site.cmsType]) {
    return adapters[site.cmsType]
  }
  return generic
}

export type { CMSAdapter, CMSSite, PublishResult } from './types'
