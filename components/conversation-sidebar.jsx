"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MessageSquare, Trash2, FileText, Upload } from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import { toast } from "sonner";

export function ConversationSidebar({ 
  conversations,
  currentConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  className = ""
}) {
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [initialContent, setInitialContent] = useState("");
  const [selectedTab, setSelectedTab] = useState("manual");

  const handleCreateConversation = () => {
    if (!initialContent.trim()) {
      toast.error("请输入初始内容");
      return;
    }

    onCreateConversation(initialContent.trim());
    setInitialContent("");
    setShowNewConversationDialog(false);
    toast.success("新对话已创建");
  };

  const handleFileTextExtracted = (text) => {
    setInitialContent(text);
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
      return lastMessage.userMessage.substring(0, 50) + (lastMessage.userMessage.length > 50 ? "..." : "");
    }
    return "新建对话";
  };

  return (
    <>
      <Card className={`flex flex-col h-full ${className}`}>
        {/* 标题和新建按钮 */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <h3 className="text-sm font-medium">对话历史</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewConversationDialog(true)}
            className="h-8 w-8 p-0"
            title="新建对话"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* 对话列表 */}
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {conversations.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>暂无对话</p>
                  <p className="text-xs mt-1">点击右上角+创建新对话</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`group p-3 rounded-lg cursor-pointer transition-colors relative ${
                      currentConversationId === conversation.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onSelectConversation(conversation.id)}
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
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* 新建对话对话框 */}
      <Dialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建图表对话</DialogTitle>
            <DialogDescription>
              输入您想要创建的图表的初始描述
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">手动输入</TabsTrigger>
              <TabsTrigger value="file">文件上传</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="mt-4">
              <Textarea
                value={initialContent}
                onChange={(e) => setInitialContent(e.target.value)}
                placeholder="请描述您想要创建的图表，例如：用户注册流程图、公司组织架构图等..."
                className="min-h-[120px]"
              />
            </TabsContent>
            
            <TabsContent value="file" className="mt-4">
              <div className="space-y-4">
                <FileUpload onTextExtracted={handleFileTextExtracted} />
                {initialContent && (
                  <div className="mt-4">
                    <label className="text-sm font-medium">提取的内容预览：</label>
                    <Textarea
                      value={initialContent}
                      onChange={(e) => setInitialContent(e.target.value)}
                      className="mt-2 min-h-[80px]"
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowNewConversationDialog(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateConversation}
              disabled={!initialContent.trim()}
            >
              创建对话
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
