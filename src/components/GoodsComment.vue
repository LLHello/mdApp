<template>
  <div class="gc-wrap">
    <!-- 头部统计 -->
    <div class="gc-header">
      <span class="gc-title">商品评价</span>
      <div class="gc-stat" v-if="stat">
        <div class="gc-avg">
          <span class="gc-avg-num">{{ stat.avgRating || 0 }}</span>
          <span class="gc-avg-unit">分</span>
        </div>
        <div class="gc-stars">
          <el-rate :model-value="stat.avgRating" disabled :colors="rateColors" allow-half />
          <span class="gc-total">共 {{ stat.total }} 条评价</span>
        </div>
      </div>
    </div>

    <!-- 用户写评论入口 -->
    <div class="gc-write" v-if="isLoggedIn">
      <div class="gc-write-header" @click="toggleWrite">
        <span>{{ showWrite ? '收起评论' : '写评论' }}</span>
        <el-icon><ArrowDown v-if="!showWrite" /><ArrowUp v-else /></el-icon>
      </div>
      <transition name="gc-slide">
        <div class="gc-write-body" v-if="showWrite">
          <div class="gc-rate-row">
            <span class="gc-rate-label">评分：</span>
            <el-rate v-model="newComment.rating" :colors="rateColors" />
          </div>
          <el-input
            v-model="newComment.content"
            type="textarea"
            :rows="3"
            placeholder="分享你的使用体验...（最多 300 字）"
            maxlength="300"
            show-word-limit
            resize="none"
          />
          <div class="gc-write-actions">
            <el-button type="primary" size="small" :loading="submitting" @click="submitComment">
              发布评论
            </el-button>
          </div>
        </div>
      </transition>
    </div>

    <!-- 评论列表 -->
    <div class="gc-list">
      <el-empty v-if="!loading && list.length === 0" description="暂无评价，快来抢先评论吧" :image-size="80" />

      <div v-for="item in list" :key="item.id" class="gc-item">
        <!-- 一级评论 -->
        <div class="gc-comment gc-lv1">
          <img class="gc-avatar" :src="avatarUrl(item.userIcon)" alt="头像" @error="onAvatarError" />
          <div class="gc-body">
            <div class="gc-meta">
              <span class="gc-name">{{ item.username || '匿名用户' }}</span>
              <el-rate
                v-if="item.rating"
                :model-value="item.rating"
                disabled
                size="small"
                :colors="rateColors"
                class="gc-inline-rate"
              />
              <span class="gc-time">{{ item.createTime }}</span>
            </div>
            <div class="gc-content">{{ item.content }}</div>
            <!-- 回复按钮 -->
            <div class="gc-actions" v-if="isLoggedIn">
              <span class="gc-reply-btn" @click="openReply(item)">回复</span>
            </div>
            <!-- 回复输入框 -->
            <transition name="gc-slide">
              <div class="gc-reply-input" v-if="replyTarget && replyTarget.id === item.id">
                <el-input
                  v-model="replyContent"
                  type="textarea"
                  :rows="2"
                  :placeholder="`回复 @${item.username || '匿名用户'}...`"
                  maxlength="200"
                  show-word-limit
                  resize="none"
                />
                <div class="gc-reply-actions">
                  <el-button size="small" @click="cancelReply">取消</el-button>
                  <el-button type="primary" size="small" :loading="replySubmitting" @click="submitReply(item)">
                    回复
                  </el-button>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <!-- 二级评论区 -->
        <div class="gc-replies" v-if="item.replies && item.replies.length">
          <div v-for="reply in item.replies" :key="reply.id" class="gc-comment gc-lv2">
            <img class="gc-avatar gc-avatar-sm" :src="avatarUrl(reply.userIcon)" alt="头像" @error="onAvatarError" />
            <div class="gc-body">
              <div class="gc-meta">
                <span class="gc-name">{{ reply.username || '匿名用户' }}</span>
                <span class="gc-reply-to" v-if="reply.replyToUsername">
                  回复 <em>@{{ reply.replyToUsername }}</em>
                </span>
                <span class="gc-time">{{ reply.createTime }}</span>
              </div>
              <div class="gc-content">{{ reply.content }}</div>
              <!-- 回复二级评论 -->
              <div class="gc-actions" v-if="isLoggedIn">
                <span class="gc-reply-btn" @click="openReply(item, reply)">回复</span>
              </div>
              <transition name="gc-slide">
                <div class="gc-reply-input" v-if="replyTarget && replyTarget.subId === reply.id">
                  <el-input
                    v-model="replyContent"
                    type="textarea"
                    :rows="2"
                    :placeholder="`回复 @${reply.username || '匿名用户'}...`"
                    maxlength="200"
                    show-word-limit
                    resize="none"
                  />
                  <div class="gc-reply-actions">
                    <el-button size="small" @click="cancelReply">取消</el-button>
                    <el-button type="primary" size="small" :loading="replySubmitting" @click="submitReply(item, reply)">
                      回复
                    </el-button>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="gc-loading" v-if="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      加载评论中...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown, ArrowUp, Loading } from '@element-plus/icons-vue'
