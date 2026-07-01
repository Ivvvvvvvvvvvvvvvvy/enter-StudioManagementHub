import { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send, MessageSquare, Plus, ShieldCheck } from 'lucide-react';
import type { Conversation } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

import { avatarStyle } from '@/lib/avatar';

// ── ConvItem ──────────────────────────────────────────────────────────────────

function ConvItem({ conv, active, displayName, subtitle, unread, avatarUrl, onClick }: {
  conv: Conversation; active: boolean; displayName: string; subtitle?: string;
  unread: number; avatarUrl?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={cn(
      'w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors border-b border-border/40',
      active && 'bg-primary/5 border-l-2 border-l-primary'
    )}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden"
          style={avatarUrl ? undefined : avatarStyle(conv.participantId)}>
          {avatarUrl
            ? <img src={avatarUrl} alt={displayName} crossOrigin="anonymous" className="w-full h-full object-cover" />
            : initials(displayName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground truncate">{displayName}</span>
            <span className="text-[10px] text-muted-foreground shrink-0 ml-1">{timeAgo(conv.lastMessageAt)}</span>
          </div>
          {subtitle && <div className="text-[10px] text-muted-foreground mb-0.5">{subtitle}</div>}
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs text-muted-foreground truncate">{conv.lastMessage ?? 'No messages yet'}</p>
            {unread > 0 && (
              <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { state, dispatch, getConversations, getMessages, getUser } = useStore();
  const { user } = useAuth();
  const location = useLocation();
  const initialConvId = (location.state as { convId?: string } | null)?.convId ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initialConvId);
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = user?.userId ?? '';
  const role = user?.role ?? 'customer';

  // Conversations visible to this user
  const conversations = useMemo(
    () => getConversations(userId, role).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()),
    [userId, role, getConversations, state.conversations]
  );

  // Auto-select first conversation
  useEffect(() => {
    if (conversations.length > 0 && !selectedId) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  const selectedConv = conversations.find(c => c.id === selectedId) ?? null;
  const messages = useMemo(
    () => selectedConv ? getMessages(selectedConv.id) : [],
    [selectedConv, getMessages, state.messages]
  );

  // Mark as read when opening a conversation
  useEffect(() => {
    if (selectedId) {
      dispatch({ type: 'MARK_MESSAGES_READ', payload: { conversationId: selectedId, readerId: userId } });
    }
  }, [selectedId, userId, dispatch]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Per-conversation unread count
  function unreadCount(convId: string) {
    return state.messages.filter(m => m.conversationId === convId && m.senderId !== userId && !m.read).length;
  }

  // Get display name for a conversation, from the perspective of the current user
  function getDisplayInfo(conv: Conversation): { name: string; subtitle?: string; avatar?: string } {
    if (role === 'customer') {
      const participant = getUser(conv.participantId);
      return { name: participant?.name ?? (conv.participantRole === 'admin' ? 'Studio Admin' : 'Coach'), avatar: participant?.avatar };
    }
    if (role === 'coach') {
      // Admin-initiated: coach is in the customerId slot → show admin name
      if (conv.customerId === userId) {
        const admin = getUser(conv.participantId);
        return { name: admin?.name ?? 'Studio Admin', avatar: admin?.avatar };
      }
      // Customer-initiated: show customer name
      const customer = getUser(conv.customerId);
      return { name: customer?.name ?? 'Member', avatar: customer?.avatar };
    }
    // admin: show customer name + context
    const customer = getUser(conv.customerId);
    const participant = getUser(conv.participantId);
    return {
      name: customer?.name ?? 'Member',
      avatar: customer?.avatar,
      subtitle: conv.participantRole === 'coach' ? `with ${participant?.name ?? 'Coach'}` : 'with Studio Admin',
    };
  }

  // Send a message
  function sendMessage() {
    const text = draft.trim();
    if (!text || !selectedConv) return;
    const msg = {
      id: `msg-${Date.now()}`,
      conversationId: selectedConv.id,
      senderId: userId,
      text,
      createdAt: new Date().toISOString(),
      read: false,
    };
    dispatch({ type: 'ADD_MESSAGE', payload: msg });
    setDraft('');
  }

  // Start new conversation with admin (customer only)
  function startAdminConversation() {
    const exists = conversations.find(c => c.participantRole === 'admin');
    if (exists) { setSelectedId(exists.id); return; }
    const adminId = state.users.find(u => u.role === 'admin')?.id ?? 'admin-1';
    const conv: Conversation = {
      id: `conv-${Date.now()}`,
      customerId: userId,
      participantId: adminId,
      participantRole: 'admin',
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CONVERSATION', payload: conv });
    setSelectedId(conv.id);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden bg-background">

      {/* ── Left panel: conversation list ─────────────────────────────────── */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col bg-card">
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-foreground">Messages</h1>
            {role === 'admin' && (
              <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5" /> Monitor
              </span>
            )}
          </div>
          {role === 'customer' && (
            <button
              onClick={startAdminConversation}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
              <Plus className="w-3.5 h-3.5" /> Ask Studio Admin
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            conversations.map(conv => {
              const { name, subtitle, avatar } = getDisplayInfo(conv);
              return (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  active={conv.id === selectedId}
                  displayName={name}
                  subtitle={subtitle}
                  unread={unreadCount(conv.id)}
                  avatarUrl={avatar}
                  onClick={() => setSelectedId(conv.id)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel: chat view ─────────────────────────────────────────── */}
      {!selectedConv ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-medium text-foreground">Select a conversation</p>
          <p className="text-sm mt-1">Choose a conversation from the left panel</p>
        </div>
      ) : (() => {
        const { name: partnerName } = getDisplayInfo(selectedConv);
        const partnerUser = role === 'customer'
          ? getUser(selectedConv.participantId)
          : role === 'coach'
          ? (selectedConv.customerId === userId
              ? getUser(selectedConv.participantId)   // admin-initiated conv
              : getUser(selectedConv.customerId))     // customer-initiated conv
          : getUser(selectedConv.customerId);

        return (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Chat header */}
            <div className="shrink-0 px-5 py-3.5 border-b border-border bg-card flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden"
                style={partnerUser?.avatar ? undefined : avatarStyle(selectedConv.participantId)}>
                {partnerUser?.avatar
                  ? <img src={partnerUser.avatar} alt={partnerName} crossOrigin="anonymous" className="w-full h-full object-cover" />
                  : initials(partnerName)}
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">{partnerName}</div>
                <div className="text-[11px] text-muted-foreground">
                  {selectedConv.participantRole === 'admin' ? 'Studio Admin' : selectedConv.participantRole === 'coach' ? 'Coach' : 'Member'}
                  {role === 'admin' && ` · ${getUser(selectedConv.customerId)?.name ?? ''}`}
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-[#f7f8fc] dark:bg-background">
              {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No messages yet. Say hello!
                </div>
              )}
              {messages.map(msg => {
                const isMe = msg.senderId === userId;
                const sender = getUser(msg.senderId);
                const dt = new Date(msg.createdAt);
                const timeStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                return (
                  <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                    {!isMe && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mr-2 shrink-0 mt-1 overflow-hidden"
                        style={sender?.avatar ? undefined : avatarStyle(msg.senderId)}>
                        {sender?.avatar
                          ? <img src={sender.avatar} alt={sender.name} crossOrigin="anonymous" className="w-full h-full object-cover" />
                          : initials(sender?.name ?? '?')}
                      </div>
                    )}
                    <div className={cn('max-w-[65%]', isMe ? 'items-end' : 'items-start', 'flex flex-col gap-0.5')}>
                      {!isMe && <span className="text-[10px] text-muted-foreground px-1">{sender?.name}</span>}
                      <div className={cn(
                        'px-3.5 py-2 rounded-2xl text-sm leading-relaxed',
                        isMe
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-card border border-border text-foreground rounded-bl-md'
                      )}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-muted-foreground px-1">{timeStr}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="shrink-0 px-4 py-3 border-t border-border bg-card">
              <div className="flex items-end gap-2">
                <textarea
                  rows={1}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Type a message…"
                  className="flex-1 resize-none bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-32"
                />
                <Button
                  size="icon"
                  onClick={sendMessage}
                  disabled={!draft.trim()}
                  className="h-10 w-10 rounded-xl shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
