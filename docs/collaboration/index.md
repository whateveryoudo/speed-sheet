# 协同编辑

Speed Sheet 的协同架构基于成熟的 **Yjs (CRDT)**，天然支持分布式无锁多人并发写入。

---

## 核心设计：单机与协同无缝切换

与传统的繁琐集成不同，Speed Sheet 的单机与协同模式统一收敛在 `<SpeedSheet />` 中，**两者仅仅是一个 `ydoc` 参数的差别**：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { SpeedSheet } from '@speed-sheet/vue3-antd'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

// 1. 创建共享 Y.Doc
const ydoc = new Y.Doc()

// 2. 连接服务端 WebSocket (例如使用 Hocuspocus)
const provider = new HocuspocusProvider({
  url: 'ws://your-collab-server.com/collaboration',
  name: 'sheet-document-101',
  document: ydoc,
})
</script>

<template>
  <div style="height: 100vh;">
    <!-- 
      - 多人协同模式：传入 :ydoc="ydoc"
      - 本地单机模式：不传 ydoc，传入 :sheet-data 即可
    -->
    <SpeedSheet
      :ydoc="ydoc"
      :show-toolbar="true"
      :show-formula-bar="true"
    />
  </div>
</template>
```

---

## 协作筛选视图 (filterUserId)

在团队多人协同看一张大表时，不同人可能需要查看不同的筛选条件，如果所有人的筛选都互相干扰，体验会极其混乱。

Speed Sheet 提供了 **私有筛选分桶机制**：
* 传入 `:filter-user-id="currentUserId"`
* 表格的列筛选状态会自动根据用户 ID 隔离存放在私有 Y.Doc 分桶中，既能享受数据内容实时协同，又能享受个人独立的筛选视图！

---

## 生产级全栈落地参考

完整的知识库表格协同、后端 WebSocket 集群与权限控制，请参考我们的开源生产级知识库项目：

* 🚀 **开源知识库平台**：[Speed Knowledge Client](https://github.com/whateveryoudo/speed-knowledge-client)
* 🌐 **线上体验**：[SpeedDoc (speeddoc.cn)](http://speeddoc.cn/)
