"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MessageSquare, Trash2, X, History } from "lucide-react";

export function ConversationHistory({ 
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  buttonVariant = "outline",
  buttonSize = "sm",
  buttonClassName = "",
  showCount = true,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectAndClose = (conversationId) => {
    onSelectConversation(conversationId);
    setIsOpen(false);
  };

  return (
    <>
      {/* 历史对话入口按钮 */}
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={() => setIsOpen(true)}
        className={`${buttonClassName}`}
        title="查看对话历史"
      >
        <History className="h-3 w-3" />
        <span className="hidden sm:inline ml-2">
          历史{showCount && `(${conversations.length})`}
        </span>
      </Button>

      {/* 对话历史弹窗 */}
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* 弹出面板 */}
          <div className="fixed left-4 top-16 bottom-8 w-96 z-50 box-border">
            <Card className="h-full flex flex-col relative bg-white w-full box-border">
              {/* 关闭按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
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
                <div className="h-full overflow-y-auto">
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
                              ? 'bg-gray-100 border border-gray-200'
                              : 'bg-gray-50'
                          }`}
                          onClick={() => handleSelectAndClose(conversation.id)}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900 truncate flex-1 pr-2">
                              {conversation.title}
                            </h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteConversation(conversation.id);
                              }}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              title="删除对话"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}