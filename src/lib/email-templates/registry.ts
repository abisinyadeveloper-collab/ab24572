import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
import { template as welcome } from './welcome'
import { template as videoReady } from './video-ready'
import { template as newSignIn } from './new-sign-in'
import { template as passwordChanged } from './password-changed'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcome,
  'video-ready': videoReady,
  'new-sign-in': newSignIn,
  'password-changed': passwordChanged,
}
