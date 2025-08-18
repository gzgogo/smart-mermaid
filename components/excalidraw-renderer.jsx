"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  ZoomIn, 
  ZoomOut, 
  Minimize,
  Move
} from "lucide-react";
import "@excalidraw/excalidraw/index.css";
import { convertToExcalidrawElements, exportToBlob } from "@excalidraw/excalidraw";

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
  }
);

function ExcalidrawRenderer({ mermaidCode, onErrorChange }) {
  const [excalidrawElements, setExcalidrawElements] = useState([]);
  const [excalidrawFiles, setExcalidrawFiles] = useState({});
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 监听全局事件
  useEffect(() => {
    const handleResetView = () => {
      if (excalidrawAPI) {
        excalidrawAPI.resetScene();
        if (mermaidCode && mermaidCode.trim()) {
          // 重新渲染当前内容
          renderMermaidContent();
        }
      }
    };

    const handleToggleFullscreen = () => {
      setIsFullscreen(prev => !prev);
    };

    window.addEventListener('resetView', handleResetView);
    window.addEventListener('toggleFullscreen', handleToggleFullscreen);

    return () => {
      window.removeEventListener('resetView', handleResetView);
      window.removeEventListener('toggleFullscreen', handleToggleFullscreen);
    };
  }, [excalidrawAPI, mermaidCode]);

  const renderMermaidContent = useCallback(async () => {
    if (!excalidrawAPI || !mermaidCode || mermaidCode.trim() === "") {
      setExcalidrawElements([]);
      setExcalidrawFiles({});
      setRenderError(null);
      if (excalidrawAPI) {
        excalidrawAPI.resetScene();
      }
      return;
    }

    setIsRendering(true);
    setRenderError(null);

    try {
      // 预处理 mermaidCode: 移除 <br> 标签
      const preprocessedCode = mermaidCode.replace(/<br\s*\/?>/gi, '');
      
      // 检查是否为支持的图表类型（白名单）
      const supportedTypes = [
        'flowchart',                 // 流程图
        'graph',                     // 图表（流程图的别名）
        'sequenceDiagram',           // 时序图
        'classDiagram',              // 类图
        'pie',                       // 饼图
        'stateDiagram',              // 状态图
        'stateDiagram-v2'            // 状态图v2
      ];
      
      // 检测图表类型
      const detectDiagramType = (code) => {
        const lines = code.trim().split('\n');
        const firstLine = lines[0]?.trim().toLowerCase() || '';
        
        // 检查是否匹配支持的类型
        for (const type of supportedTypes) {
          if (firstLine.startsWith(type.toLowerCase()) || 
              firstLine === type.toLowerCase()) {
            return type;
          }
        }
        
        // 特殊处理：如果没有明确声明类型但包含flowchart特征，认为是flowchart
        if (firstLine.match(/^(td|lr|bt|rl)\s*$/) || 
            code.includes('-->') || 
            code.includes('---')) {
          return 'flowchart';
        }
        
        return null;
      };
      
      const detectedType = detectDiagramType(preprocessedCode);
      
      if (!detectedType) {
        throw new Error('Excalidraw模式暂不支持此图表类型，请切换到Mermaid模式查看');
      }
      
      const { elements, files } = await parseMermaidToExcalidraw(preprocessedCode);
      
      if (!elements || elements.length === 0) {
        throw new Error('Excalidraw模式暂不支持此图表类型，请切换到Mermaid模式查看');
      }
      
      const convertedElements = convertToExcalidrawElements(elements);
      
      setExcalidrawElements(convertedElements);
      setExcalidrawFiles(files);
      excalidrawAPI.updateScene({
        elements: convertedElements,
      });
      excalidrawAPI.scrollToContent(convertedElements, {
        fitToContent: true,
      });

      // 通知父组件没有错误
      if (onErrorChange) {
        onErrorChange(null, false);
      }
    } catch (error) {
      console.error("Mermaid rendering error:", error);
      
      // 统一所有错误为类型不支持的提示
      const errorMsg = 'Excalidraw模式暂不支持此图表类型，请切换到Mermaid模式查看';
      setRenderError(errorMsg);
      
      toast.error("当前图表类型在Excalidraw模式下不支持，请切换到Mermaid模式");

      // 通知父组件有错误，与 mermaid-renderer 保持一致
      if (onErrorChange) {
        onErrorChange(errorMsg, true);
      }
    } finally {
      setIsRendering(false);
    }
  }, [excalidrawAPI, mermaidCode]);

  useEffect(() => {
    renderMermaidContent();
  }, [renderMermaidContent]);

  // 缩放功能
  const handleZoomIn = () => {
    if (excalidrawAPI) {
      excalidrawAPI.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (excalidrawAPI) {
      excalidrawAPI.zoomOut();
    }
  };

  const handleZoomReset = () => {
    if (excalidrawAPI) {
      excalidrawAPI.resetZoom();
      if (excalidrawElements.length > 0) {
        excalidrawAPI.scrollToContent(excalidrawElements, {
          fitToContent: true,
        });
      }
    }
  };

  // 适应窗口大小
  const handleFitToScreen = () => {
    if (excalidrawAPI && excalidrawElements.length > 0) {
      excalidrawAPI.scrollToContent(excalidrawElements, {
        fitToContent: true,
      });
    }
  };

  const handleDownload = async () => {
    if (!excalidrawAPI || excalidrawElements.length === 0) {
      toast.error("没有可下载的内容");
      return;
    }

    try {
      // 获取当前应用状态
      const appState = excalidrawAPI.getAppState();
      
      // 使用正确的exportToBlob API
      const blob = await exportToBlob({
        elements: excalidrawElements,
        appState: appState,
        files: excalidrawFiles,
        mimeType: "image/png",
        quality: 0.8,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'excalidraw-diagram.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("图表已下载");
    } catch (error) {
      console.error('Download error:', error);
      toast.error("下载失败");
    }
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-full'} flex flex-col`}>
      {/* 控制栏 - 固定高度 */}
      <div className="h-12 flex justify-between items-center px-2 flex-shrink-0">
        <h3 className="text-sm font-medium">Excalidraw 图表</h3>
        <div className="flex gap-2">
          {/* 适应窗口 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFitToScreen}
            className="h-7 gap-1 text-xs px-2"
            title="适应窗口"
            disabled={!excalidrawAPI || excalidrawElements.length === 0}
          >
            <Move className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">适应</span>
          </Button>

          {/* 下载按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!excalidrawAPI || excalidrawElements.length === 0}
            className="h-7 gap-1 text-xs px-2"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">下载</span>
          </Button>

          {/* 全屏模式下的退出按钮 */}
          {isFullscreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(false)}
              className="h-7 gap-1 text-xs px-2"
              title="退出全屏"
            >
              <Minimize className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">退出</span>
            </Button>
          )}
        </div>
      </div>

      {/* 图表显示区域 - 占用剩余空间 */}
      <div className="flex-1 border rounded-lg bg-gray-50 dark:bg-gray-900 relative min-h-0 overflow-hidden">
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">渲染中...</span>
            </div>
          </div>
        )}
        
        {renderError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center p-6 max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <p className="text-destructive mb-3 font-medium text-lg">Excalidraw 渲染失败</p>
              <div className="space-y-2">
                <p className="text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 p-3 rounded-md">
                  💡 提示：Excalidraw模式暂不支持此类型图表，请点击右上角切换到"Mermaid"模式查看
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="font-medium text-green-600">Excalidraw支持：</span>流程图(flowchart)、时序图(sequenceDiagram)、类图(classDiagram)、饼图(pie)、状态图(stateDiagram)
                </p>
                {/* <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-red-600">不支持：</span>实体关系图(erDiagram)、甘特图(gantt)、Git图(gitGraph)、用户旅程图(journey)、思维导图(mindmap)等
                </p> */}
              </div>
            </div>
          </div>
        )}
        
        
        
        <div className="w-full h-full">
          <Excalidraw
            initialData={{
              appState: {
                viewBackgroundColor: "#fafafa",
                currentItemFontFamily: 1,
              },
            }}
            excalidrawAPI={(api) => setExcalidrawAPI(api)}
          />
        </div>
      </div>
    </div>
  );
}

export default ExcalidrawRenderer; 
