<template>
  <aside class="right-sidebar">
    <button class="item" type="button" @click="go('/messages')" @mouseenter="playAnim('messages')" @mouseleave="stopAnim('messages')">
      <div class="icon-wrap" ref="messagesIcon">
        <el-icon v-show="!animsLoaded.messages"><Bell /></el-icon>
      </div>
      <div class="label">消息</div>
      <span class="badge" v-if="badgeCount > 0">{{ badgeCount }}</span>
    </button>
    <button class="item" type="button" @click="go('/cart')" @mouseenter="playAnim('cart')" @mouseleave="stopAnim('cart')">
      <div class="icon-wrap" ref="cartIcon">
        <el-icon v-show="!animsLoaded.cart"><ShoppingCart /></el-icon>
      </div>
      <div class="label">购物车</div>
      <span class="badge">25</span>
    </button>
    <button class="item" type="button" @click="go('/profile')" @mouseenter="playAnim('profile')" @mouseleave="stopAnim('profile')">
      <div class="icon-wrap" ref="profileIcon">
        <el-icon v-show="!animsLoaded.profile"><User /></el-icon>
      </div>
      <div class="label">我的</div>
    </button>
    <button class="item" type="button" @click="toggleChat" @mouseenter="playAnim('service')" @mouseleave="stopAnim('service')">
      <div class="icon-wrap" ref="serviceIcon">
        <el-icon v-show="!animsLoaded.service"><Headset /></el-icon>
      </div>
      <div class="label">AI客服</div>
    </button>
    <div v-show="showChat" class="chat-window">
      <div class="chat-header">
        <span>AI 智能客服</span>
        <el-icon class="close-btn" @click="showChat = false"><Close /></el-icon>
      </div>
      <div class="chat-body" ref="chatBodyRef">
        <div v-if="messages.length === 0" class="empty-chat">
          <p>您好！我是您的专属 AI 客服，请问有什么可以帮您？</p>
        </div>
        <div v-for="(msg, idx) in messages" :key="idx" :class="['message-row', msg.role]">
          <div class="message-bubble" v-html="md.render(msg.content)"></div>
        </div>
        <div v-if="chatLoading" class="message-row ai">
          <div class="message-bubble loading">
            <span>.</span><span>.</span><span>.</span>
          </div>
        </div>
      </div>
      <div class="chat-footer">
        <el-input 
          v-model="inputContent" 
          placeholder="请输入您的问题..." 
          @keyup.enter="sendMessage"
          :disabled="chatLoading"
        >
          <template #append>
            <el-button @click="sendMessage" :loading="chatLoading">发送</el-button>
          </template>
        </el-input>
      </div>
    </div>
    <button class="item" type="button" @click="go('/feedback')" @mouseenter="playAnim('feedback')" @mouseleave="stopAnim('feedback')">
      <div class="icon-wrap" ref="feedbackIcon">
        <el-icon v-show="!animsLoaded.feedback"><EditPen /></el-icon>
      </div>
      <div class="label">反馈</div>
    </button>
    <el-popover placement="left" :width="350" trigger="click" popper-class="favorite-popover">
      <template #reference>
        <button class="item" type="button" @mouseenter="playAnim('favorite')" @mouseleave="stopAnim('favorite')">
          <div class="icon-wrap" ref="favoriteIcon">
            <el-icon v-show="!animsLoaded.favorite"><Star /></el-icon>
          </div>
          <div class="label">收藏</div>
        </button>
      </template>
      <div class="favorite-popover-content">
        <el-tabs v-model="favoriteTab">
          <el-tab-pane label="收藏的商家" name="merchant">
            <div class="favorite-list-mini">
              <el-empty v-if="!merchantFavorites.length" description="暂无收藏" image-size="60" />
              <div v-else v-for="item in merchantFavorites" :key="item.id" class="favorite-item-mini" @click="goToMerchant(item.targetId)">
                <img :src="normalizeAvatar(item.avatar || '')" class="fav-img" />
                <div class="fav-info">
                  <div class="fav-name">{{ item.name || '未知商家' }}</div>
                </div>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="收藏的商品" name="product">
            <div class="favorite-list-mini">
              <el-empty v-if="!productFavorites.length" description="暂无收藏" image-size="60" />
              <div v-else v-for="item in productFavorites" :key="item.id" class="favorite-item-mini" @click="goToProduct(item.targetId)">
                <img :src="normalizeAvatar(item.pic || '')" class="fav-img" />
                <div class="fav-info">
                  <div class="fav-name">{{ item.title || '未知商品' }}</div>
                  <div class="fav-price" v-if="item.price">¥{{ item.price }}</div>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-popover>
  </aside>
