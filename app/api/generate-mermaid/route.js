import { cleanText } from "@/lib/utils";

export async function POST(request) {
  try {
    const { text, diagramType, aiConfig, accessPassword, selectedModel, conversationContext = [] } = await request.json();

    if (!text) {
      return Response.json({ error: "请提供文本内容" }, { status: 400 });
    }

    const cleanedText = cleanText(text);
    
    let finalConfig;
    
    // 步骤1: 检查是否有完整的aiConfig
    const hasCompleteAiConfig = aiConfig?.apiUrl && aiConfig?.apiKey && aiConfig?.modelName;
    
    if (hasCompleteAiConfig) {
      // 如果有完整的aiConfig，直接使用
      finalConfig = {
        apiUrl: aiConfig.apiUrl,
        apiKey: aiConfig.apiKey,
        modelName: aiConfig.modelName
      };
    } else {
      // 步骤2: 如果没有完整的aiConfig，则检验accessPassword
      if (accessPassword) {
        // 步骤3: 如果传入了accessPassword，验证是否有效
        const correctPassword = process.env.ACCESS_PASSWORD;
        const isPasswordValid = correctPassword && accessPassword === correctPassword;
        
        if (!isPasswordValid) {
          // 如果密码无效，直接报错
          return Response.json({ 
            error: "访问密码无效" 
          }, { status: 401 });
        }
      }
      
      // 如果没有传入accessPassword或者accessPassword有效，使用环境变量配置
      // 如果有选择的模型，使用选择的模型，否则使用默认模型
      finalConfig = {
        apiUrl: process.env.AI_API_URL,
        apiKey: process.env.AI_API_KEY,
        modelName: selectedModel || process.env.AI_MODEL_NAME
      };
    }

    // 检查最终配置是否完整
    if (!finalConfig.apiUrl || !finalConfig.apiKey || !finalConfig.modelName) {
      return Response.json({ 
        error: "AI配置不完整，请在设置中配置API URL、API Key和模型名称" 
      }, { status: 400 });
    }

    // 构建 prompt 根据图表类型
    let systemPrompt = `
    目的和目标：
* 理解用户提供的文档的结构和逻辑关系。
* 准确地将文档内容和关系转化为符合mermaid语法的图表代码。
* 确保图表中包含文档的所有关键元素和它们之间的联系。
* 支持连续对话，根据上下文理解用户的修改需求和补充说明。

行为和规则：
1. 对话上下文理解：
a) 如果对话历史中有之前的交互记录，请分析用户的需求演进。
b) 理解用户当前输入是否为：修改之前的图表、补充新内容、或完全新的需求。
c) 对于修改请求，在原有图表基础上进行调整而非重新创建。
d) 对于补充内容，将新信息整合到现有图表结构中。

2. 分析文档：
a) 仔细阅读和分析用户提供的文档内容。
b) 识别文档中的不同元素（如概念、实体、步骤、流程等）。
c) 理解这些元素之间的各种关系（如从属、包含、流程、因果等）。
d) 识别文档中蕴含的逻辑结构和流程。

3. 图表生成：
    `
    
    if (diagramType && diagramType !== "auto") {
      // 概念性图表类型转换为具体的Mermaid语法
      const conceptualToMermaid = {
        'mindMap': '思维导图风格的flowchart',
        'hierarchyTree': '层级结构的flowchart或graph',
        'relationshipDiagram': '关系图风格的graph或flowchart',
        'freeformLayout': '自由布局的graph',
        'comparisonDiagram': '对比结构的flowchart',
        'timeline': '时间线风格的gantt或flowchart',
        'matrixMap': '矩阵结构的flowchart',
        'scenarioScript': '场景流程的flowchart或sequenceDiagram',
        'visualNotes': '图文混排的flowchart'
      };
      
      const mappedType = conceptualToMermaid[diagramType] || diagramType;
      systemPrompt += `a) 请特别生成 ${mappedType} 类型的图表。`;
    } else {
      systemPrompt += `a) 根据分析结果，选择最适合表达文档结构的mermaid图表类型（流程图、时序图、类图、甘特图、饼图、状态图、实体关系图、Git图、用户旅程图中的一种）。`;
    }

    systemPrompt += `
    b) 使用正确的mermaid语法创建图表代码，充分参考下面的Mermaid 语法特殊字符说明："""
* Mermaid 的核心特殊字符主要用于**定义图表结构和关系**。
* **节点ID必须使用英文字母和数字**，不能包含中文字符、空格或特殊符号，例如：A、B、step1、process2等。
* 要在节点标签中**显示中文或特殊字符**，必须用**双引号 \`""\`** 包裹标签文本，例如：A["用户打开首页"]。
* 在标签文本（引号内）中显示 HTML 特殊字符 (\`<\`, \`>\`, \`&\`) 或 \`#\` 等，应使用 **HTML 实体编码**。
* 使用 \`%%\` 进行**注释**。
* 序号之后不要跟进空格，比如\`1. xxx\`应该改成\`1.xxx\`
* 用不同的背景色以区分不同层级或是从属的元素
* **重要**：为确保Excalidraw兼容性，节点ID必须是简单的英文标识符，中文内容只能出现在引号包裹的标签中。

**重要：饼图(pie)语法格式**：
饼图必须严格按照以下格式：
\`\`\`
pie title 图表标题
    "分类1" : 数值1
    "分类2" : 数值2
    "分类3" : 数值3
\`\`\`
注意：
- 第一行必须是 "pie title 标题文字"
- 每个数据项必须用双引号包裹标签名
- 冒号前后有空格
- 每行开头有4个空格缩进

**设计原则**：
- 层次清晰：使用不同颜色和形状区分不同层级的信息
- 布局合理：元素间距适当，整体美观，避免图形遮挡
- 颜色搭配：使用和谐的配色方案，建议流程图使用蓝色系、绿色系、橙色系、红色系等区分不同步骤
- 图形元素：适当使用矩形、圆形、箭头等元素
- 字体大小：根据重要性调整字体（标题20-24px，正文14-16px）
- 连线美观：所有箭头连线必须无交叉，连接精确，路径简洁
- 标签清晰：步骤标签和说明文字不能被连线覆盖，位置要醒目易读

**可选图表类型**：
1. 流程图（Flowchart）：步骤说明、工作流程、任务执行顺序
2. 思维导图（Mind Map）：概念发散、主题分类、灵感捕捉  
3. 层级图（Hierarchy Tree）：组织结构、内容分级、系统拆解
4. 关系图（Relationship Diagram）：要素之间的影响、依赖、互动关系
5. 自由结构图（Freeform Layout）：零散内容、灵感记录、初步收集
6. 对比图（Comparison Diagram）：方案或观点对照分析
7. 时间线图（Timeline）：事件发展、项目进度、模型演化
8. 矩阵图（Matrix Map）：双维度分类、任务优先级、定位分析
9. 场景剧本图（Scenario Script）：角色-操作-系统反应流程
10. 图文混排笔记（Visual Notes）：说明性内容、教学图解、重点整理\`
`

systemPrompt+=`
c) 确保图表清晰、易于理解，准确反映文档的内容和逻辑。

d) 不要使用<artifact>标签包裹代码，而是直接以markdown格式返回代码,除了代码外不要返回其他内容。

**正确的Mermaid语法示例**：
\`\`\`
flowchart TD
    A["用户打开首页"] --> B["输入手机号"]
    B --> C["手机号格式正确"]
    C -->|是| D["提示用户输入"]
    C -->|否| E["输入验证码"]
    E --> F["验证码正确"]
    F -->|是| G["跳转到设置密码"]
    F -->|否| H["设置密码"]
    H --> I["点击提交注册"]
    I --> J["信息完整"]
    J -->|是| K["返回'请完善注册信息'"]
    J -->|否| L["注册成功"]
    L --> M["跳转到欢迎页面"]
\`\`\`

注意：节点ID(A,B,C等)必须是英文，中文内容放在双引号中的标签里。
`

systemPrompt += `
3. 细节处理：
a) 避免遗漏文档中的任何重要细节或关系。
b) 生成的图表代码应可以直接复制并粘贴到支持mermaid语法的工具或平台中使用。
整体语气：
* 保持专业和严谨的态度。
* 清晰、准确地表达图表的内容。
* 在需要时，可以提供简短的解释或建议。
`

    // 构建消息数组，包含系统提示、对话历史和当前用户输入
    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      // 添加对话历史上下文
      ...conversationContext,
      // 当前用户输入
      {
        role: "user",
        content: cleanedText,
      },
    ];

    // 构建API URL
    const url = finalConfig.apiUrl.includes("v1") || finalConfig.apiUrl.includes("v3") 
      ? `${finalConfig.apiUrl}/chat/completions` 
      : `${finalConfig.apiUrl}/v1/chat/completions`;
    
    console.log('Using AI config:', { 
      url, 
      modelName: finalConfig.modelName,
      hasApiKey: !!finalConfig.apiKey,
    });

    // 创建一个流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let isControllerClosed = false;
        
        const safeEnqueue = (data) => {
          if (!isControllerClosed) {
            try {
              controller.enqueue(encoder.encode(JSON.stringify(data)));
            } catch (error) {
              if (error.name !== 'TypeError' || !error.message.includes('Controller is already closed')) {
                console.error('Error enqueueing data:', error);
              }
              isControllerClosed = true;
            }
          }
        };

        const safeClose = () => {
          if (!isControllerClosed) {
            try {
              controller.close();
              isControllerClosed = true;
            } catch (error) {
              isControllerClosed = true;
            }
          }
        };

        try {
          // 发送请求到 AI API (开启流式模式)
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${finalConfig.apiKey}`,
            },
            body: JSON.stringify({
              model: finalConfig.modelName,
              messages,
              stream: true, // 开启流式输出
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("AI API Error:", response.status, errorText);
            safeEnqueue({ 
              error: `AI服务返回错误 (${response.status}): ${errorText || 'Unknown error'}` 
            });
            safeClose();
            return;
          }

          // 读取流式响应
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let mermaidCode = "";
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // 解析返回的数据块
            const chunk = decoder.decode(value, { stream: true });
            
            // 处理数据行
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.substring(6);
                if (data === '[DONE]') continue;
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices[0]?.delta?.content || '';
                  if (content) {
                    mermaidCode += content;
                    // 发送给客户端
                    safeEnqueue({ 
                      chunk: content,
                      done: false 
                    });
                  }
                } catch (e) {
                  console.error('Error parsing chunk:', e);
                }
              }
            }
          }
          
          // 提取代码块中的内容（如果有代码块标记）
          const codeBlockMatch = mermaidCode.match(/```(?:mermaid)?\s*([\s\S]*?)```/);
          const finalCode = codeBlockMatch ? codeBlockMatch[1].trim() : mermaidCode;
          
          // 发送完成信号
          safeEnqueue({ 
            mermaidCode: finalCode,
            done: true 
          });
          
        } catch (error) {
          console.error("Streaming Error:", error);
          safeEnqueue({ 
            error: `处理请求时发生错误: ${error.message}`, 
            done: true 
          });
        } finally {
          safeClose();
        }
      }
    });

    // 返回流式响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error("API Route Error:", error);
    return Response.json(
      { error: `处理请求时发生错误: ${error.message}` }, 
      { status: 500 }
    );
  }
} 