"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Monitor, FileImage, RotateCcw, Maximize, RotateCw, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Header } from "@/components/header";
import { SettingsDialog } from "@/components/settings-dialog";
import { useSearchParams, useRouter } from "next/navigation";

import { ModelSelector } from "@/components/model-selector";
import { MermaidEditor } from "@/components/mermaid-editor";
import { MermaidRenderer } from "@/components/mermaid-renderer";
import { ChatInterface } from "@/components/chat-interface";

// import { ExcalidrawRenderer } from "@/components/excalidraw-renderer";
import { generateMermaidFromText } from "@/lib/ai-service";
import { isWithinCharLimit } from "@/lib/utils";
import { isPasswordVerified, hasCustomAIConfig, hasUnlimitedAccess } from "@/lib/config-service";
import { autoFixMermaidCode, toggleMermaidDirection } from "@/lib/mermaid-fixer";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import dynamic from "next/dynamic";

const ExcalidrawRenderer = dynamic(() => import("@/components/excalidraw-renderer"), { ssr: false });

const usageLimit = parseInt(process.env.NEXT_PUBLIC_DAILY_USAGE_LIMIT || "50");

// Usage tracking functions
const checkUsageLimit = () => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const usageData = JSON.parse(localStorage.getItem('usageData') || '{}');
  const todayUsage = usageData[today] || 0;
  return todayUsage < usageLimit; // Return true if within limit
};

const incrementUsage = () => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const usageData = JSON.parse(localStorage.getItem('usageData') || '{}');
  
  if (!usageData[today]) {
    usageData[today] = 0;
  }
  
  usageData[today] += 1;
  localStorage.setItem('usageData', JSON.stringify(usageData));
};

const checkAndIncrementUsage = () => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const usageData = JSON.parse(localStorage.getItem('usageData') || '{}');
  
  if (!usageData[today]) {
    usageData[today] = 0;
  }
  
  if (usageData[today] >= usageLimit) {
    return false; // Limit exceeded
  }
  
  usageData[today] += 1;
  localStorage.setItem('usageData', JSON.stringify(usageData));
  return true; // Within limit
};

const getRemainingUsage = () => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const usageData = JSON.parse(localStorage.getItem('usageData') || '{}');
  const todayUsage = usageData[today] || 0;
  return Math.max(0, usageLimit - todayUsage);
};



