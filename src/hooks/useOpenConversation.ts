import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import type { Conversation } from '@/lib/types';

/**
 * Returns an `openConversation` function that finds an existing conversation
 * between (customerId, participantId) or creates one, then navigates to the
 * messages page with that conversation pre-selected.
 *
 * Convention (matches Conversation type):
 *   customerId    — the member / student (or a coach when admin initiates)
 *   participantId — the admin or coach
 *   participantRole — 'admin' | 'coach'
 *
 * @param messagesPath  the route to navigate to ('/messages' | '/admin/messages')
 */
export function useOpenConversation(messagesPath: string = '/messages') {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();

  return function openConversation(
    customerId: string,
    participantId: string,
    participantRole: 'admin' | 'coach',
  ) {
    const existing = state.conversations.find(
      c => c.customerId === customerId && c.participantId === participantId,
    );
    if (existing) {
      navigate(messagesPath, { state: { convId: existing.id } });
      return;
    }
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      customerId,
      participantId,
      participantRole,
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CONVERSATION', payload: newConv });
    navigate(messagesPath, { state: { convId: newConv.id } });
  };
}
