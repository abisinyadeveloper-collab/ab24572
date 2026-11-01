import * as React from 'react'
import { Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { GhostEmail, SITE_URL, card, muted, text } from './ghost-layout'

const VideoReady = ({ prompt }: { prompt?: string }) => (
  <GhostEmail preview="Your Ghost video has finished" title="Your video is ready" cta={{ label: 'Watch your video', href: `${SITE_URL}/videos` }}>
    <Text style={text}>Ghost finished creating your video. It's saved in your account.</Text>
    {prompt && <Text style={{ ...text, ...card }}>"{prompt.length > 180 ? `${prompt.slice(0, 180)}…` : prompt}"</Text>}
    <Text style={muted}>You can turn these emails off any time in your Ghost profile.</Text>
  </GhostEmail>
)

export const template = {
  component: VideoReady,
  subject: 'Your Ghost video is ready',
  displayName: 'Video ready',
  previewData: { prompt: 'A lion walking through Addis at sunrise' },
} satisfies TemplateEntry