</template>

<script setup lang="ts" name="RightSidebar">
import { useRouter } from 'vue-router'
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { unreadCount } from '@/utils/notice'
import request from '@/utils/request'
import lottie from 'lottie-web'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

// Custom renderer to open links in new tab
const defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  // Add target="_blank" to all links
  const aIndex = tokens[idx].attrIndex('target');
  if (aIndex < 0) {
    tokens[idx].attrPush(['target', '_blank']);
  } else {
    tokens[idx].attrs![aIndex][1] = '_blank';
  }
  return defaultRender(tokens, idx, options, env, self);
};

const router = useRouter()
const go = (path: string) => router.push(path)
const badgeCount = ref<number>(0)

// Lottie refs
const messagesIcon = ref<HTMLElement>()
const cartIcon = ref<HTMLElement>()
const profileIcon = ref<HTMLElement>()
const serviceIcon = ref<HTMLElement>()
const feedbackIcon = ref<HTMLElement>()
const favoriteIcon = ref<HTMLElement>()

// Chat Logic
const showChat = ref(false)
const inputContent = ref('')
const messages = ref<{role: 'user'|'ai', content: string}[]>([])
const chatLoading = ref(false)
const chatBodyRef = ref<HTMLElement>()

const toggleChat = () => {
  showChat.value = !showChat.value
  if (showChat.value) {
    scrollToBottom()
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatBodyRef.value) {
      chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
    }
  })
}

const sendMessage = async () => {
  if (!inputContent.value.trim() || chatLoading.value) return
  
  const msg = inputContent.value.trim()
  messages.value.push({ role: 'user', content: msg })
  inputContent.value = ''
  scrollToBottom()
  
  chatLoading.value = true
  
  try {
    const params = new URLSearchParams()
    params.append('message', msg)
    const res: any = await request.post('/chat/ask', params)
    
    let reply = ''
    if (typeof res === 'string') {
      reply = res
    } else if (res?.code === 200 || res?.success) {
      reply = res.data
    } else {
      // Fallback if the response structure is different or raw string in data
      reply = res?.data || res?.msg || '抱歉，我没有理解您的问题。'
    }
    
    messages.value.push({ role: 'ai', content: reply })
  } catch (e: any) {
    console.error('Chat error:', e)
    let errorMsg = "网络错误，请稍后再试。"
    if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
      errorMsg = "AI 思考超时，请检查网络或稍后再试。"
    } else if (e.response?.status === 404) {
      errorMsg = "后端接口未找到 (404)，请检查后端服务是否启动。"
    } else if (e.response?.status === 500) {
      errorMsg = "后端服务内部错误 (500)，请检查后端日志。"
    }
    messages.value.push({ role: 'ai', content: errorMsg })
  } finally {
    chatLoading.value = false
    scrollToBottom()
  }
}

const anims: Record<string, any> = {}
const animsLoaded = ref<Record<string, boolean>>({})

// Favorite logic
const favoriteTab = ref('merchant')
const merchantFavorites = ref<any[]>([])
const productFavorites = ref<any[]>([])
const user = ref<any>(null)

const getUid = () => {
  try {
    const raw = sessionStorage.getItem('user_user')
    const u = raw ? JSON.parse(raw) : null
    return u?.id ?? u?.userId ?? u?.uid ?? null
  } catch { return null }
}

