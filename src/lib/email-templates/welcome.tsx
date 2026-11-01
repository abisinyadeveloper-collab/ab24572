import * as React from 'react'
import { Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { GhostEmail, SITE_URL, text } from './ghost-layout'

const Welcome = ({ name }: { name?: string }) => (
  <GhostEmail preview="Your Ghost account is ready" title={name ? `Welcome, ${name}` : 'Welcome to Ghost'} cta={{ label: 'Open Ghost', href: SITE_URL }}>
    <Text style={text}>Your account is confirmed and your private workspace is ready.</Text>
    <Text style={text}>Ask anything, create images and videos, talk live in Amharic or English, and Ghost will remember what matters to you across chats.</Text>
  </GhostEmail>
)

export const template = {
  component: Welcome,
  subject: 'Welcome to Ghost',
  displayName: 'Welcome',
  previewData: { name: 'Abel' },
} satisfies TemplateEntry
