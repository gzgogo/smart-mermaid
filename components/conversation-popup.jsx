"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export function ConversationPopup({ 
  isOpen,
  onClose,
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  className = ""
}) {

  const handleSelectAndClose = (conversationId) => {
    onSelectConversation(conversationId);
    onClose();
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return "昨天";
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
  };

  const getConversationPreview = (conversation) => {
    if (conversation.messages && conversation.messages.length > 0) {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      return lastMessage.userMessage.substring(0, 40) + (lastMessage.userMessage.length > 40 ? "..." : "");
    }
    return "新建对话";
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* 弹出面板 */}
      <div className="fixed left-4 top-16 bottom-8 w-80 z-50">
        <Card className="h-full flex flex-col relative">
          {/* 关闭按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-2 right-2 h-8 w-8 p-0 z-10"
            title="关闭"
          >
            <X className="h-3 w-3" />
          </Button>
          
          {/* 标题栏 */}
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <h3 className="text-sm font-medium">对话历史</h3>
              <span className="text-xs text-muted-foreground">
                ({conversations.length}个)
              </span>
            </div>
          </CardHeader>

          {/* 对话列表 */}
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {conversations.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>暂无对话</p>
                    <p className="text-xs mt-1">在主界面开始新的图表对话</p>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`group p-3 rounded-lg cursor-pointer transition-colors relative hover:bg-gray-50 ${
                        currentConversationId === conversation.id
                          ? 'bg-blue-50 border border-blue-200'
                          : ''
                      }`}
                      onClick={() => handleSelectAndClose(conversation.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {conversation.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {getConversationPreview(conversation)}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {formatDate(conversation.createdAt)}
                            </span>
                            <span className="text-xs text-gray-400">
                              {conversation.messages?.length || 0}条消息
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conversation.id);
                          }}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                          title="删除对话"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
