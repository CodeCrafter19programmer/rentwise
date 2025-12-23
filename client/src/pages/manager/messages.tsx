import { useState } from "react";
import { Search, MessageSquare, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { MessageThread } from "@/components/message-thread";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getSupabaseErrorMessage } from "@/lib/supabase-error";
import { format } from "date-fns";
import type { Profile, Message } from "@shared/schema";

interface Conversation {
  otherUser: Profile;
  lastMessage: Message;
  unreadCount: number;
}

export default function ManagerMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  if (!user) return null;

  const { data: userMessages = [] } = useQuery({
    queryKey: ["messages", user.id],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id, subject, content, is_read, created_at")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.id,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        subject: m.subject,
        content: m.content,
        isRead: m.is_read,
        createdAt: m.created_at,
      })) as Message[];
    },
  });

  const otherUserIds = Array.from(
    new Set(
      (userMessages as Message[]).map((m) => (m.senderId === user.id ? m.receiverId : m.senderId))
    )
  ).filter(Boolean) as string[];

  const { data: otherUsers = [] } = useQuery({
    queryKey: ["profiles", otherUserIds.join("-")],
    enabled: isSupabaseConfigured && otherUserIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role")
        .in("id", otherUserIds);
      if (error) throw error;
      return data || [];
    },
  });

  const otherById = Object.fromEntries((otherUsers as any[]).map((p) => [p.id, p]));

  const conversationMap = new Map<string, Conversation>();
  (userMessages as Message[]).forEach((message) => {
    const otherUserId = message.senderId === user.id ? message.receiverId : message.senderId;
    const otherUser = otherById[otherUserId];
    if (!otherUser) return;

    const existing = conversationMap.get(otherUserId);
    if (!existing || new Date(message.createdAt!) > new Date(existing.lastMessage.createdAt!)) {
      conversationMap.set(otherUserId, {
        otherUser,
        lastMessage: message,
        unreadCount: existing ? existing.unreadCount + (!message.isRead && message.receiverId === user.id ? 1 : 0)
          : (!message.isRead && message.receiverId === user.id ? 1 : 0),
      });
    }
  });

  const conversations = Array.from(conversationMap.values())
    .filter((conv) =>
      conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) =>
      new Date(b.lastMessage.createdAt!).getTime() - new Date(a.lastMessage.createdAt!).getTime()
    );

  const getThreadMessages = (otherUserId: string): Message[] => {
    return (userMessages as Message[])
      .filter(
        (m) =>
          (m.senderId === user.id && m.receiverId === otherUserId) ||
          (m.senderId === otherUserId && m.receiverId === user.id)
      )
      .sort((a, b) =>
        new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
      );
  };

  const markReadMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["messages", user.id] });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to update message",
        description: getSupabaseErrorMessage(err),
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (payload: { receiverId: string; content: string }) => {
      const { error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: payload.receiverId,
          subject: null,
          content: payload.content,
        });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["messages", user.id] });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to send message",
        description: getSupabaseErrorMessage(err),
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (content: string) => {
    if (!selectedConversation?.otherUser?.id) return;
    sendMessageMutation.mutate({ receiverId: selectedConversation.otherUser.id, content });
  };

  return (
    <DashboardLayout
      title="Messages"
      breadcrumbs={[
        { label: "Manager", href: "/manager" },
        { label: "Messages" },
      ]}
    >
      <div className="flex h-[calc(100vh-12rem)] gap-4">
        <div className="flex w-80 flex-col rounded-lg border bg-card">
          <div className="border-b p-4">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="font-semibold">Messages</h2>
              <Button variant="ghost" size="icon" data-testid="button-new-message">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-messages"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No conversations found
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => {
                  const initials = conv.otherUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase();
                  const isSelected = selectedConversation?.otherUser.id === conv.otherUser.id;

                  return (
                    <button
                      key={conv.otherUser.id}
                      className={cn(
                        "flex w-full items-start gap-3 p-4 text-left hover-elevate",
                        isSelected && "bg-accent"
                      )}
                      onClick={() => {
                        setSelectedConversation(conv);
                        const unreadIds = (userMessages as Message[])
                          .filter((m) => {
                            const otherId = m.senderId === user.id ? m.receiverId : m.senderId;
                            return (
                              otherId === conv.otherUser.id &&
                              m.receiverId === user.id &&
                              !m.isRead
                            );
                          })
                          .map((m) => m.id);
                        if (unreadIds.length > 0) markReadMutation.mutate(unreadIds);
                      }}
                      data-testid={`conversation-${conv.otherUser.id}`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{conv.otherUser.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {format(new Date(conv.lastMessage.createdAt!), "MMM d")}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {conv.lastMessage.content}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <Badge variant="default" className="shrink-0">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex-1">
          {selectedConversation ? (
            <MessageThread
              messages={getThreadMessages(selectedConversation.otherUser.id)}
              currentUserId={user.id}
              otherUser={selectedConversation.otherUser}
              onSendMessage={handleSendMessage}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border bg-card">
              <EmptyState
                icon={MessageSquare}
                title="No conversation selected"
                description="Select a conversation from the list to view messages"
                testId="empty-message-thread"
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
