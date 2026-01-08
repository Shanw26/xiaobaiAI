#!/bin/bash

# GitHub Actions 状态检查脚本

echo "🔍 检查 GitHub Actions 打包状态..."
echo ""

# 检查是否安装了 gh CLI
if command -v gh &> /dev/null; then
    echo "📋 最近的 5 次 workflow 运行："
    echo ""
    gh run list --repo Shanw26/xiaobaiAI --limit 5 --json status,conclusion,event,createdAt,name,workflowName,displayTitle,url | \
    python3 -c "
import json, sys
from datetime import datetime

runs = json.load(sys.stdin)

status_map = {
    'queued': '⏳ 排队中',
    'in_progress': '🔄 进行中',
    'completed': '✅ 已完成'
}

conclusion_map = {
    'success': '✅ 成功',
    'failure': '❌ 失败',
    'cancelled': '⚠️ 取消',
    'skipped': '⏭️ 跳过'
}

for run in runs:
    status = status_map.get(run['status'], run['status'])
    conclusion = conclusion_map.get(run.get('conclusion'), run.get('conclusion', ''))
    created = datetime.fromisoformat(run['createdAt'].replace('Z', '+00:00')).strftime('%Y-%m-%d %H:%M:%S')

    print(f\"{'='*60}\")
    print(f\"📌 {run['displayTitle']}\")
    print(f\"   Workflow: {run['workflowName']}\")
    print(f\"   状态: {status}\")
    if conclusion:
        print(f\"   结论: {conclusion}\")
    print(f\"   触发: {run['event']}\")
    print(f\"   时间: {created}\")
    print(f\"   链接: {run['url']}\")
"
else
    echo "⚠️  GitHub CLI 未安装"
    echo ""
    echo "📱 请访问以下链接查看："
    echo ""
    echo "   Actions 页面:"
    echo "   https://github.com/Shanw26/xiaobaiAI/actions"
    echo ""
    echo "   或直接查看最新运行:"
    echo "   https://github.com/Shanw26/xiaobaiAI/actions/workflows/build.yml"
fi

echo ""
echo "="60
echo "💡 提示: 安装 GitHub CLI 可以在终端直接查看状态"
echo "   brew install gh"
echo "="60