const baseURL = request?.defaults?.baseURL || "";
const normalizeAvatar = (p: string) => {
  if (!p) return "";
  let s = String(p).trim().replace(/\\/g, "/");
  if (s.startsWith("http") || s.startsWith("data:")) return s;
  const uploadIdx = s.toLowerCase().lastIndexOf("/upload/");
  if (uploadIdx >= 0) s = s.slice(uploadIdx);
  if (!/\/upload\//i.test(s)) {
    const parts = s.split("/");
    const filename = parts[parts.length - 1];
    s = "/upload/" + filename;
  }
  const b = baseURL?.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
  s = s.startsWith("/") ? s : "/" + s;
  const url = b + s;
  return url.replace(/([^:])\/{2,}/g, "$1/");
};

const fetchFavorites = async () => {
  const uid = getUid()
  if (!uid) return;
  try {
    const res: any = await request.get("favorite/getStar", {
      params: { userId: uid }
    });
    
    if (res?.code === 200 || res?.success === true) {
      const list = res.data || [];
      const merchants = list.filter((i: any) => i.targetType === 0);
      const products = list.filter((i: any) => i.targetType === 1);
      
      const merchantPromises = merchants.map(async (item: any) => {
        try {
          const uRes: any = await request.get(`users/${item.targetId}`);
          const uData = (uRes?.code === 200 || uRes?.success === true) ? uRes.data : {};
          return {
            ...item,
            name: uData.username || uData.account || uData.nickname,
            avatar: uData.icon || uData.avatar || uData.pic
          };
        } catch {
          return item;
        }
      });
      merchantFavorites.value = await Promise.all(merchantPromises);

      const productPromises = products.map(async (item: any) => {
        try {
          const gRes: any = await request.get(`goods/good/${item.targetId}`);
          const gData = (gRes?.code === 200 || gRes?.success === true) ? gRes.data : {};
          let pic = '';
          if (gData.pic) {
             const pics = Array.isArray(gData.pic) ? gData.pic : String(gData.pic).split(',');
             pic = pics[0];
          }
          return {
            ...item,
            title: gData.title,
            price: gData.price,
            pic: pic
          };
        } catch {
          return item;
        }
      });
      productFavorites.value = await Promise.all(productPromises);
    }
  } catch (e) {
    console.error("Fetch favorites failed", e);
  }
};

const goToMerchant = (id: number) => {
  if (id) router.push(`/merchant/${id}`);
};

const goToProduct = (id: number) => {
  router.push(`/product/${id}`);
};

const refreshBadge = () => {
  const uid = getUid()
  if (uid != null) badgeCount.value = unreadCount('user', uid)
}
const onNew = () => refreshBadge()

const initLottie = (key: string, el: HTMLElement, path: string) => {
  if (!el) return
  if (anims[key]) {
    anims[key].destroy()
  }
  try {
    const anim = lottie.loadAnimation({
      container: el,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      path: path
    })
    
    // 监听加载成功事件
    anim.addEventListener('DOMLoaded', () => {
      animsLoaded.value[key] = true
    })
    
    // 监听错误事件（虽然 lottie-web 的错误处理比较有限，但值得加上）
    anim.addEventListener('data_failed', () => {
      animsLoaded.value[key] = false
    })
    
    anims[key] = anim
  } catch (e) {
    console.warn(`Lottie init failed for ${key}`, e)
    animsLoaded.value[key] = false
  }
}

const playAnim = (key: string) => {
  if (anims[key]) {
    anims[key].stop()
    anims[key].play()
  }
  // 如果是收藏，hover时也刷新一下数据
  if (key === 'favorite') {
    fetchFavorites()
  }
}

const stopAnim = (key: string) => {
  // Optional: anims[key]?.stop()
}

