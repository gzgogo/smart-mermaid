"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DIAGRAM_TYPES = [
  { value: "auto", label: "自动选择" },
  // 基础Mermaid图表类型
  { value: "flowchart", label: "流程图" },
  { value: "sequenceDiagram", label: "时序图" },
  { value: "classDiagram", label: "类图" },
  { value: "pie", label: "饼图" },
  { value: "gantt", label: "甘特图" },
  { value: "stateDiagram", label: "状态图" },
  { value: "erDiagram", label: "实体关系图" },
  { value: "journey", label: "用户旅程图" },
  { value: "gitGraph", label: "Git图" },
  // 概念性图表类型（AI会转换为合适的Mermaid语法）
  { value: "mindMap", label: "思维导图" },
  { value: "hierarchyTree", label: "层级图" },
  { value: "relationshipDiagram", label: "关系图" },
  { value: "freeformLayout", label: "自由结构图" },
  { value: "comparisonDiagram", label: "对比图" },
  { value: "timeline", label: "时间线图" },
  { value: "matrixMap", label: "矩阵图" },
  { value: "scenarioScript", label: "场景剧本图" },
  { value: "visualNotes", label: "图文混排笔记" },
];

export function DiagramTypeSelector({ value, onChange }) {
  return (
    <div className="flex items-center justify-end w-full md:w-auto">
      {/* <Label htmlFor="diagram-type">图表类型</Label> */}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="diagram-type" className="w-full md:w-auto text-xs">
          <SelectValue placeholder="选择图表类型" />
        </SelectTrigger>
        <SelectContent>
          {DIAGRAM_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 