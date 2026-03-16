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
            <el-button
              type="primary"
              size="large"
              class="search-btn group-btn"
              :loading="loading"
              @click="onSearch"
              >搜索</el-button
            >
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
          @click="setSort(opt.value)"
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
          :class="{ active: opt.value === pricePreset }"
          @click="applyPricePreset(opt.value)"
        >
          {{ opt.label }}
        </button>
        <div class="price-range">
          <el-input-number
            v-model="minPrice"
            :min="0"
            :controls="false"
            placeholder="最低价"
            class="price-input"
          />
          <span class="range-sep">-</span>
          <el-input-number
            v-model="maxPrice"
            :min="0"
            :controls="false"
            placeholder="最高价"
            class="price-input"
          />
          <el-button size="small" class="apply-btn" @click="applyFilters">应用</el-button>
        </div>
      </div>
      <div class="filter-group sku-group">
        <span class="filter-title">规格</span>
        <div class="sku-input-wrap">
          <el-input
            v-model="skuAttrInput"
            placeholder='添加规格筛选，如 "颜色:白色"'
            size="default"
            class="sku-input"
            @keydown.enter.prevent="addSkuAttr"
          />
          <el-button size="small" @click="addSkuAttr">添加</el-button>
          <el-button size="small" type="danger" plain @click="resetFilters">重置</el-button>
        </div>
        <div class="sku-tags" v-if="skuAttrs.length">
          <el-tag
            v-for="t in skuAttrs"
            :key="t"
            class="sku-tag"
            closable
            @close="removeSkuAttr(t)"
            >{{ t }}</el-tag
          >
        </div>
      </div>
    </div>

    <el-empty v-if="!q" description="请输入关键词进行搜索" />
    <el-empty v-else-if="searched && !loading && !items.length" description="暂无搜索结果" />

    <div v-else class="result-grid">
      <router-link v-for="p in items" :key="p.id" :to="`/product/${p.id}`" class="result-card card-link">
        <div class="card-image">
          <img :src="p.image" :alt="p.title" />
          <span class="badge">精选</span>
        </div>
        <div class="card-info">
          <div class="title">{{ p.title }}</div>
          <div class="price">￥{{ p.priceText }}</div>
          <div class="meta">
            <span v-if="p.skuText">{{ p.skuText }}</span>
            <span v-else-if="p.clickTimes != null">点击 {{ p.clickTimes }}</span>
          </div>
        </div>
      </router-link>
    </div>

    <div class="pager" v-if="q && total > pageSize">
      <el-pagination
        background
        layout="prev, pager, next, sizes, total"
        :total="total"
        :current-page="pageNum"
        :page-size="pageSize"
        :page-sizes="[10, 20, 30, 50]"
        @current-change="onPageChange"
        @size-change="onPageSizeChange"
      />
    </div>
  </div>
  <RightSidebar />
</template>

<script setup lang="ts" name="Search">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import RightSidebar from '@/components/RightSidebar.vue'
import request from '@/utils/request'
import { formatMoney, parseSkuAttrs, pickGoodsPriceValue, skuAttrsToLabel } from '@/utils/goods'

type SearchItem = {
  id: number
  title: string
  image: string
  priceText: string
  skuText: string
  clickTimes: number | null
}

const route = useRoute()
const router = useRouter()
const q = computed(() => (route.query.q as string) || '')
const keyword = ref(q.value)


const toNumberOrNull = (v: any): number | null => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const toIntOrDefault = (v: any, d: number): number => {
  const n = parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) && n > 0 ? n : d
}
const toStringArray = (v: any): string[] => {
  if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean)
  if (v == null) return []
  const s = String(v).trim()
  return s ? [s] : []
}

const sortOptions = [
  { label: '综合', value: 'comprehensive' },
  { label: '销量', value: 'sales' },
  { label: '价格↑', value: 'priceAsc' },
  { label: '价格↓', value: 'priceDesc' }
]
const priceOptions = [
  { label: '全部', value: 'all' },
  { label: '0-50', value: '0-50' },
  { label: '50-100', value: '50-100' },
  { label: '100-200', value: '100-200' },
  { label: '200+', value: '200+' }
]

