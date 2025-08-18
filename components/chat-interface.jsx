"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Code2, Copy, Expand, Minimize2, History, Plus, Wand2, Move } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";
import { DiagramTypeSelector } from "@/components/diagram-type-selector";
import { TextInput } from "@/components/text-input";
import { FileUpload } from "@/components/file-upload";
import { ConversationHistory } from "@/components/conversation-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ChatInterface({ 
  currentConversation,
  onSendMessage,
  isGenerating,
  streamingContent,
  isStreaming,
  onCreateConversation,
  conversations = [],
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  conversationsCount = 0,
  maxConversationRounds = 10,
  mermaidCode = "",
  onAutoFixMermaid,
  onMermaidCodeChange,
  isFixing = false,
  diagramType = "flowchart",
  onDiagramTypeChange,
  isCreationMode = false,
  onGenerateFromCreation,
  className = ""
}) {
  const [inputMessage, setInputMessage] = useState("");
  const scrollAreaRef = useRef(null);
  const textareaRef = useRef(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
  
  // 代码卡片的位置和尺寸状态 - 恢复右上角默认位置
  const [codeCardPosition, setCodeCardPosition] = useState({ x: 0, y: 0 });
  const [codeCardSize, setCodeCardSize] = useState({ width: 256, height: 384 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  // 使用 ref 存储实时位置和尺寸，避免状态更新导致的延迟
  const positionRef = useRef({ x: 0, y: 0 });
  const sizeRef = useRef({ width: 256, height: 384 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  // 引用代码卡片DOM元素，用于直接操作
  const codeCardRef = useRef(null);
  
  // 使用 ref 存储状态，避免 useCallback 依赖问题
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);

  // 初始化右上角位置（仅在客户端）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const defaultPosition = { x: window.innerWidth - 272, y: 0 };
      setCodeCardPosition(defaultPosition);
      positionRef.current = defaultPosition;
    }
  }, []);

  // 从 localStorage 加载保存的位置和尺寸
  useEffect(() => {
    const savedPosition = localStorage.getItem('codeCardPosition');
    const savedSize = localStorage.getItem('codeCardSize');
    
    if (savedPosition) {
      try {
        const position = JSON.parse(savedPosition);
        setCodeCardPosition(position);
        positionRef.current = position;
      } catch (e) {
        console.warn('Failed to parse saved position:', e);
      }
    }
    
    if (savedSize) {
      try {
        const size = JSON.parse(savedSize);
        setCodeCardSize(size);
        sizeRef.current = size;
      } catch (e) {
        console.warn('Failed to parse saved size:', e);
      }
    }
  }, []);

  // 保存位置和尺寸到 localStorage（延迟保存，避免频繁写入）
  const saveCodeCardState = useCallback((position, size) => {
    // 使用 setTimeout 延迟保存，避免拖动过程中频繁写入
    setTimeout(() => {
      try {
        localStorage.setItem('codeCardPosition', JSON.stringify(position));
        localStorage.setItem('codeCardSize', JSON.stringify(size));
      } catch (e) {
        console.warn('Failed to save code card state:', e);
      }
    }, 100);
  }, []);

  // 处理拖动开始
  const handleDragStart = useCallback((e) => {
    if (e.target.closest('button')) return; // 如果点击的是按钮，不开始拖动
    
    setIsDragging(true);
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y
    };
    e.preventDefault();
  }, []);

  // 处理拖动中 - 使用 ref 避免依赖问题
  const handleDragMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    
    // 限制在视窗范围内
    const maxX = (typeof window !== 'undefined' ? window.innerWidth : 1200) - sizeRef.current.width - 16;
    const maxY = (typeof window !== 'undefined' ? window.innerHeight : 800) - sizeRef.current.height - 16;
    
    const clampedX = Math.max(16, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));
    
    // 直接更新位置，确保实时响应
    positionRef.current = { x: clampedX, y: clampedY };
    setCodeCardPosition({ x: clampedX, y: clampedY });
  }, []); // 无依赖

  // 处理拖动结束
  const handleDragEnd = useCallback(() => {
    if (isDraggingRef.current) {
      setIsDragging(false);
      isDraggingRef.current = false;
      saveCodeCardState(positionRef.current, sizeRef.current);
    }
  }, [saveCodeCardState]);

  // 处理缩放开始
  const handleResizeStart = useCallback((e, direction) => {
    setIsResizing(true);
    isResizingRef.current = true;
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: sizeRef.current.width,
      height: sizeRef.current.height
    };
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // 处理缩放中 - 使用 ref 避免依赖问题
  const handleResizeMove = useCallback((e) => {
    if (!isResizingRef.current || !codeCardRef.current) return;
    
    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaY = e.clientY - resizeStartRef.current.y;
    
    let newWidth = resizeStartRef.current.width + deltaX;
    let newHeight = resizeStartRef.current.height + deltaY;
    
    // 限制最小和最大尺寸
    newWidth = Math.max(200, Math.min(newWidth, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 32));
    newHeight = Math.max(200, Math.min(newHeight, (typeof window !== 'undefined' ? window.innerHeight : 800) - 100));
    
    // 直接操作DOM，绕过React状态更新，确保实时响应
    const cardElement = codeCardRef.current;
    cardElement.style.width = `${newWidth}px`;
    cardElement.style.height = `${newHeight}px`;
    
    // 同时更新ref，用于后续计算
    sizeRef.current = { width: newWidth, height: newHeight };
  }, []); // 无依赖

  // 处理缩放结束
  const handleResizeEnd = useCallback(() => {
    if (isResizingRef.current) {
      setIsResizing(false);
      isResizingRef.current = false;
      // 缩放结束后，同步React状态
      setCodeCardSize(sizeRef.current);
      saveCodeCardState(positionRef.current, sizeRef.current);
    }
  }, [saveCodeCardState]);

  // 添加全局鼠标事件监听器 - 使用稳定的函数引用
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingRef.current) {
        handleDragMove(e);
      } else if (isResizingRef.current) {
        handleResizeMove(e);
      }
    };
    
    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        handleDragEnd();
      } else if (isResizingRef.current) {
        handleResizeEnd();
      }
    };
    
    // 始终绑定事件监听器，避免重复绑定
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleDragMove, handleDragEnd, handleResizeMove, handleResizeEnd]); // 依赖稳定的函数引用

  // 自动滚动到底部
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [currentConversation?.messages, streamingContent]);

  // 自动调整输入框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputMessage]);

  const handleSend = () => {
    if (!inputMessage.trim() || isGenerating) return;
    
    // 检查对话轮数限制
    const currentRounds = currentConversation?.messages?.length || 0;
    if (currentConversation && currentRounds >= maxConversationRounds) {
      toast.error(`每个对话最多支持${maxConversationRounds}轮，请创建新对话继续`);
      return;
    }
    
    // 如果没有当前对话，创建新对话
    if (!currentConversation && onCreateConversation) {
      onCreateConversation(inputMessage.trim());
    } else {
      onSendMessage(inputMessage.trim());
    }
    setInputMessage("");
    // 发送消息后自动展开代码框
    setIsCodeExpanded(true);
  };

  // 当从创建模式切换到对话模式且开始生成时，自动展开代码框
  useEffect(() => {
    if (!isCreationMode && isStreaming) {
      setIsCodeExpanded(true);
    }
  }, [isCreationMode, isStreaming]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyCode = async (code, index) => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopiedIndex(index);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopiedIndex(null), 2000);
    } else {
      toast.error("复制失败");
    }
  };

  const handleCopyCurrentCode = async () => {
    const codeToUse = isStreaming ? streamingContent : mermaidCode;
    const success = await copyToClipboard(codeToUse);
    if (success) {
      toast.success("代码已复制到剪贴板");
    } else {
      toast.error("复制失败");
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      {/* 标题栏 - 仅在对话模式显示 */}
      {!isCreationMode && (
        <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50/50">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">
              {currentConversation?.title || "图表对话助手"}
            </h3>
            {currentConversation && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                (currentConversation.messages?.length || 0) >= maxConversationRounds 
                  ? "bg-red-100 text-red-600"
                  : (currentConversation.messages?.length || 0) >= maxConversationRounds * 0.8
                    ? "bg-orange-100 text-orange-600"
                    : "bg-gray-100 text-gray-600"
              }`}>
                {currentConversation.messages?.length || 0}/{maxConversationRounds}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ConversationHistory
              conversations={conversations}
              currentConversationId={currentConversationId}
              onSelectConversation={onSelectConversation}
              onDeleteConversation={onDeleteConversation}
              buttonClassName="h-8"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateConversation}
              className="h-8"
              title="新建对话"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline ml-2">新建</span>
            </Button>
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <CardContent className="flex-1 p-0 overflow-hidden relative">
        {/* 历史对话按钮 - 仅在创建模式的左上角浮动 */}
        {isCreationMode && (
          <div className="absolute top-4 left-4 z-20">
            <ConversationHistory
              conversations={conversations}
              currentConversationId={currentConversationId}
              onSelectConversation={onSelectConversation}
              onDeleteConversation={onDeleteConversation}
              buttonClassName="h-8 bg-white shadow-sm"
            />
          </div>
        )}
        {isCreationMode ? (
          /* 创建模式 - 显示手动输入和文件上传 */
          <div className="h-full flex items-center justify-center p-6">
            <div className="w-full max-w-4xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-3 text-gray-800" style={{ fontFamily: '"FangZheng-XiaoWangZi", cursive, "PingFang SC", "Microsoft YaHei", sans-serif' }}>
                  让内容一目了然
                </h2>
                <p className="text-gray-600">智能解析您的描述，生成专业的可视化图表</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <Tabs defaultValue="manual" className="w-full">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <TabsList className="grid w-64 grid-cols-2">
                      <TabsTrigger value="manual">手动输入</TabsTrigger>
                      <TabsTrigger value="upload">文件上传</TabsTrigger>
                    </TabsList>
                    
                    <DiagramTypeSelector 
                      value={diagramType} 
                      onChange={onDiagramTypeChange}
                    />
                  </div>
                  
                  <div className="p-6">
                    <TabsContent value="manual" className="mt-0">
                      <div className="h-80">
                        <TextInput
                          onGenerate={onGenerateFromCreation}
                          isGenerating={isGenerating}
                          diagramType={diagramType}
                          onDiagramTypeChange={onDiagramTypeChange}
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="upload" className="mt-0">
                      <div className="h-80">
                        <FileUpload
                          onGenerate={onGenerateFromCreation}
                          isGenerating={isGenerating}
                          diagramType={diagramType}
                          onDiagramTypeChange={onDiagramTypeChange}
                        />
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        ) : (
          /* 对话模式 - 显示消息列表和浮动代码框 */
          <>
            {/* 浮动代码框 */}
            {(mermaidCode || streamingContent || isStreaming) && (
              <div 
                ref={codeCardRef}
                className={`absolute z-10 ${
                  isCodeExpanded ? "inset-4 bottom-24" : ""
                }`}
                style={!isCodeExpanded ? {
                  left: `${codeCardPosition.x}px`,
                  top: `${codeCardPosition.y}px`,
                  width: `${codeCardSize.width}px`,
                  height: `${codeCardSize.height}px`
                } : {}}
              >
                <Card className="border-2 border-gray-200 shadow-lg bg-white h-full p-0">
                  {!isCodeExpanded ? (
                    // 缩小版 - 可拖动和缩放
                    <div className="h-full flex flex-col">
                      <div 
                        className="flex items-center justify-between p-1 bg-gray-50 border-b rounded-t-xl cursor-move select-none"
                        onMouseDown={handleDragStart}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                      >
                        <div className="flex items-center gap-1">
                          <Move className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">拖动移动</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={onAutoFixMermaid}
                            disabled={!mermaidCode || isFixing || isStreaming}
                            className="h-6 w-6 p-0"
                            title="AI修复代码"
                          >
                            {isFixing ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-600"></div>
                            ) : (
                              <Wand2 className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyCurrentCode}
                            className="h-6 w-6 p-0"
                            title="复制代码"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsCodeExpanded(true)}
                            className="h-6 w-6 p-0"
                            title="展开"
                          >
                            <Expand className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-hidden relative">
                        <Textarea
                          value={isStreaming ? (streamingContent || "正在生成图表代码...") : mermaidCode}
                          onChange={(e) => onMermaidCodeChange && onMermaidCodeChange(e.target.value)}
                          className="text-xs bg-white rounded-b-xl border-0 p-2 h-full resize-none font-mono text-gray-800 !outline-none !ring-0 !border-0 focus:!outline-none focus:!ring-0 focus:!border-0"
                          disabled={isStreaming}
                          placeholder={isStreaming ? "正在生成图表代码..." : "Mermaid代码将在这里显示..."}
                        />
                        
                        {/* 缩放手柄 */}
                        <div 
                          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                          onMouseDown={(e) => handleResizeStart(e, 'se')}
                          style={{
                            background: 'linear-gradient(135deg, transparent 0%, transparent 50%, #9ca3af 50%, #9ca3af 100%)'
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    // 展开版 - 全屏显示
                    <div className="h-full flex flex-col">
                      <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
                        <div className="flex items-center gap-2">
                          <Code2 className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">
                            {isStreaming ? "正在生成..." : "当前图表代码"}
                          </span>
                          {isStreaming && (
                            <div className="flex items-center gap-1">
                              <div className="animate-pulse h-2 w-2 rounded-full bg-blue-500"></div>
                              <div className="animate-pulse h-2 w-2 rounded-full bg-blue-500" style={{animationDelay: '0.2s'}}></div>
                              <div className="animate-pulse h-2 w-2 rounded-full bg-blue-500" style={{animationDelay: '0.4s'}}></div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={onAutoFixMermaid}
                            disabled={!mermaidCode || isFixing || isStreaming}
                            className="h-6 w-6 p-0"
                            title="AI修复代码"
                          >
                            {isFixing ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-600"></div>
                            ) : (
                              <Wand2 className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyCurrentCode}
                            className="h-6 w-6 p-0"
                            title="复制代码"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsCodeExpanded(false)}
                            className="h-6 w-6 p-0"
                            title="收起"
                          >
                            <Minimize2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1 p-2 overflow-hidden">
                        <Textarea
                          value={isStreaming ? (streamingContent || "正在生成图表代码...") : mermaidCode}
                          onChange={(e) => onMermaidCodeChange && onMermaidCodeChange(e.target.value)}
                          className="text-xs bg-white rounded border border-gray-200 p-2 h-full resize-none font-mono text-gray-800 !outline-none !ring-0 focus:!outline-none focus:!ring-0 focus:!border-gray-200"
                          disabled={isStreaming}
                          placeholder={isStreaming ? "正在生成图表代码..." : "Mermaid代码将在这里显示..."}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}
            
            <ScrollArea ref={scrollAreaRef} className="h-full">
              <div className="p-4 space-y-4">
                {!currentConversation ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>欢迎使用图表对话助手</p>
                    <p className="text-xs mt-1">请在下方输入框描述您想要创建的图表</p>
                    <p className="text-xs mt-1">或点击左上角按钮显示对话历史</p>
                  </div>
                ) : (!currentConversation?.messages || currentConversation.messages.length === 0) && !isStreaming ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>开始您的图表对话</p>
                    <p className="text-xs mt-1">描述您想要创建或修改的图表</p>
                  </div>
                ) : (
                  <>
                    {currentConversation?.messages?.map((message, index) => (
                      <div key={message.id} className="space-y-3">
                        {/* 只显示用户消息 */}
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-1">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(message.timestamp)}
                              </span>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 min-w-[120px] max-w-[85%] inline-block">
                              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                                {message.userMessage}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>

      {/* ChatGPT风格输入框 - 只在非创建模式下显示 */}
      {!isCreationMode && (
        <div className="p-4">
          <div className="relative bg-gray-100 rounded-xl border border-gray-200 shadow-sm">
            <Textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                currentConversation && (currentConversation.messages?.length || 0) >= maxConversationRounds
                  ? `已达到${maxConversationRounds}轮对话上限，请创建新对话...`
                  : currentConversation 
                    ? "请描述您想要对图表进行的修改..." 
                    : "请描述您想要创建的图表，例如：用户注册流程图..."
              }
              className="border-0 bg-transparent resize-none !min-h-[120px] !max-h-[240px] pr-24 pb-14 !outline-none !ring-0 focus:!outline-none focus:!ring-0 focus:!border-0"
              disabled={isGenerating || (currentConversation && (currentConversation.messages?.length || 0) >= maxConversationRounds)}
            />
            
            {/* 右下角控制区域 */}
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              <DiagramTypeSelector 
                value={diagramType} 
                onChange={onDiagramTypeChange}
                className="h-8"
              />
              <Button
                onClick={handleSend}
                disabled={
                  !inputMessage.trim() || 
                  isGenerating || 
                  (currentConversation && (currentConversation.messages?.length || 0) >= maxConversationRounds)
                }
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
              >
                {isGenerating ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-background"></div>
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
            
            {/* 快捷键提示 */}
            {inputMessage.trim() && (
              <div className="absolute bottom-2 left-3">
                <p className="text-xs text-muted-foreground">
                  按Enter发送，Shift+Enter换行
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}