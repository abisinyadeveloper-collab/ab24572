import * as React from 'react'
import { Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { GhostEmail, SITE_URL, card, text } from './ghost-layout'

const PasswordChanged = ({ time }: { time?: string }) => (
  <GhostEmail preview="Your Ghost password was changed" title="Your password was changed" cta={{ label: 'Reset my password', href: `${SITE_URL}/login` }}>
    <Text style={text}>The password for your Ghost account was just changed.</Text>
    <Text style={{ ...text, ...card }}><strong>Time:</strong> {time || 'Just now'}</Text>
    <Text style={text}>If you did this, you're all set. If you didn't, reset your password now to lock your account.</Text>
  </GhostEmail>
)

export const template = {
  component: PasswordChanged,
  subject: 'Your Ghost password was changed',
  displayName: 'Password changed',
  previewData: { time: '1 Nov 2026, 09:10 (UTC)' },
} satisfies TemplateEntry