const sort = ref<string>('comprehensive')
const pricePreset = ref<string>('all')
const minPrice = ref<number | null>(null)
const maxPrice = ref<number | null>(null)
const skuAttrInput = ref('')
const skuAttrs = ref<string[]>([])
const pageNum = ref<number>(1)
const pageSize = ref<number>(10)

const items = ref<SearchItem[]>([])
const total = ref(0)
const loading = ref(false)
const searched = ref(false)
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
  pageNum.value = 1
  updateRouteQuery(false)
}

const applyFilters = () => {
  pageNum.value = 1
  updateRouteQuery(true)
}

const setSort = (v: string) => {
  sort.value = v
  pageNum.value = 1
  updateRouteQuery(true)
}

const applyPricePreset = (v: string) => {
  pricePreset.value = v
  if (v === 'all') {
    minPrice.value = null
    maxPrice.value = null
  } else if (v === '200+') {
    minPrice.value = 200
    maxPrice.value = null
  } else {
    const [a, b] = v.split('-')
    minPrice.value = toNumberOrNull(a)
    maxPrice.value = toNumberOrNull(b)
  }
  pageNum.value = 1
  updateRouteQuery(true)
}

const addSkuAttr = () => {
  const t = skuAttrInput.value.trim()
  if (!t) return
  if (!skuAttrs.value.includes(t)) skuAttrs.value = [...skuAttrs.value, t]
  skuAttrInput.value = ''
  pageNum.value = 1
  updateRouteQuery(true)
}

const removeSkuAttr = (t: string) => {
  skuAttrs.value = skuAttrs.value.filter(x => x !== t)
  pageNum.value = 1
  updateRouteQuery(true)
}

const resetFilters = () => {
  sort.value = 'comprehensive'
  pricePreset.value = 'all'
  minPrice.value = null
  maxPrice.value = null
  skuAttrs.value = []
  pageNum.value = 1
  updateRouteQuery(true)
}

const onPageChange = (p: number) => {
  pageNum.value = p
  updateRouteQuery(true)
}
const onPageSizeChange = (s: number) => {
  pageSize.value = s
  pageNum.value = 1
  updateRouteQuery(true)
}

const updateRouteQuery = (replace: boolean) => {
  const qv = keyword.value.trim()
  const query: any = {}
  if (qv) query.q = qv
  if (minPrice.value != null) query.minPrice = String(minPrice.value)
  if (maxPrice.value != null) query.maxPrice = String(maxPrice.value)
  if (skuAttrs.value.length) query.skuAttrs = skuAttrs.value
  if (sort.value && sort.value !== 'comprehensive') query.sort = sort.value
  query.pageNum = String(pageNum.value)
  query.pageSize = String(pageSize.value)
  if (replace) router.replace({ path: '/search', query })
  else router.push({ path: '/search', query })
}

const baseURL = request?.defaults?.baseURL || ''
const normalizeAvatar = (p: string) => {
  if (!p) return ''
  let s = String(p).trim().replace(/\\/g, '/')
  if (s.startsWith('http') || s.startsWith('data:')) return s
  const uploadIdx = s.toLowerCase().lastIndexOf('/upload/')
  if (uploadIdx >= 0) {
    s = s.slice(uploadIdx)
  }
  if (!/\/upload\//i.test(s) && !/\/carouseImg\//i.test(s)) {
    const parts = s.split('/')
    const filename = parts[parts.length - 1]
    s = '/upload/' + filename
  }
  const b = baseURL?.endsWith('/') ? baseURL.slice(0, -1) : baseURL
  s = s.startsWith('/') ? s : '/' + s
  const url = b + s
  return url.replace(/([^:])\/{2,}/g, '$1/')
}

