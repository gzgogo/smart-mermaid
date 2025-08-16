"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Copy, Download, MessageSquare, User, Bot } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";

export function ConversationHistory({ 
  conversations, 
  onClear, 
  onExport,
  onMessageClick,
  currentInputText,
  className = ""
}) {
  const scrollAreaRef = useRef(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [conversations]);

  const handleCopyMessage = async (text, index) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedIndex(index);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopiedIndex(null), 2000);
    } else {
      toast.error("复制失败");
    }
  };

  const handleExportConversation = () => {
    if (conversations.length === 0) {
      toast.error("没有对话记录可导出");
      return;
    }
    onExport();
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <h3 className="text-sm font-medium">对话历史</h3>
          <span className="text-xs text-muted-foreground">
            ({conversations.length}条)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportConversation}
            disabled={conversations.length === 0}
            className="h-8 w-8 p-0"
            title="导出对话"
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={conversations.length === 0}
            className="h-8 w-8 p-0"
            title="清空对话"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="p-4 space-y-4">
            {conversations.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>暂无对话记录</p>
                <p className="text-xs mt-1">开始输入内容生成图表</p>
              </div>
            ) : (
              conversations.map((conversation, index) => (
                <div key={conversation.id} className="space-y-3">
                  {/* 用户消息 */}
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-blue-600">用户</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(conversation.timestamp)}
                        </span>
                      </div>
                      <div 
                        className="bg-blue-50 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors group relative"
                        onClick={() => onMessageClick?.(conversation.userMessage)}
                      >
                        <p className="text-sm text-blue-900 whitespace-pre-wrap break-words">
                          {conversation.userMessage}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyMessage(conversation.userMessage, `user-${index}`);
                          }}
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* AI回复 */}
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-3 w-3 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-green-600">AI助手</span>
                        <span className="text-xs text-muted-foreground">
                          图表类型: {conversation.diagramType === 'auto' ? '自动识别' : conversation.diagramType}
                        </span>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 group relative">
                        <div className="text-xs text-green-700 mb-2 font-mono">
                          生成的Mermaid代码：
                        </div>
                        <pre className="text-xs bg-white rounded border p-2 overflow-x-auto whitespace-pre-wrap break-words text-gray-800">
                          {conversation.mermaidCode}
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyMessage(conversation.mermaidCode, `ai-${index}`);
                          }}
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 分隔线 */}
                  {index < conversations.length - 1 && (
                    <hr className="border-gray-200" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
