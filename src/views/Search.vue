<template>
  <div class="search-page">
    <div class="search-header">
      <div class="logo">搜索</div>
      <div class="keywords">{{ q }}</div>
    </div>

    <div class="search-bar">
      <el-popover :visible="historyVisible" placement="bottom-start" width="520">
        <div class="history-header">
          <span>历史搜索</span>
          <el-button text type="danger" size="small" @click="clearHistory">清空历史</el-button>
        </div>
        <div class="history-list">
          <button
            v-for="h in histories"
            :key="h"
            class="history-chip"
            @click="applyHistory(h)"
          >
            <span class="chip-text">{{ h }}</span>
            <span class="chip-close" @click.stop="removeHistory(h)">×</span>
          </button>
        </div>
        <template #reference>
          <div class="search-group">
            <el-input
              v-model="keyword"
              placeholder="搜索..."
              size="large"
              class="search-input"
              @focus="openHistory"
              @blur="closeHistory"
              @keydown.enter="onSearch"
            />
            <el-button type="primary" size="large" class="search-btn group-btn" @click="onSearch">搜索</el-button>
          </div>
        </template>
      </el-popover>
    </div>

    <div class="filters">
      <div class="filter-group">
        <span class="filter-title">排序</span>
        <button
          v-for="opt in sortOptions"
          :key="opt.value"
          class="pill"
          :class="{ active: opt.value === sort }"
          @click="sort = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
      <div class="filter-group">
        <span class="filter-title">价格</span>
        <button
          v-for="opt in priceOptions"
          :key="opt.value"
          class="pill"
          :class="{ active: opt.value === price }"
          @click="price = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
      <div class="filter-group">
        <span class="filter-title">配送</span>
        <button
          v-for="opt in deliveryOptions"
          :key="opt.value"
          class="pill"
          :class="{ active: opt.value === delivery }"
          @click="delivery = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="result-grid">
      <div
        v-for="p in products"
        :key="p.id"
        class="result-card"
      >
        <router-link :to="`/product/${p.id}`" class="card-link">
          <div class="card-image">
            <img :src="p.image" :alt="p.title" />
            <span class="badge">精选</span>
          </div>
          <div class="card-info">
            <div class="title">{{ p.title }}</div>
            <div class="price">￥{{ p.price.toFixed(2) }}</div>
            <div class="meta">
              <span>销量 {{ p.sales }}+</span>
              <span>评价 {{ p.reviews }}+</span>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
  <el-empty v-if="!q" description="请输入关键词进行搜索" />
  <RightSidebar />
</template>

<script setup lang="ts" name="Search">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import RightSidebar from '@/components/RightSidebar.vue'
const route = useRoute()
const q = computed(() => (route.query.q as string) || '')
const keyword = ref(q.value)

