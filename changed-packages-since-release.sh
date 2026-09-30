#!/usr/bin/env bash
# 对比各 @speed-sheet/* 包自最近一次 npm 发布 tag 以来的 git 变更，供 pnpm changeset 选包参考。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "错误: 当前目录不是 git 仓库" >&2
  exit 1
fi

IGNORE_NAMES=(
  "@speed-sheet/demo"
)

is_ignored() {
  local name="$1"
  for ignored in "${IGNORE_NAMES[@]}"; do
    if [[ "$name" == "$ignored" ]]; then
      return 0
    fi
  done
  return 1
}

read_pkg_field() {
  local file="$1"
  local field="$2"
  local abs
  abs="$(cd "$(dirname "$file")" && pwd)/$(basename "$file")"
  node -p "require('${abs}').${field}"
}

declare -a CHANGED=()
declare -a UNCHANGED=()
declare -a NEVER_PUBLISHED=()

echo ""
echo "========================================"
echo "  @speed-sheet 包变更检查（相对最近 tag）"
echo "========================================"
echo ""

while IFS= read -r pkgfile; do
  if [[ "$(read_pkg_field "$pkgfile" "private" 2>/dev/null || echo false)" == "true" ]]; then
    continue
  fi

  name="$(read_pkg_field "$pkgfile" "name")"
  version="$(read_pkg_field "$pkgfile" "version")"
  dir="$(dirname "$pkgfile")"

  if is_ignored "$name"; then
    continue
  fi

  latest_tag="$(git tag -l "${name}@*" | sort -V | tail -1 || true)"

  if [[ -z "$latest_tag" ]]; then
    commit_count="$(git log --oneline -- "$dir" 2>/dev/null | wc -l | tr -d ' ')"
    if [[ "$commit_count" -gt 0 ]]; then
      NEVER_PUBLISHED+=("$name|$version|$dir|$commit_count")
    fi
    continue
  fi

  if ! git rev-parse --verify "$latest_tag" >/dev/null 2>&1; then
    echo "警告: tag $latest_tag 无效，跳过 $name" >&2
    continue
  fi

  commit_count="$(git log --oneline "${latest_tag}..HEAD" -- "$dir" 2>/dev/null \
    | { grep -Ev '^[0-9a-f]+ chore: (release|version packages)' || true; } \
    | wc -l | tr -d ' ')"

  if [[ "$commit_count" -gt 0 ]]; then
    CHANGED+=("$name|$latest_tag|$version|$dir|$commit_count")
  else
    UNCHANGED+=("$name|$latest_tag|$version")
  fi
done < <(find packages -name package.json -not -path '*/node_modules/*' | sort)

if [[ ${#CHANGED[@]} -gt 0 ]]; then
  echo "【有变动 — 可考虑加入 changeset】"
  echo ""
  for entry in "${CHANGED[@]}"; do
    IFS='|' read -r name latest_tag version dir commit_count <<<"$entry"
    echo "  ● $name"
    echo "    本地版本: $version"
    echo "    最近 tag: $latest_tag"
    echo "    变更提交: $commit_count 个 (路径: $dir/)"
    echo "    最近提交:"
    git log --oneline "${latest_tag}..HEAD" -- "$dir" 2>/dev/null \
      | { grep -Ev '^[0-9a-f]+ chore: (release|version packages)' || true; } \
      | head -5 | sed 's/^/      /'
    remaining=$((commit_count - 5))
    if [[ "$remaining" -gt 0 ]]; then
      echo "      ... 还有 $remaining 个"
    fi
    echo ""
  done
else
  echo "【有变动 — 可考虑加入 changeset】"
  echo "  (无)"
  echo ""
fi

if [[ ${#NEVER_PUBLISHED[@]} -gt 0 ]]; then
  echo "【从未发布过（无 npm tag）— 若需上线请加入 changeset】"
  echo ""
  for entry in "${NEVER_PUBLISHED[@]}"; do
    IFS='|' read -r name version dir commit_count <<<"$entry"
    echo "  ○ $name (package.json: $version, 历史提交: $commit_count, 路径: $dir/)"
  done
  echo ""
fi

if [[ ${#UNCHANGED[@]} -gt 0 ]]; then
  echo "【自最近 tag 以来无源码变动】"
  for entry in "${UNCHANGED[@]}"; do
    IFS='|' read -r name latest_tag version <<<"$entry"
    echo "  - $name @ $version (tag: $latest_tag)"
  done
  echo ""
fi

echo "----------------------------------------"
echo "说明:"
echo "  · 仅对比各包目录下的 git 提交，不含依赖链分析"
echo "  · 底层包 (core/shared) 有 API 变化时，上层包可能也需要发版"
echo "  · 接下来请手动选择要 bump 的包 ↓"
echo "----------------------------------------"
echo ""
