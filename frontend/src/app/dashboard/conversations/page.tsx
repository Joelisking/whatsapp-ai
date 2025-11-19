'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { conversationsAPI } from '@/lib/api';
import { MessageSquare, Send, User, Bot, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await conversationsAPI.getAll();
      setConversations(response.data.conversations);
    } catch (error) {
      toast.error('Failed to fetch conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const statusMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ACTIVE: 'default',
      WAITING_FOR_AGENT: 'secondary',
      WITH_AGENT: 'default',
      RESOLVED: 'outline',
      CLOSED: 'secondary',
    };
    return statusMap[status] || 'secondary';
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
          <p className="text-muted-foreground">Monitor and manage customer conversations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle>Active Conversations</CardTitle>
                <CardDescription>
                  {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[480px] px-6">
                  <div className="space-y-2 pb-4">
                    {conversations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No conversations yet
                      </div>
                    ) : (
                      conversations.map((conversation) => (
                        <button
                          key={conversation.id}
                          onClick={() => setSelectedConversation(conversation)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedConversation?.id === conversation.id
                              ? 'bg-primary/5 border-primary'
                              : 'hover:bg-accent border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">
                              {conversation.customer.name || conversation.customer.phoneNumber}
                            </span>
                            <Badge variant={getStatusVariant(conversation.status)} className="text-xs">
                              {conversation.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          {conversation.messages[0] && (
                            <p className="text-xs text-muted-foreground truncate">
                              {conversation.messages[0].content}
                            </p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Conversation Detail */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <ConversationDetail
                conversation={selectedConversation}
                onUpdate={() => {
                  fetchConversations();
                  setSelectedConversation(null);
                }}
              />
            ) : (
              <Card className="h-[600px]">
                <CardContent className="h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4" />
                    <p>Select a conversation to view details</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ConversationDetail({ conversation: initialConversation, onUpdate }: any) {
  const [conversation, setConversation] = useState(initialConversation);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const statusMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ACTIVE: 'default',
      WAITING_FOR_AGENT: 'secondary',
      WITH_AGENT: 'default',
      RESOLVED: 'outline',
      CLOSED: 'secondary',
    };
    return statusMap[status] || 'secondary';
  };

  useEffect(() => {
    fetchConversationDetails();
  }, [initialConversation.id]);

  const fetchConversationDetails = async () => {
    try {
      const response = await conversationsAPI.getById(initialConversation.id);
      setConversation(response.data.conversation);
    } catch (error) {
      toast.error('Failed to fetch conversation details');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    try {
      await conversationsAPI.sendMessage(conversation.id, message);
      toast.success('Message sent');
      setMessage('');
      fetchConversationDetails();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const getSenderIcon = (sender: string) => {
    switch (sender) {
      case 'CUSTOMER':
        return <User className="w-4 h-4" />;
      case 'AI':
        return <Bot className="w-4 h-4" />;
      case 'AGENT':
        return <UserCircle className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getSenderBg = (sender: string) => {
    switch (sender) {
      case 'CUSTOMER':
        return 'bg-muted';
      case 'AI':
        return 'bg-primary/10';
      case 'AGENT':
        return 'bg-blue-100';
      default:
        return 'bg-muted';
    }
  };

  const getMessageBg = (sender: string) => {
    switch (sender) {
      case 'CUSTOMER':
        return 'bg-muted';
      case 'AI':
        return 'bg-primary/10';
      case 'AGENT':
        return 'bg-blue-50';
      default:
        return 'bg-muted';
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {conversation.customer.name || conversation.customer.phoneNumber}
            </CardTitle>
            <CardDescription>{conversation.customer.phoneNumber}</CardDescription>
          </div>
          <Badge variant={getStatusVariant(conversation.status)}>
            {conversation.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-6 flex flex-col">
        {/* Messages */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {conversation.messages?.map((msg: any) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.sender === 'CUSTOMER' ? '' : 'flex-row-reverse'
                }`}
              >
                <div className={`flex-shrink-0 p-2 rounded-full ${getSenderBg(msg.sender)}`}>
                  {getSenderIcon(msg.sender)}
                </div>
                <div className={`flex-1 ${msg.sender === 'CUSTOMER' ? 'text-left' : 'text-right'}`}>
                  <div className={`inline-block max-w-[80%] p-3 rounded-lg ${getMessageBg(msg.sender)}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(msg.createdAt), 'HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="border-t pt-4 mt-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isSending || !message.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