const historyVisible = ref(false)
const histories = ref<string[]>([])
const getHistory = (): string[] => {
  try {
    const raw = localStorage.getItem('searchHistory')
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}
const refreshHistory = () => {
  histories.value = getHistory()
}
const setHistory = (q: string) => {
  const arr = getHistory().filter(i => i !== q)
  arr.unshift(q)
  localStorage.setItem('searchHistory', JSON.stringify(arr.slice(0, 10)))
  refreshHistory()
}
const removeHistory = (q: string) => {
  const arr = getHistory().filter(i => i !== q)
  localStorage.setItem('searchHistory', JSON.stringify(arr))
  refreshHistory()
}
const clearHistory = () => {
  localStorage.removeItem('searchHistory')
  refreshHistory()
}
const applyHistory = (h: string) => {
  keyword.value = h
  onSearch()
}
const openHistory = () => {
  refreshHistory()
  historyVisible.value = true
}
const closeHistory = () => {
  setTimeout(() => (historyVisible.value = false), 120)
}
const onSearch = () => {
  const val = keyword.value.trim()
  if (!val) return
  setHistory(val)
  historyVisible.value = false
  // replace current query
  window.location.assign(`/search?q=${encodeURIComponent(val)}`)
}

const sortOptions = [
  { label: '综合', value: 'comprehensive' },
  { label: '销量', value: 'sales' },
  { label: '价格', value: 'price' },
]
const priceOptions = [
  { label: '价格区间1', value: 'p1' },
  { label: '价格区间2', value: 'p2' },
  { label: '价格区间3', value: 'p3' },
]
const deliveryOptions = [
  { label: '京配', value: 'jd' },
  { label: '仅展示有货', value: 'instock' },
]

const sort = ref('comprehensive')
const price = ref('p1')
const delivery = ref('jd')

const products = computed(() =>
  Array.from({ length: 16 }).map((_, i) => ({
    id: i + 1,
    title: `${q.value} 示例商品 ${i + 1}`,
    price: Math.round((Math.random() * 90 + 10) * 100) / 100,
    image: '/carouseImg/' + (((i % 4) + 1)) + '.jpg',
    sales: Math.floor(Math.random() * 1000) + 100,
    reviews: Math.floor(Math.random() * 1000) + 100,
  }))
)
</script>

<style scoped>
.search-page {
  padding: 16px 24px;
}
.search-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}
.search-header .logo {
  font-weight: 700;
  color: var(--jd-red);
  font-size: 20px;
}
.search-header .keywords {
  padding: 6px 12px;
  border: 1px solid #eee;
  border-radius: 20px;
  background: #fff;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.filter-title {
  color: #606266;
}
.pill {
  padding: 6px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 18px;
  background: #fff;
  color: #606266;
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
}
.pill:focus,
.pill:active {
  outline: none;
  box-shadow: 0 0 0 2px rgba(225, 37, 27, 0.15) inset;
}
.pill:hover {
  background: #f5f7fa;
  border-color: #c0c4cc;
  color: #303133;
}
.pill.active {
  background: #ffecec;
  border-color: var(--jd-red);
  color: var(--jd-red);
  font-weight: 600;
  box-shadow: 0 0 0 2px rgba(225, 37, 27, 0.15) inset;
}
.result-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 16px;
}
.result-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.card-link {
  text-decoration: none;
  color: inherit;
  outline: none;
}
.card-image {
  position: relative;
  height: 160px;
  background: #f7f7f7;
}
.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.badge {
  position: absolute;
  left: 8px;
  top: 8px;
  background: var(--jd-red);
  color: #fff;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 12px;
}
.card-info {
  padding: 10px 12px;
}
.result-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.12);
  border-color: #e7e7e7;
}
.card-link:focus,
.result-card:active {
  outline: none;
  box-shadow: 0 0 0 2px rgba(225, 37, 27, 0.15) inset;
  border-color: var(--jd-red);
}
.title {
  font-size: 14px;
  color: #303133;
  line-height: 1.4;
  height: 2.8em;
  overflow: hidden;
}
.price {
  margin-top: 6px;
  color: var(--jd-red);
  font-weight: 700;
}
.meta {
  margin-top: 6px;
  color: #909399;
  display: flex;
  gap: 12px;
}
.search-bar {
  margin-bottom: 12px;
}
.search-group {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
}
.search-input {
  flex: 1;
}
.group-btn {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.history-chip {
  position: relative;
  padding: 6px 28px 6px 12px;
  background: #fafafa;
  border: 1px solid #ddd;
  border-radius: 16px;
  color: #606266;
  cursor: pointer;
  outline: none;
}
.history-chip:hover {
  background: #fff2f0;
  border-color: var(--jd-red);
  color: var(--jd-red);
}
.history-chip:focus,
.history-chip:active {
  outline: none;
  background: #fff;
  border-color: var(--jd-red);
  box-shadow: 0 0 0 2px rgba(225, 37, 27, 0.15) inset;
  color: var(--jd-red);
}
.chip-close {
  position: absolute;
  right: 6px;
  top: 4px;
  display: none;
}
.history-chip:hover .chip-close {
  display: inline;
}
.right-sidebar-space {
  position: relative;
}
</style>
