"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Upload, FileText, File, Send, X } from "lucide-react";
import { extractTextFromFile } from "@/lib/file-service";
import { formatFileSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DiagramTypeSelector } from "@/components/diagram-type-selector";
import { Textarea } from "@/components/ui/textarea";

export function FileUpload({ onGenerate, isGenerating, diagramType, onDiagramTypeChange }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0]; // Only process the first file
      
      // Check file type
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!['txt', 'md', 'docx'].includes(fileExt)) {
        toast.error("不支持的文件类型。请上传 .txt, .md 或 .docx 文件。");
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("文件太大。请上传小于 10MB 的文件。");
        return;
      }

      setIsProcessing(true);
      
      try {
        const { text, error } = await extractTextFromFile(file);
        
        if (error) {
          toast.error(error);
          return;
        }
        
        if (!text || text.trim() === "") {
          toast.error("无法从文件中提取文本内容。");
          return;
        }
        
        toast.success(`已成功从 ${file.name} 提取文本`);
        setExtractedText(text);
        setUploadedFile(file);
      } catch (error) {
        console.error("File processing error:", error);
        toast.error("处理文件时出错：" + error.message);
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const handleGenerate = () => {
    if (extractedText.trim() && onGenerate) {
      onGenerate(extractedText.trim());
    }
  };

  const handleTextChange = (e) => {
    setExtractedText(e.target.value);
  };

  const handleClearFile = () => {
    setExtractedText("");
    setUploadedFile(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  // 如果已经有提取的文本，显示文本编辑界面
  if (extractedText) {
    return (
      <div className="flex flex-col h-full">
        {/* 文件信息和清除按钮 */}
        {uploadedFile && (
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">{uploadedFile.name}</span>
              <span className="text-xs text-gray-500">({formatFileSize(uploadedFile.size)})</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFile}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* 文本编辑区域 */}
        <div className="flex-1 min-h-0 mb-4">
          <Textarea
            placeholder="提取的文本内容..."
            className="w-full h-full font-mono text-sm overflow-y-auto resize-none !outline-none !ring-0 !border-0 focus:!outline-none focus:!ring-0 focus:!border-0"
            value={extractedText}
            onChange={handleTextChange}
          />
        </div>

        {/* 底部控制区域 */}
        <div className="space-y-4">
          {/* 生成按钮 */}
          <div className="flex justify-center">
            <Button
              onClick={handleGenerate}
              disabled={!extractedText.trim() || isGenerating}
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
                  生成图表
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 如果没有提取的文本，显示文件上传界面
  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer h-full flex items-center justify-center
        ${isDragActive ? "border-primary bg-primary/5" : "border-border"}
        ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p>正在处理文件...</p>
          </>
        ) : (
          <>
            <div className="p-3 bg-primary/10 rounded-full">
              {isDragActive ? (
                <FileText className="h-8 w-8 text-primary" />
              ) : (
                <Upload className="h-8 w-8 text-primary" />
              )}
            </div>
            <div>
              {isDragActive ? (
                <p className="font-medium">放下文件以上传</p>
              ) : (
                <>
                  <p className="font-medium">点击或拖放文件到此处上传</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    支持 .txt, .md, .docx 格式（最大 10MB）
                  </p>
                </>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-2">
              <File className="mr-2 h-4 w-4" />
              选择文件
            </Button>
          </>
        )}
      </div>
    </div>
  );
} 