onMounted(() => {
  refreshBadge()
  fetchFavorites()
  window.addEventListener('notice:new', onNew as any)
  window.addEventListener('notice:readall', onNew as any)
  window.addEventListener('notice:read', onNew as any)

  nextTick(() => {
    // 使用 Lottie 官方或一些免费的 JSON 资源
    // 这里使用一些示例 JSON URL，实际项目中建议下载到本地 assets
    // 消息 (Bell)
    initLottie('messages', messagesIcon.value!, 'https://assets10.lottiefiles.com/packages/lf20_dvba73.json')
    // 购物车
    initLottie('cart', cartIcon.value!, 'https://assets9.lottiefiles.com/packages/lf20_3b15j9.json')
    // 我的 (User)
    initLottie('profile', profileIcon.value!, 'https://assets2.lottiefiles.com/packages/lf20_lyp6w8.json')
    // 客服 (Headset)
    initLottie('service', serviceIcon.value!, 'https://assets2.lottiefiles.com/packages/lf20_in4cuf.json')
    // 反馈 (Edit)
    initLottie('feedback', feedbackIcon.value!, 'https://assets5.lottiefiles.com/packages/lf20_7s279k.json')
    // 收藏 (Star)
    initLottie('favorite', favoriteIcon.value!, 'https://assets4.lottiefiles.com/packages/lf20_n2m0is.json')
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('notice:new', onNew as any)
  window.removeEventListener('notice:readall', onNew as any)
  window.removeEventListener('notice:read', onNew as any)
  Object.values(anims).forEach(anim => anim.destroy())
})
</script>

<style scoped>
.right-sidebar {
  position: fixed;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 16px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.08);
  padding: 8px 4px;
  z-index: 1000;
}
.item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  margin: 4px 0;
  color: #303133;
  background: transparent;
  border: none;
  width: 100%;
  cursor: pointer;
  padding: 8px 0;
  border-radius: 12px;
  transition: all 0.2s ease;
  outline: none;
  position: relative;
}
.icon-wrap {
  position: relative;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.badge {
  position: absolute;
  right: 4px;
  top: 4px;
  background: var(--jd-red);
  color: #fff;
  font-size: 10px;
  padding: 0 5px;
  height: 16px;
  line-height: 16px;
  border-radius: 8px;
  transform: scale(0.8);
}
.label {
  font-size: 10px;
  margin-top: 2px;
  color: #606266;
  text-align: center;
  transform: scale(0.9);
}
.item:hover .label {
  color: var(--jd-red);
}
.item:hover {
  background: #fff2f0;
}

/* Popover styles */
.favorite-list-mini {
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.favorite-item-mini {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}
.favorite-item-mini:hover {
  background: #f5f7fa;
}
.fav-img {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid #eee;
}
.fav-info {
  flex: 1;
  overflow: hidden;
}
.fav-name {
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fav-price {
  font-size: 12px;
  color: #f56c6c;
  margin-top: 2px;
}

/* Chat Window Styles */
.chat-window {
  position: fixed;
  right: 80px;
  bottom: 100px;
  width: 350px;
  height: 500px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  z-index: 2000;
  overflow: hidden;
  border: 1px solid #ebeef5;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

.chat-header {
  height: 48px;
  padding: 0 16px;
  background: var(--jd-red, #e1251b);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: bold;
}

.close-btn {
  cursor: pointer;
  font-size: 18px;
}

.chat-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-chat {
  text-align: center;
  color: #909399;
  margin-top: 40px;
  font-size: 14px;
}

.message-row {
  display: flex;
  margin-bottom: 8px;
}

.message-row.user {
  justify-content: flex-end;
}

.message-row.ai {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

/* Markdown Styles */
.message-bubble :deep(p) {
  margin: 0;
}
.message-bubble :deep(p:not(:last-child)) {
  margin-bottom: 8px;
}
.message-bubble :deep(a) {
  color: #409eff;
  text-decoration: underline;
  cursor: pointer;
}
.message-row.user .message-bubble :deep(a) {
  color: #fff;
}
.message-bubble :deep(code) {
  background: rgba(0,0,0,0.05);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
}
.message-row.user .message-bubble :deep(code) {
  background: rgba(255,255,255,0.2);
}

.message-row.user .message-bubble {
  background: var(--jd-red, #e1251b);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message-row.ai .message-bubble {
  background: #fff;
  color: #303133;
  border: 1px solid #e4e7ed;
  border-bottom-left-radius: 4px;
}

.chat-footer {
  padding: 12px;
  background: #fff;
  border-top: 1px solid #ebeef5;
}

.loading span {
  display: inline-block;
  animation: dots 1.4s infinite ease-in-out both;
  margin: 0 2px;
  font-weight: bold;
  font-size: 16px;
}

.loading span:nth-child(1) { animation-delay: -0.32s; }
.loading span:nth-child(2) { animation-delay: -0.16s; }

@keyframes dots {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
</style>