export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [mermaidCode, setMermaidCode] = useState("");
  const [diagramType, setDiagramType] = useState("auto");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [remainingUsage, setRemainingUsage] = useState(5);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [hasCustomConfig, setHasCustomConfig] = useState(false);
  
  // 渲染模式状态
  const [renderMode, setRenderMode] = useState("excalidraw"); // "excalidraw" | "mermaid"
  const [isFixing, setIsFixing] = useState(false);

  // 错误状态管理
  const [errorMessage, setErrorMessage] = useState(null);
  const [hasError, setHasError] = useState(false);

  // 连续对话状态管理 - 重新设计
  const [conversations, setConversations] = useState([]); // 对话任务列表
  const [currentConversationId, setCurrentConversationId] = useState(null); // 当前对话ID
  const [currentConversation, setCurrentConversation] = useState(null); // 当前对话详情
  const [conversationContext, setConversationContext] = useState([]); // 对话上下文（包含历史Mermaid代码）

  const [isCreationMode, setIsCreationMode] = useState(false); // 创建模式状态
  const [showLeftPanel, setShowLeftPanel] = useState(true); // 左侧面板显示状态
  
  const maxChars = parseInt(process.env.NEXT_PUBLIC_MAX_CHARS || "20000");
  const maxConversationRounds = parseInt(process.env.NEXT_PUBLIC_MAX_CONVERSATION_ROUNDS || "10");

  useEffect(() => {
    // Update remaining usage count on component mount
    setRemainingUsage(getRemainingUsage());
    // Check password verification status
    setPasswordVerified(isPasswordVerified());
    // Check custom AI config status
    setHasCustomConfig(hasCustomAIConfig());
    
    // 从URL中获取对话ID
    const conversationId = searchParams.get('id');
    // Load conversation history from localStorage
    loadConversationHistory(conversationId);
  }, [searchParams]);

  // 加载对话历史
  const loadConversationHistory = (targetId = null) => {
    try {
      const savedConversations = localStorage.getItem('chartConversations');
      if (savedConversations) {
        const parsed = JSON.parse(savedConversations);
        setConversations(parsed);
        
        // 如果没有指定targetId，并且当前是创建模式，不要自动选择对话
        if (!targetId && window.location.pathname === '/') {
          setIsCreationMode(true);
          return;
        }
        
        if (parsed.length > 0) {
          let targetConversation;
          
          if (targetId) {
            // 如果指定了对话ID，查找对应的对话
            targetConversation = parsed.find(c => c.id === targetId);
            if (!targetConversation) {
              // 如果找不到指定的对话，显示最新的对话
              targetConversation = parsed[parsed.length - 1];
              // 更新URL为最新对话的ID
              router.replace(`?id=${targetConversation.id}`);
            }
            
            setCurrentConversationId(targetConversation.id);
            setCurrentConversation(targetConversation);
            updateConversationContext(targetConversation);
            setIsCreationMode(false);
            
            // 显示对话的最新Mermaid代码
            if (targetConversation.messages && targetConversation.messages.length > 0) {
              const lastMessage = targetConversation.messages[targetConversation.messages.length - 1];
              setMermaidCode(lastMessage.mermaidCode);
            }
          }
        } else {
          // 如果没有任何对话，进入创建模式
          router.replace('/');
          setIsCreationMode(true);
        }
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      router.replace('/');
      setIsCreationMode(true);
    }
  };

  // 保存对话历史
  const saveConversationHistory = (newConversations) => {
    try {
      localStorage.setItem('chartConversations', JSON.stringify(newConversations));
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  };

  // 更新对话上下文
  const updateConversationContext = (conversation) => {
    if (!conversation || !conversation.messages) {
      setConversationContext([]);
      return;
    }

    // 构建对话上下文，包含历史Mermaid代码
    const contextMessages = conversation.messages.flatMap(msg => [
      { role: "user", content: msg.userMessage },
      { role: "assistant", content: `Mermaid代码：\n${msg.mermaidCode}` }
    ]);
    
    // 保留最近5轮对话的上下文
    setConversationContext(contextMessages.slice(-10));
  };

  // 创建新对话
  // 创建对话 - 进入创建模式
  const handleCreateConversation = () => {
    // 清空当前对话
    setCurrentConversationId(null);
    setCurrentConversation(null);
    setConversationContext([]);
    
    // 清空图表代码，避免显示历史图表
    setMermaidCode("");
    
    // 进入创建模式
    setIsCreationMode(true);
    
    // 清除URL中的对话ID
    router.replace('/');
  };

  // 选择对话
  const handleSelectConversation = (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversationId(conversationId);
      setCurrentConversation(conversation);
      updateConversationContext(conversation);
      
      // 显示该对话的最新Mermaid代码
      if (conversation.messages && conversation.messages.length > 0) {
        const lastMessage = conversation.messages[conversation.messages.length - 1];
        setMermaidCode(lastMessage.mermaidCode);
      } else {
        setMermaidCode("");
      }
      
      // 退出创建模式
      setIsCreationMode(false);
      
      // 更新URL
      router.replace(`?id=${conversationId}`);
    }
  };

  // 删除对话
  const handleDeleteConversation = (conversationId) => {
    const updatedConversations = conversations.filter(c => c.id !== conversationId);
    setConversations(updatedConversations);
    saveConversationHistory(updatedConversations);
    
    if (currentConversationId === conversationId) {
      if (updatedConversations.length > 0) {
        // 选择第一个可用的对话
        const firstConversation = updatedConversations[0];
        handleSelectConversation(firstConversation.id);
      } else {
        // 没有对话了，清空状态
        setCurrentConversationId(null);
        setCurrentConversation(null);
        setConversationContext([]);
        setMermaidCode("");
      }
    }
    
    toast.success("对话已删除");
  };

  // 生成对话标题
  const generateConversationTitle = (content) => {
    const words = content.trim().split(/\s+/);
    const title = words.slice(0, 8).join(' ');
    return title.length > 30 ? title.substring(0, 30) + '...' : title;
  };

  // 从创建模式生成图表
  const handleGenerateFromCreation = async (inputText) => {
    // 创建新对话
    const newConversation = {
      id: Date.now().toString(),
      title: generateConversationTitle(inputText),
      createdAt: new Date().toISOString(),
      messages: []
    };

    // 更新对话列表
    const updatedConversations = [newConversation, ...conversations];
    setConversations(updatedConversations);
    setCurrentConversationId(newConversation.id);
    setCurrentConversation(newConversation);
    
    // 保存到本地存储
    saveConversationHistory(updatedConversations);
    
    // 切换到对话模式
    setIsCreationMode(false);
    
    // 直接在这里生成图表，避免状态更新时序问题
    await handleSendMessageWithConversation(inputText, newConversation, updatedConversations);
  };

  // 发送消息 - 带对话参数的版本，用于创建模式
  const handleSendMessageWithConversation = async (message, targetConversation, targetConversations) => {
    // 检查对话轮数限制
    const currentRounds = targetConversation?.messages?.length || 0;
    if (currentRounds >= maxConversationRounds) {
      toast.error(`每个对话最多支持${maxConversationRounds}轮，请创建新对话继续`);
      return;
    }

    // 检查使用限制
    const hasUnlimited = hasUnlimitedAccess();
    if (!hasUnlimited && !checkUsageLimit()) {
      setShowLimitDialog(true);
      return;
    }

    // 立即创建并显示用户消息（带有加载状态的Mermaid代码）
    const tempMessage = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      userMessage: message,
      mermaidCode: "", // 暂时为空，等待生成
      isGenerating: true // 标记正在生成
    };

    // 立即更新UI显示用户消息
    const tempUpdatedConversation = {
      ...targetConversation,
      messages: [...(targetConversation.messages || []), tempMessage]
    };

    const tempUpdatedConversations = targetConversations.map(c => 
      c.id === targetConversation.id ? tempUpdatedConversation : c
    );

    setConversations(tempUpdatedConversations);
    setCurrentConversation(tempUpdatedConversation);
    setIsGenerating(true);
    setIsStreaming(true);
    setStreamingContent("");

    try {
      // 构建对话上下文
      const contextMessages = targetConversation.messages?.flatMap(msg => [
        { role: "user", content: msg.userMessage },
        { role: "assistant", content: `Mermaid代码：\n${msg.mermaidCode}` }
      ]) || [];

      const { mermaidCode: generatedCode, error } = await generateMermaidFromText(
        message,
        diagramType,
        handleStreamChunk,
        contextMessages.slice(-10) // 保留最近5轮对话的上下文
      );

      if (error) {
        // 如果生成失败，移除临时消息
        setConversations(targetConversations);
        setCurrentConversation(targetConversation);
        toast.error(error);
        return;
      }

      if (!generatedCode) {
        // 如果生成失败，移除临时消息
        setConversations(targetConversations);
        setCurrentConversation(targetConversation);
        toast.error("生成图表失败，请重试");
        return;
      }

      // 更新消息，添加生成的代码
      const finalMessage = {
        ...tempMessage,
        mermaidCode: generatedCode,
        isGenerating: false // 标记生成完成
      };

      // 最终更新对话
      const finalUpdatedConversation = {
        ...targetConversation,
        messages: [...(targetConversation.messages || []), finalMessage]
      };

      const finalUpdatedConversations = targetConversations.map(c => 
        c.id === targetConversation.id ? finalUpdatedConversation : c
      );

      setConversations(finalUpdatedConversations);
      setCurrentConversation(finalUpdatedConversation);
      setMermaidCode(generatedCode);
      
      // 更新上下文
      updateConversationContext(finalUpdatedConversation);
      
      saveConversationHistory(finalUpdatedConversations);

      // 增加使用量
      if (!hasUnlimited) {
        incrementUsage();
        setRemainingUsage(getRemainingUsage());
      }

      toast.success("图表已生成");
    } catch (error) {
      console.error("Generation error:", error);
      // 如果生成失败，移除临时消息
      setConversations(targetConversations);
      setCurrentConversation(targetConversation);
      toast.error("生成图表时发生错误");
    } finally {
      setIsGenerating(false);
      setIsStreaming(false);
    }
  };

  // 发送消息
  const handleSendMessage = async (message) => {
    if (!currentConversation) {
      toast.error("请先创建或选择一个对话");
      return;
    }

    // 使用现有对话和状态
    await handleSendMessageWithConversation(message, currentConversation, conversations);
  };

  const handleDiagramTypeChange = (type) => {
    setDiagramType(type);
  };

  const handleMermaidCodeChange = (code) => {
    setMermaidCode(code);
  };

  const handleStreamChunk = (chunk) => {
    setStreamingContent(prev => prev + chunk);
  };

  const handleSettingsClick = () => {
    setShowSettingsDialog(true);
  };

  const handleContactClick = () => {
    setShowContactDialog(true);
  };

  const handlePasswordVerified = (verified) => {
    setPasswordVerified(verified);
  };

  const handleConfigUpdated = () => {
    // 重新检查自定义配置状态
    setHasCustomConfig(hasCustomAIConfig());
  };

  // 处理错误状态变化
  const handleErrorChange = (error, hasErr) => {
    setErrorMessage(error);
    setHasError(hasErr);
  };

  // 切换渲染模式
  const toggleRenderMode = () => {
    setRenderMode(prev => prev === "excalidraw" ? "mermaid" : "excalidraw");
  };

  // 使用useCallback优化ModelSelector的回调
  const handleModelChange = useCallback((modelId) => {
    console.log('Selected model:', modelId);
  }, []);

  // 切换左侧面板显示/隐藏
  const toggleLeftPanel = () => {
    setShowLeftPanel(prev => !prev);
  };

  // 自动修复Mermaid代码
  const handleAutoFixMermaid = async () => {
    if (!mermaidCode) {
      toast.error("没有代码可以修复");
      return;
    }

    setIsFixing(true);
    setStreamingContent(""); // 清空流式内容，准备显示修复内容

    try {
      // 流式修复回调函数
      const handleFixChunk = (chunk) => {
        setStreamingContent(prev => prev + chunk);
      };

      // 传递错误信息给AI修复函数
      const result = await autoFixMermaidCode(mermaidCode, errorMessage, handleFixChunk);

      if (result.error) {
        toast.error(result.error);
        // 如果有基础修复的代码，仍然应用它
        if (result.fixedCode !== mermaidCode) {
          setMermaidCode(result.fixedCode);
          toast.info("已应用基础修复");
        }
      } else {
        if (result.fixedCode !== mermaidCode) {
          setMermaidCode(result.fixedCode);
          toast.success("AI修复完成");
        } else {
          toast.info("代码看起来没有问题");
        }
      }
    } catch (error) {
      console.error("修复失败:", error);
      toast.error("修复失败，请稍后重试");
    } finally {
      setIsFixing(false);
      // 修复完成后清空流式内容
      setTimeout(() => {
        setStreamingContent("");
      }, 1000);
    }
  };

  // 切换图表方向
  const handleToggleMermaidDirection = () => {
    if (!mermaidCode) {
      toast.error("没有代码可以切换方向");
      return;
    }

    const toggledCode = toggleMermaidDirection(mermaidCode);
    if (toggledCode !== mermaidCode) {
      setMermaidCode(toggledCode);
      toast.success("图表方向已切换");
    } else {
      toast.info("未检测到可切换的方向");
    }
  };



  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header 
        remainingUsage={remainingUsage}
        usageLimit={usageLimit}
        onSettingsClick={handleSettingsClick}
        onContactClick={handleContactClick}
        isPasswordVerified={passwordVerified}
        hasCustomConfig={hasCustomConfig}
      />
      
      <main className="flex-1 overflow-hidden">
        <div className="h-full p-4 md:p-6">
          <div className="h-full flex gap-4 md:gap-6">
            {/* 左侧对话面板 */}
            {showLeftPanel && (
              <div className="w-full md:w-[640px] lg:w-[780px] flex flex-col h-full overflow-hidden">
                <ChatInterface
                  currentConversation={currentConversation}
                  onSendMessage={handleSendMessage}
                  onCreateConversation={handleCreateConversation}

                  conversations={conversations}
                  currentConversationId={currentConversationId}
                  onSelectConversation={handleSelectConversation}
                  onDeleteConversation={handleDeleteConversation}
                  isGenerating={isGenerating}
                        streamingContent={streamingContent}
                        isStreaming={isStreaming}
                  conversationsCount={conversations.length}
                  maxConversationRounds={maxConversationRounds}
                  mermaidCode={mermaidCode}
                  onAutoFixMermaid={handleAutoFixMermaid}
                  onMermaidCodeChange={handleMermaidCodeChange}
                  isFixing={isFixing}
                  diagramType={diagramType}
                  onDiagramTypeChange={handleDiagramTypeChange}
                  isCreationMode={isCreationMode}
                  onGenerateFromCreation={handleGenerateFromCreation}
                />
              </div>
            )}
            
            {/* 右侧图表显示面板 */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* 控制按钮栏 - 固定高度 */}
              <div className="h-12 flex justify-between items-center flex-shrink-0 mb-4">
                <div className="flex items-center gap-2">
                  {/* 面板切换按钮 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleLeftPanel}
                    className="h-9"
                    title={showLeftPanel ? "隐藏左侧面板" : "显示左侧面板"}
                  >
                    {showLeftPanel ? (
                      <PanelLeftClose className="h-4 w-4" />
                    ) : (
                      <PanelLeftOpen className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline ml-2">
                      {showLeftPanel ? "隐藏面板" : "显示面板"}
                    </span>
                  </Button>
                  <ModelSelector onModelChange={handleModelChange} />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleMermaidDirection}
                    disabled={!mermaidCode}
                    className="h-9"
                    title="切换图表方向 (横向/纵向)"
                  >
                    <RotateCw className="h-4 w-4" />
                    <span className="hidden lg:inline ml-2">切换方向</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleRenderMode}
                    className="h-9"
                  >
                    {renderMode === "excalidraw" ? (
                      <>
                        <FileImage className="h-4 w-4" />
                        <span className="hidden sm:inline ml-2">Mermaid</span>
                      </>
                    ) : (
                      <>
                        <Monitor className="h-4 w-4" />
                        <span className="hidden sm:inline ml-2">Excalidraw</span>
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('resetView'));
                    }}
                    className="h-9"
                    title="重置视图"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('toggleFullscreen'));
                    }}
                    className="h-9"
                    title="全屏显示"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 图表渲染区域 */}
              <div className="flex-1 min-h-0 relative">
                {(!mermaidCode && isStreaming) ? (
                  /* 加载状态 */
                  <div className="h-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span className="text-sm text-gray-600">正在生成图表...</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-3">AI正在分析您的描述并生成相应的图表代码</p>
                    </div>
                  </div>
                ) : !mermaidCode && renderMode !== "excalidraw" ? (
                  /* 空状态 - 仅在 Mermaid 模式下显示 */
                  <div className="h-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="text-center text-gray-500">
                      <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">图表将在这里显示</p>
                      <p className="text-xs mt-1">描述您想要创建的图表，AI将为您生成可视化内容</p>
                    </div>
                  </div>
                ) : (
                  /* 正常渲染 */
                  renderMode === "excalidraw" ? (
                    <ExcalidrawRenderer
                      mermaidCode={mermaidCode}
                      onErrorChange={handleErrorChange}
                    />
                  ) : (
                    <MermaidRenderer
                      mermaidCode={mermaidCode}
                      onChange={handleMermaidCodeChange}
                      onErrorChange={handleErrorChange}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="h-12 border-t flex items-center justify-center flex-shrink-0">
        <div className="text-center text-sm text-muted-foreground">
          AI 驱动的智能图表生成应用 &copy; {new Date().getFullYear()}
        </div>
      </footer>

      {/* Settings Dialog */}
      <SettingsDialog 
        open={showSettingsDialog} 
        onOpenChange={setShowSettingsDialog}
        onPasswordVerified={handlePasswordVerified}
        onConfigUpdated={handleConfigUpdated}
      />

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>联系作者</DialogTitle>
            <DialogDescription>
              <div className="py-4">
                <p className="mb-2">如需更多使用次数或技术支持，请扫描下方二维码联系作者（注明目的）</p>
                <div className="flex justify-center my-4">
                  <img src="/qrcode.png" alt="联系二维码" className="w-48" />
                </div>
                <p className="text-sm text-muted-foreground">
                  提示：您也可以在设置中配置自己的AI服务密钥，即可享有无限使用权限
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button variant="secondary" onClick={() => setShowContactDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage Limit Dialog */}
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>使用次数已达上限</DialogTitle>
            <DialogDescription>
              <div className="py-4">
                <p className="mb-2">您今日的使用次数已达上限 ({usageLimit}次/天)</p>
                <p className="mb-4">如需更多使用次数，您可以：</p>
                <ul className="list-disc list-inside space-y-2 text-sm mb-4">
                  <li>扫描下方二维码联系作者（注明目的）</li>
                  <li>在设置中配置您自己的AI服务密钥</li>
                </ul>
                <div className="flex justify-center my-4">
                  <img src="/qrcode.png" alt="联系二维码" className="w-48" />
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button variant="secondary" onClick={() => setShowLimitDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 对话历史弹出面板 */}

    </div>
  );
}