const extractListAndTotal = (d: any): { list: any[]; total: number } => {
  if (Array.isArray(d)) return { list: d, total: d.length }
  const list =
    (Array.isArray(d?.records) && d.records) ||
    (Array.isArray(d?.list) && d.list) ||
    (Array.isArray(d?.rows) && d.rows) ||
    []
  const total =
    Number(d?.total ?? d?.totalCount ?? d?.count ?? d?.totalElements ?? list.length) || 0
  return { list, total }
}

const mapGoodsToItem = (g: any): SearchItem | null => {
  const id = Number(g?.id)
  if (!Number.isFinite(id)) return null
  const title = String(g?.title ?? '').trim()
  let pic = ''
  if (Array.isArray(g?.pic) && g.pic.length) pic = String(g.pic[0] ?? '')
  else if (typeof g?.pic === 'string') pic = g.pic.split(',').filter(Boolean)[0] || ''
  const image = normalizeAvatar(pic) || '/carouseImg/1.jpg'
  const priceText = formatMoney(pickGoodsPriceValue(g))
  const firstSku = Array.isArray(g?.skus) && g.skus.length ? g.skus[0] : null
  const skuText = firstSku ? skuAttrsToLabel(parseSkuAttrs(firstSku?.skuAttrs ?? firstSku?.sku_attrs)) : ''
  const clickTimes = g?.clickTimes != null ? Number(g.clickTimes) || 0 : null
  return { id, title, image, priceText, skuText, clickTimes }
}

const fetchSearch = async () => {
  const keywordParam = String(route.query.q ?? '').trim()
  if (!keywordParam) {
    items.value = []
    total.value = 0
    searched.value = false
    return
  }
  loading.value = true
  searched.value = true
  try {
    const params: any = {
      keyword: keywordParam,
      pageNum: pageNum.value,
      pageSize: pageSize.value
    }
    if (minPrice.value != null) params.minPrice = minPrice.value
    if (maxPrice.value != null) params.maxPrice = maxPrice.value
    if (skuAttrs.value.length) params.skuAttrs = skuAttrs.value
    if (sort.value && sort.value !== 'comprehensive') params.sort = sort.value

    const res: any = await request.get('goods/search', { params })
    const ok = res?.code === 200 || res?.success === true
    if (!ok) {
      items.value = []
      total.value = 0
      ElMessage.error(res?.msg || '搜索失败')
      return
    }
    const { list, total: tot } = extractListAndTotal(res?.data)
    items.value = list.map(mapGoodsToItem).filter((x: SearchItem | null): x is SearchItem => x != null)
    total.value = tot
  } catch (e: any) {
    items.value = []
    total.value = 0
    ElMessage.error(e?.message || '搜索失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => route.query,
  qy => {
    keyword.value = String(qy.q ?? '')
    minPrice.value = toNumberOrNull(qy.minPrice)
    maxPrice.value = toNumberOrNull(qy.maxPrice)
    skuAttrs.value = toStringArray(qy.skuAttrs)
    sort.value = String(qy.sort ?? 'comprehensive')
    pageNum.value = toIntOrDefault(qy.pageNum, 1)
    pageSize.value = toIntOrDefault(qy.pageSize, 10)

    const inferredPreset = (() => {
      if (minPrice.value == null && maxPrice.value == null) return 'all'
      if (minPrice.value === 200 && maxPrice.value == null) return '200+'
      if (minPrice.value != null && maxPrice.value != null) return `${minPrice.value}-${maxPrice.value}`
      return 'all'
    })()
    pricePreset.value = priceOptions.some(p => p.value === inferredPreset) ? inferredPreset : 'all'

    fetchSearch()
  },
  { immediate: true }
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
  flex-wrap: wrap;
}
.filter-title {
  color: #606266;
  white-space: nowrap;
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
.price-range {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.price-input {
  width: 120px;
}
.range-sep {
  color: #909399;
}
.apply-btn {
  margin-left: 4px;
}
.sku-group {
  width: 100%;
  align-items: flex-start;
}
.sku-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}
.sku-input {
  width: min(420px, 100%);
}
.sku-tags {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.sku-tag {
  border-radius: 16px;
}
.result-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 16px;
}
.result-card {
  display: block;
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
  min-height: 18px;
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
.pager {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
