import * as React from 'react'
import { Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { GhostEmail, SITE_URL, card, muted, text } from './ghost-layout'

const NewSignIn = ({ device, time }: { device?: string; time?: string }) => (
  <GhostEmail preview="New sign-in to your Ghost account" title="New sign-in to Ghost" cta={{ label: 'Secure my account', href: `${SITE_URL}/login` }}>
    <Text style={text}>Your Ghost account was just signed into from a new device.</Text>
    <Text style={{ ...text, ...card }}>
      <strong>Device:</strong> {device || 'Unknown device'}<br />
      <strong>Time:</strong> {time || 'Just now'}
    </Text>
    <Text style={text}>If this was you, there's nothing to do. If not, reset your password right away.</Text>
    <Text style={muted}>You can turn these emails off in your Ghost profile.</Text>
  </GhostEmail>
)

export const template = {
  component: NewSignIn,
  subject: 'New sign-in to your Ghost account',
  displayName: 'New sign-in alert',
  previewData: { device: 'Chrome on Android', time: '1 Nov 2026, 09:10 (UTC)' },
} satisfies TemplateEntry
