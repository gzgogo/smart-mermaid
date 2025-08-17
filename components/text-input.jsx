"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { countCharacters } from "@/lib/utils";
import { DiagramTypeSelector } from "@/components/diagram-type-selector";

export function TextInput({ onGenerate, isGenerating, diagramType, onDiagramTypeChange, maxChars = 20000 }) {
  const [inputText, setInputText] = useState("");
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef(null);
  const containerRef = useRef(null);
  
  useEffect(() => {
    setCharCount(countCharacters(inputText));
  }, [inputText]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInputText(newValue);
  };

  const handleGenerate = () => {
    if (inputText.trim() && onGenerate) {
      onGenerate(inputText.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const isOverLimit = maxChars && charCount > maxChars;
  const canGenerate = inputText.trim() && !isGenerating && !isOverLimit;

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      {/* 文本框容器 - 占用大部分空间 */}
      <div className="flex-1 min-h-0 mb-4">
        <Textarea
          ref={textareaRef}
          placeholder="请在此输入或粘贴文本内容..."
          className="w-full h-full font-mono text-sm overflow-y-auto resize-none !outline-none !ring-0 !border-0 focus:!outline-none focus:!ring-0 focus:!border-0"
          value={inputText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </div>

              {/* 底部控制区域 */}
        <div className="space-y-4">
          {/* 字符计数 */}
          <div className="flex justify-end">
            <span className={`text-sm ${isOverLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {charCount} {maxChars ? `/ ${maxChars} 字符` : "字符"}
            </span>
          </div>

          {/* 生成按钮 */}
          <div className="flex justify-center">
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full max-w-sm"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  生成中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  生成图表 (Ctrl/Cmd + Enter)
                </>
              )}
            </Button>
          </div>
        </div>
    </div>
  );
} 