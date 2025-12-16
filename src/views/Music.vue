<template>
  <div class="music-page">
    <div class="top">
      <div class="logo">音乐</div>
      <div class="controls">
        <button class="icon-btn" type="button" @click="prev"><el-icon><CaretLeft /></el-icon></button>
        <button class="icon-btn" type="button" @click="togglePlay">
          <el-icon v-if="!isPlaying"><VideoPlay /></el-icon>
          <el-icon v-else><VideoPause /></el-icon>
        </button>
        <button class="icon-btn" type="button" @click="next"><el-icon><CaretRight /></el-icon></button>
      </div>
    </div>
    <div class="playlist">
      <div
        v-for="(s, i) in playlist"
        :key="s"
        class="song"
        :class="{ active: i === index }"
        @click="playIndex(i)"
      >
        第{{ i + 1 }}首
      </div>
    </div>
    <audio ref="audioEl" :src="currentSrc"></audio>
  </div>
</template>

<script setup lang="ts" name="Music">
import { ref } from 'vue'
import { CaretLeft, CaretRight, VideoPlay, VideoPause } from '@element-plus/icons-vue'

const audioEl = ref<HTMLAudioElement | null>(null)
const playlist = ref<string[]>([
  '/music/1.mp3',
  '/music/2.mp3',
  '/music/3.mp3'
])
const index = ref(0)
const isPlaying = ref(false)
const currentSrc = ref(playlist.value[index.value] || '')

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
const playIndex = async (i: number) => {
  index.value = i
  await playCurrent()
}
</script>

<style scoped>
.music-page {
  padding: 16px 24px;
}
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.logo {
  font-weight: 700;
  color: var(--jd-red);
  font-size: 20px;
}
.controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.icon-btn {
  width: 32px;
  height: 32px;
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
.playlist {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.song {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  background: #fff;
}
.song.active {
  border-color: var(--jd-red);
  color: var(--jd-red);
  background: #fff2f0;
}
</style>