import request from '@/utils/request'

const props = defineProps<{ goodsId: number | string }>()

// ---- state ----
const list = ref<any[]>([])
const stat = ref<{ total: number; avgRating: number } | null>(null)
const loading = ref(false)
const showWrite = ref(false)
const submitting = ref(false)
const replySubmitting = ref(false)
const replyContent = ref('')
const replyTarget = ref<{ id: number; subId?: number; replyToUserId?: number } | null>(null)
const newComment = ref({ rating: 5, content: '' })

const rateColors = ['#F7BA2A', '#F7BA2A', '#FF9900']

const baseURL: string = (request as any)?.defaults?.baseURL || ''

// ---- computed ----
const userInfo = computed(() => {
  try {
    const raw = sessionStorage.getItem('user_user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
})

const isLoggedIn = computed(() =>
  sessionStorage.getItem('user_isLoggedIn') === '1' && userInfo.value !== null
)

// ---- helpers ----
const avatarUrl = (icon: string) => {
  if (!icon) return '/vite.svg'
  if (icon.startsWith('http') || icon.startsWith('data:')) return icon
  const idx = icon.toLowerCase().lastIndexOf('/upload/')
  const path = idx >= 0 ? icon.slice(idx) : '/upload/' + icon.split('/').pop()
  const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
  return (base + path).replace(/([^:])\/{2,}/g, '$1/')
}

const onAvatarError = (e: Event) => {
  (e.target as HTMLImageElement).src = '/vite.svg'
}

// ---- data fetching ----
const fetchComments = async () => {
  if (!props.goodsId) return
  loading.value = true
  try {
    const res: any = await request.get(`comment/list/${props.goodsId}`)
    if (res?.code === 200 || res?.success === true) {
      list.value = res.data || []
    }
  } catch (e) {
    console.error('fetch comments error', e)
  } finally {
    loading.value = false
  }
}

const fetchStat = async () => {
  if (!props.goodsId) return
  try {
    const res: any = await request.get(`comment/stat/${props.goodsId}`)
    if (res?.code === 200 || res?.success === true) {
      stat.value = res.data
    }
  } catch {}
}

// ---- write comment ----
const toggleWrite = () => { showWrite.value = !showWrite.value }

const submitComment = async () => {
  if (!newComment.value.content.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }
  submitting.value = true
  try {
    const res: any = await request.post('comment/add', {
      goodsId: Number(props.goodsId),
      content: newComment.value.content.trim(),
      rating: newComment.value.rating,
    })
    if (res?.code === 200 || res?.success === true) {
      ElMessage.success('评论发布成功！')
      newComment.value = { rating: 5, content: '' }
      showWrite.value = false
      await fetchComments()
      await fetchStat()
    } else {
      ElMessage.error(res?.msg || '评论失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '评论失败')
  } finally {
    submitting.value = false
  }
}

// ---- reply ----
const openReply = (parent: any, sub?: any) => {
  if (sub) {
    replyTarget.value = { id: parent.id, subId: sub.id, replyToUserId: sub.userId }
  } else {
    replyTarget.value = { id: parent.id, replyToUserId: parent.userId }
  }
  replyContent.value = ''
}

const cancelReply = () => {
  replyTarget.value = null
  replyContent.value = ''
}

const submitReply = async (parent: any, sub?: any) => {
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  if (!replyTarget.value) return
  replySubmitting.value = true
  try {
    const res: any = await request.post('comment/add', {
      goodsId: Number(props.goodsId),
      parentId: parent.id,
      replyToUserId: replyTarget.value.replyToUserId,
      content: replyContent.value.trim(),
    })
    if (res?.code === 200 || res?.success === true) {
      ElMessage.success('回复成功！')
      cancelReply()
      await fetchComments()
    } else {
      ElMessage.error(res?.msg || '回复失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '回复失败')
  } finally {
    replySubmitting.value = false
  }
}

// ---- lifecycle ----
onMounted(() => {
  fetchComments()
  fetchStat()
})

watch(() => props.goodsId, () => {
  fetchComments()
  fetchStat()
})
</script>

<style scoped>
.gc-wrap {
  margin-top: 32px;
  padding: 0 0 24px;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.gc-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 0 12px;
  border-bottom: 2px solid #f0f0f0;
  margin-bottom: 20px;
}
.gc-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  position: relative;
}
.gc-title::after {
  content: '';
  position: absolute;
  bottom: -14px;
  left: 0;
  width: 100%;
  height: 2px;
  background: #e1251b;
}
.gc-stat { display: flex; align-items: center; gap: 16px; }
.gc-avg { display: flex; align-items: baseline; gap: 2px; }
.gc-avg-num { font-size: 32px; font-weight: 800; color: #ff6b00; line-height: 1; }
.gc-avg-unit { font-size: 13px; color: #999; }
.gc-stars { display: flex; flex-direction: column; gap: 4px; }
.gc-total { font-size: 12px; color: #999; }
.gc-write {
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 24px;
  overflow: hidden;
}
.gc-write-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #e1251b;
  font-weight: 600;
  user-select: none;
  transition: background 0.15s;
}
.gc-write-header:hover { background: #fff0f0; }
.gc-write-body { padding: 12px 16px 16px; border-top: 1px solid #f0f0f0; }
.gc-rate-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.gc-rate-label { font-size: 13px; color: #606266; }
.gc-write-actions { margin-top: 10px; display: flex; justify-content: flex-end; }
.gc-item { border-bottom: 1px solid #f5f5f5; padding: 16px 0; }
.gc-item:last-child { border-bottom: none; }
.gc-comment { display: flex; gap: 12px; }
.gc-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  object-fit: cover; flex-shrink: 0;
  border: 2px solid #f0f0f0; background: #f5f5f5;
}
.gc-avatar-sm { width: 30px; height: 30px; }
.gc-body { flex: 1; min-width: 0; }
.gc-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
.gc-name { font-size: 14px; font-weight: 600; color: #303133; }
.gc-inline-rate { display: inline-flex !important; }
.gc-time { font-size: 12px; color: #bbb; margin-left: auto; }
.gc-content { font-size: 14px; color: #444; line-height: 1.7; word-break: break-all; }
.gc-actions { margin-top: 6px; }
.gc-reply-btn {
  font-size: 12px; color: #999; cursor: pointer;
  padding: 2px 6px; border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}
.gc-reply-btn:hover { color: #e1251b; background: #fff0f0; }
.gc-reply-input { margin-top: 10px; background: #f9f9f9; border-radius: 6px; padding: 10px; }
.gc-reply-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.gc-replies {
  margin-top: 10px;
  margin-left: 52px;
  background: #f9f9f9;
  border-left: 3px solid #f0f0f0;
  border-radius: 0 6px 6px 0;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.gc-reply-to { font-size: 12px; color: #aaa; }
.gc-reply-to em { color: #e1251b; font-style: normal; }
.gc-loading {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; color: #aaa; font-size: 13px; padding: 24px 0;
}
.gc-slide-enter-active, .gc-slide-leave-active { transition: all 0.2s ease; overflow: hidden; }
.gc-slide-enter-from, .gc-slide-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
.gc-slide-enter-to, .gc-slide-leave-from { opacity: 1; max-height: 400px; }
</style> 