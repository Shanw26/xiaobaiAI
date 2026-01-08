#!/bin/bash

# GitHub Actions 打包监控脚本
# 使用方法: ./scripts/wait-for-build.sh [sleep-interval]

set -e

REPO="Shanw26/xiaobaiAI"
SLEEP_INTERVAL=${1:-30}  # 默认每 30 秒检查一次

echo "🔍 开始监控 GitHub Actions 打包状态..."
echo "   检查间隔: ${SLEEP_INTERVAL} 秒"
echo "   仓库: ${REPO}"
echo ""

# 获取最新的运行
get_latest_run() {
    curl -s "https://api.github.com/repos/${REPO}/actions/runs?per_page=1" | \
    python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    run = data['workflow_runs'][0] if data.get('workflow_runs') else None
    if run:
        print(json.dumps(run))
except:
    pass
" 2>/dev/null
}

# 显示通知
notify() {
    title="$1"
    message="$2"

    echo ""
    echo "🔔 ============ 通知 ============"
    echo "   ${title}"
    echo "   ${message}"
    echo "================================"
    echo ""

    # macOS 通知
    if [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e "display notification \"${message}\" with title \"${title}\" sound name \"Glass\""
    fi
}

# 主监控循环
last_status=""

while true; do
    run_json=$(get_latest_run)

    if [ -z "$run_json" ]; then
        echo "⚠️  无法获取运行状态"
        sleep $SLEEP_INTERVAL
        continue
    fi

    status=$(echo "$run_json" | python3 -c "import json,sys; print(json.load(sys.stdin)['status'])" 2>/dev/null)
    conclusion=$(echo "$run_json" | python3 -c "import json,sys; r=json.load(sys.stdin); print(r.get('conclusion', ''))" 2>/dev/null)
    name=$(echo "$run_json" | python3 -c "import json,sys; print(json.load(sys.stdin).get('name', 'Unknown'))" 2>/dev/null)
    url=$(echo "$run_json" | python3 -c "import json,sys; print(json.load(sys.stdin).get('html_url', ''))" 2>/dev/null)

    # 状态映射
    status_text=""
    case $status in
        "queued")
            status_text="⏳ 排队中"
            ;;
        "in_progress")
            status_text="🔄 进行中"
            ;;
        "completed")
            status_text="✅ 已完成"
            ;;
        *)
            status_text="❓ ${status}"
            ;;
    esac

    # 结论映射
    conclusion_text=""
    case $conclusion in
        "success")
            conclusion_text="✅ 成功"
            ;;
        "failure")
            conclusion_text="❌ 失败"
            ;;
        "cancelled")
            conclusion_text="⚠️ 取消"
            ;;
        *)
            conclusion_text=""
            ;;
    esac

    # 只在状态改变时输出
    if [ "$status" != "$last_status" ]; then
        timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        echo "[${timestamp}] ${status_text} ${conclusion_text} - ${name}"
        last_status="$status"
    fi

    # 检查是否完成
    if [ "$status" == "completed" ]; then
        if [ "$conclusion" == "success" ]; then
            notify "✅ 打包成功！" "GitHub Actions 已完成打包，点击查看详情"
            echo "📦 下载链接: ${url}"
            echo ""
            echo "🎉 打包完成！可以在以下位置下载安装包："
            echo "   1. GitHub Actions Artifacts (30天内有效)"
            echo "   2. GitHub Releases: https://github.com/${REPO}/releases"
            echo ""
        else
            notify "❌ 打包失败" "GitHub Actions 打包失败，请检查日志"
            echo "❌ 打包失败！"
            echo "   查看错误: ${url}"
            echo ""
        fi
        exit 0
    fi

    sleep $SLEEP_INTERVAL
done
