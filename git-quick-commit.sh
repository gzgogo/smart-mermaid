#!/bin/bash

# Git快速提交脚本
# 用法: ./git-quick-commit.sh "提交信息"

if [ $# -eq 0 ]; then
    echo "❌ 错误: 请提供提交信息"
    echo "用法: $0 \"提交信息\""
    exit 1
fi

COMMIT_MSG="$1"

echo "📦 添加所有文件到暂存区..."
git add -A

if [ $? -ne 0 ]; then
    echo "❌ 添加文件失败"
    exit 1
fi

echo "💬 提交更改: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

if [ $? -ne 0 ]; then
    echo "❌ 提交失败"
    exit 1
fi

echo "🚀 推送到远程仓库..."
git push

if [ $? -eq 0 ]; then
    echo "✅ 所有操作完成！"
else
    echo "❌ 推送失败"
    exit 1
fi
