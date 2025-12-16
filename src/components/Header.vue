<template>
  <header class="header">
    <div class="left">
      <img src="/vite.svg" alt="logo" class="logo" />
      <span class="brand">MD App</span>
    </div>
    <div class="center">
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
    <div class="right">
      <div class="mini-player">
        <el-icon class="mp-logo" @click="goMusic"><Headset /></el-icon>
        <button class="icon-btn" type="button" @click="prev"><el-icon><CaretLeft /></el-icon></button>
        <button class="icon-btn" type="button" @click="togglePlay">
          <el-icon v-if="!isPlaying"><VideoPlay /></el-icon>
          <el-icon v-else><VideoPause /></el-icon>
        </button>
        <button class="icon-btn" type="button" @click="next"><el-icon><CaretRight /></el-icon></button>
        <audio ref="audioEl" :src="currentSrc"></audio>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts" name="Header">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Headset, CaretLeft, CaretRight, VideoPlay, VideoPause } from '@element-plus/icons-vue'

const router = useRouter()
const keyword = ref('')
const historyVisible = ref(false)
const histories = ref<string[]>([])
const audioEl = ref<HTMLAudioElement | null>(null)
const playlist = ref<string[]>([
  '/music/1.mp3',
  '/music/2.mp3',
  '/music/3.mp3'
])
const index = ref(0)
const isPlaying = ref(false)
const currentSrc = ref(playlist.value[index.value] || '')

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
const applyHistory = (q: string) => {
  keyword.value = q
  onSearch()
}
const openHistory = () => {
  refreshHistory()
  historyVisible.value = true
}
const closeHistory = () => {
  setTimeout(() => {
    historyVisible.value = false
  }, 120)
}
const onSearch = () => {
  const q = keyword.value.trim()
  if (!q) return
  setHistory(q)
  historyVisible.value = false
  router.push({ path: '/search', query: { q } })
}

const playCurrent = async () => {
  currentSrc.value = playlist.value[index.value] || ''
  if (!audioEl.value) return
  try {
    await audioEl.value.play()
    isPlaying.value = true
  } catch {
    isPlaying.value = false
  }
}
const togglePlay = async () => {
  if (!audioEl.value) return
  if (isPlaying.value) {
    audioEl.value.pause()
    isPlaying.value = false
  } else {
    await playCurrent()
  }
}
const next = async () => {
  index.value = (index.value + 1) % playlist.value.length
  await playCurrent()
}
const prev = async () => {
  index.value = (index.value - 1 + playlist.value.length) % playlist.value.length
  await playCurrent()
}
const goMusic = () => {
  router.push('/music')
}
</script>

<style scoped>
.header {
  position: sticky;
  top: 0;
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  background: var(--jd-gray-card);
  border-bottom: 1px solid #ebeef5;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.logo {
  width: 36px;
  height: 36px;
}
.brand {
  font-weight: 600;
  color: #303133;
}
.center {
  display: flex;
  align-items: center;
  gap: 8px;
}
.search-group {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
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
.right {
  display: flex;
  justify-content: flex-end;
}
.mini-player {
  display: flex;
  align-items: center;
  gap: 6px;
}
.mp-logo {
  cursor: pointer;
  color: var(--jd-red);
}
.icon-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s ease;
}
.icon-btn:hover {
  border-color: var(--jd-red);
  color: var(--jd-red);
  background: #fff2f0;
}
.icon-btn:focus,
.icon-btn:active {
  outline: none;
  box-shadow: 0 0 0 2px rgba(225, 37, 27, 0.12) inset;
}

/* 搜索按钮基础与悬浮态样式（京东红） */
:deep(.search-btn) {
  background-color: var(--jd-red);
  border-color: var(--jd-red);
  color: #fff;
  transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}
:deep(.search-btn:hover) {
  background-color: var(--jd-red-dark);
  border-color: var(--jd-red-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(225, 37, 27, 0.25);
}
:deep(.search-btn:focus),
:deep(.search-btn:active) {
  box-shadow: none;
  outline: none;
}
</style>
