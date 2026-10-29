import { createFileRoute } from '@tanstack/react-router';
import { handleGhostChat } from '@/lib/ghost-chat.server';
export const Route=createFileRoute('/api/chat')({server:{handlers:{POST:({request})=>handleGhostChat(request)}}});
