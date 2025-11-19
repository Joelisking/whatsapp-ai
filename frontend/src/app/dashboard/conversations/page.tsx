'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { conversationsAPI } from '@/lib/api';
import { MessageSquare, Send, User, Bot, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

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

  const getStatusColor = (status: string) => {
    const colors: any = {
      ACTIVE: 'bg-green-100 text-green-800',
      WAITING_FOR_AGENT: 'bg-yellow-100 text-yellow-800',
      WITH_AGENT: 'bg-blue-100 text-blue-800',
      RESOLVED: 'bg-gray-100 text-gray-800',
      CLOSED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
          <p className="text-gray-600">Monitor and manage customer conversations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <div className="card h-[600px] overflow-y-auto">
              <h2 className="font-semibold mb-4">Active Conversations</h2>
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedConversation?.id === conversation.id
                        ? 'bg-primary-50 border-primary-200'
                        : 'hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">
                        {conversation.customer.name || conversation.customer.phoneNumber}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(conversation.status)}`}>
                        {conversation.status.replace('_', ' ')}
                      </span>
                    </div>
                    {conversation.messages[0] && (
                      <p className="text-xs text-gray-500 truncate">
                        {conversation.messages[0].content}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
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
              <div className="card h-[600px] flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4" />
                  <p>Select a conversation to view details</p>
                </div>
              </div>
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
        return <User className="w-5 h-5" />;
      case 'AI':
        return <Bot className="w-5 h-5" />;
      case 'AGENT':
        return <UserCircle className="w-5 h-5" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  return (
    <div className="card h-[600px] flex flex-col">
      {/* Header */}
      <div className="border-b pb-4 mb-4">
        <h2 className="font-semibold">
          {conversation.customer.name || conversation.customer.phoneNumber}
        </h2>
        <p className="text-sm text-gray-500">{conversation.customer.phoneNumber}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {conversation.messages?.map((msg: any) => (
          <div
            key={msg.id}
            className={`flex items-start ${
              msg.sender === 'CUSTOMER' ? '' : 'flex-row-reverse'
            }`}
          >
            <div className={`flex-shrink-0 ${msg.sender === 'CUSTOMER' ? 'mr-3' : 'ml-3'}`}>
              <div className={`p-2 rounded-full ${
                msg.sender === 'CUSTOMER' ? 'bg-gray-200' :
                msg.sender === 'AI' ? 'bg-primary-100' :
                'bg-blue-100'
              }`}>
                {getSenderIcon(msg.sender)}
              </div>
            </div>
            <div className={`flex-1 ${msg.sender === 'CUSTOMER' ? 'text-left' : 'text-right'}`}>
              <div
                className={`inline-block p-3 rounded-lg ${
                  msg.sender === 'CUSTOMER'
                    ? 'bg-gray-100'
                    : msg.sender === 'AI'
                    ? 'bg-primary-50'
                    : 'bg-blue-50'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(msg.createdAt), 'HH:mm')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="border-t pt-4">
        <div className="flex space-x-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button
            type="submit"
            disabled={isSending || !message.trim()}
            className="btn btn-primary"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
