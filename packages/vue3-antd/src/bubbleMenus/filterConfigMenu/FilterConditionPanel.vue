<template>
  <div class="sheet-filter-condition">
    <div class="sheet-filter-condition__type-row">
      <span class="sheet-filter-condition__label">字段类型</span>
      <a-select
        v-model:value="typeTab"
        class="sheet-filter-condition__type-select"
        :disabled="!conditionRule"
        :options="typeOptions"
      />
    </div>

    <template v-for="(clause, idx) in clauses" :key="idx">
      <div v-if="idx > 0" class="sheet-filter-condition__connector">
        <a-radio-group
          :value="clauses[idx - 1]?.connector ?? 'and'"
          @update:value="(v: 'and' | 'or') => setConnector(idx - 1, v)"
        >
          <a-radio value="and">并且</a-radio>
          <a-radio value="or">或者</a-radio>
        </a-radio-group>
        <a-button type="text" danger class="ml-auto" @click="removeClause(idx)">
          <delete-outlined />
        </a-button>
      </div>

      <div class="sheet-filter-condition__block">
        <a-select
          v-model:value="clause.operator"
          class="w-full mb-2"
          :options="operatorOptions"
        />
        <template v-if="typeTab === 'date' || typeTab === 'common'">
          <!-- 日期 / 通用值条件无需输入 -->
        </template>
        <template v-else-if="showRightInput(clause)">
          <div class="sheet-filter-condition__between">
            <a-input v-model:value="clause.value" placeholder="最小值" />
            <span class="sheet-filter-condition__between-sep">-</span>
            <a-input v-model:value="clause.valueRight" placeholder="最大值" />
          </div>
        </template>
        <template v-else>
          <a-input v-model:value="clause.value" placeholder="请输入" />
        </template>
      </div>
    </template>

    <a-button
      v-if="clauses.length < 2"
      type="dashed"
      block
      class="mt-2"
      :disabled="!conditionRule"
      @click="addClause"
    >
      + 添加条件
    </a-button>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { DeleteOutlined } from '@ant-design/icons-vue'
import {
  CONDITION_TYPE_OPTIONS,
  createDefaultConditionClause,
  needsRightValue,
  operatorsForType,
  type FilterConditionRule,
  type FilterConditionTypeTab,
} from '@speed-sheet/extension-filter'

const props = defineProps<{
  conditionRule: FilterConditionRule | null | undefined
}>()

const conditionRule = computed(() => props.conditionRule ?? null)

const typeOptions = CONDITION_TYPE_OPTIONS

const typeTab = computed<FilterConditionTypeTab>({
  get: () => conditionRule.value?.typeTab ?? 'text',
  set: (tab) => {
    const rule = conditionRule.value
    if (!rule) return
    if (rule.typeTab === tab) return
    rule.typeTab = tab
    rule.clauses = [createDefaultConditionClause(tab)]
  },
})

const clauses = computed(() => conditionRule.value?.clauses ?? [])

const operatorOptions = computed(() =>
  operatorsForType(typeTab.value).map((o) => ({
    value: o.value,
    label: o.label,
  })),
)

watch(typeTab, () => {
  for (const c of clauses.value) {
    c.type = typeTab.value
  }
})

function showRightInput(clause: { operator: string }) {
  return needsRightValue(typeTab.value, clause.operator)
}

function addClause(): void {
  const rule = conditionRule.value
  if (!rule || rule.clauses.length >= 2) return
  const prev = rule.clauses[rule.clauses.length - 1]
  if (prev) prev.connector = prev.connector ?? 'and'
  rule.clauses.push(createDefaultConditionClause(rule.typeTab))
}

function setConnector(idx: number, v: 'and' | 'or'): void {
  const c = clauses.value[idx]
  if (c) c.connector = v
}

function removeClause(idx: number): void {
  const rule = conditionRule.value
  if (!rule || idx <= 0) return
  rule.clauses.splice(idx, 1)
  const last = rule.clauses[rule.clauses.length - 1]
  if (last) delete last.connector
}
</script>

<style scoped lang="less">
.sheet-filter-condition__type-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.sheet-filter-condition__label {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.88);
}

.sheet-filter-condition__type-select {
  flex: 1;
  min-width: 0;
}

.sheet-filter-condition__connector {
  display: flex;
  align-items: center;
  margin: 8px 0;
}

.sheet-filter-condition__block {
  padding: 4px 0;
}

.sheet-filter-condition__between {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sheet-filter-condition__between-sep {
  color: #999;
  flex-shrink: 0;
}
</style>
