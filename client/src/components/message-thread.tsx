import { useState } from "react";
import { Send, User } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message, Profile } from "@shared/schema";
import { cn } from "@/lib/utils";

interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
  otherUser: Profile;
  onSendMessage?: (content: string) => void;
}

export function MessageThread({
  messages,
  currentUserId,
  otherUser,
  onSendMessage,
}: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState("");

  const handleSend = () => {
    if (newMessage.trim() && onSendMessage) {
      onSendMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherUserInitials = otherUser.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{otherUserInitials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base" data-testid="text-thread-user">
              {otherUser.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{otherUser.email}</p>
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => {
              const isCurrentUser = message.senderId === currentUserId;
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    isCurrentUser ? "justify-end" : "justify-start"
                  )}
                  data-testid={`message-${message.id}`}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2",
                      isCurrentUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        isCurrentUser
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {format(new Date(message.createdAt!), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[44px] flex-1 resize-none"
            rows={1}
            data-testid="input-message"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            size="icon"
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
