import * as React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text } from '@react-email/components'

export const SITE_URL = 'https://ghosts.abisinyabet.com'
const BLUE = '#2b63e6'

export function GhostEmail({ preview, title, children, cta }: {
  preview: string
  title: string
  children: React.ReactNode
  cta?: { label: string; href: string }
}) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandRow}>
            <Img src={`${SITE_URL}/favicon.png`} width="36" height="36" alt="Ghost" style={logo} />
            <Text style={brand}>GHOST · ABISINYA</Text>
          </Section>
          <Heading style={h1}>{title}</Heading>
          {children}
          {cta && (
            <Section style={{ margin: '28px 0 8px' }}>
              <Button style={button} href={cta.href}>{cta.label}</Button>
            </Section>
          )}
          <Hr style={hr} />
          <Text style={footer}>Ghost by ABISINYA · ghosts.abisinyabet.com</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const text = { fontSize: '15px', color: '#3d4250', lineHeight: '1.6', margin: '0 0 14px' }
export const muted = { fontSize: '13px', color: '#8a8f9c', lineHeight: '1.6', margin: '0 0 10px' }
export const card = { backgroundColor: '#f3f6fd', borderRadius: '16px', padding: '14px 18px', margin: '6px 0 16px' }

const main = { backgroundColor: '#ffffff', fontFamily: "Figtree, 'Segoe UI', Helvetica, Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '520px' }
const brandRow = { marginBottom: '20px' }
const logo = { borderRadius: '10px', display: 'inline-block', verticalAlign: 'middle' }
const brand = { display: 'inline-block', verticalAlign: 'middle', margin: '0 0 0 10px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', color: BLUE }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#1f2330', margin: '0 0 16px' }
const button = { backgroundColor: BLUE, color: '#ffffff', borderRadius: '999px', padding: '13px 26px', fontSize: '15px', fontWeight: 600, textDecoration: 'none' }
const hr = { borderColor: '#e6e9f0', margin: '28px 0 14px' }
const footer = { fontSize: '12px', color: '#8a8f9c', margin: 0 }
