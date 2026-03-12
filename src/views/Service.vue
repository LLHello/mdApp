<template>
  <div class="service-page">
    <div class="chat-container">
      <div class="chat-header">
        <div class="header-left">
          <el-icon class="service-icon"><Headset /></el-icon>
          <span>AI 智能客服</span>
        </div>
        <div class="header-right">
          <el-tooltip content="开启新会话（清除历史记忆）" placement="bottom">
            <el-button type="primary" link @click="startNewChat">
              <el-icon class="mr-1"><Plus /></el-icon> 新会话
            </el-button>
          </el-tooltip>
        </div>
      </div>
      
      <div class="chat-body" ref="chatBodyRef">
        <div v-if="messages.length === 0" class="empty-chat">
          <el-empty description="您好！我是您的专属 AI 客服，请问有什么可以帮您？" image-size="120" />
        </div>
        <div v-for="(msg, idx) in messages" :key="idx" :class="['message-row', msg.role]">
          <div class="avatar" v-if="msg.role === 'ai'">
            <img src="/vite.svg" alt="AI" />
          </div>
          <div class="message-content">
            <div class="message-bubble" v-html="md.render(msg.content)"></div>
            <div class="time" v-if="msg.time">{{ msg.time }}</div>
          </div>
          <div class="avatar" v-if="msg.role === 'user'">
             <img :src="userAvatar" alt="Me" />
          </div>
        </div>
        <div v-if="chatLoading" class="message-row ai">
          <div class="avatar">
            <img src="/vite.svg" alt="AI" />
          </div>
          <div class="message-bubble loading">
            <span>.</span><span>.</span><span>.</span>
          </div>
        </div>
      </div>
      
      <div class="chat-footer">
        <div class="input-wrapper">
          <el-input 
            v-model="inputContent" 
            type="textarea"
            :rows="3"
            placeholder="请输入您的问题... (Enter 发送，Shift+Enter 换行)" 
            @keydown.enter.exact.prevent="sendMessage"
            :disabled="chatLoading"
            resize="none"
          />
          <div class="actions">
            <el-button type="primary" @click="sendMessage" :loading="chatLoading" round>发送 <el-icon class="el-icon--right"><Position /></el-icon></el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="Service">
import { ref, nextTick, onMounted, computed } from 'vue'
import { Headset, Plus, Position } from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'

// Markdown 配置
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
  const aIndex = tokens[idx].attrIndex('target');
  if (aIndex < 0) {
    tokens[idx].attrPush(['target', '_blank']);
  } else {
    tokens[idx].attrs![aIndex][1] = '_blank';
  }
  return defaultRender(tokens, idx, options, env, self);
};

// State
const inputContent = ref('')
const messages = ref<{role: 'user'|'ai', content: string, time?: string}[]>([])
const chatLoading = ref(false)
const chatBodyRef = ref<HTMLElement>()
const sessionId = ref(Date.now().toString())

// User Info
const userRaw = sessionStorage.getItem('user_user')
const user = userRaw ? JSON.parse(userRaw) : null
const userAvatar = computed(() => {
  // 简单的头像处理逻辑，实际可复用 RightSidebar 的 normalizeAvatar
  return user?.icon || user?.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
})

const formatTime = () => {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatBodyRef.value) {
      chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
    }
  })
}

const startNewChat = () => {
  messages.value = []
  sessionId.value = Date.now().toString()
  chatLoading.value = false
}

const sendMessage = async () => {
  if (!inputContent.value.trim() || chatLoading.value) return
  
  const msg = inputContent.value.trim()
  messages.value.push({ role: 'user', content: msg, time: formatTime() })
  inputContent.value = ''
  scrollToBottom()
  
  chatLoading.value = true
  
  // AI 消息占位
  messages.value.push({ role: 'ai', content: '', time: formatTime() })
  const aiMsgIndex = messages.value.length - 1
  
  try {
    const params = new URLSearchParams()
    params.append('message', msg)
    params.append('sessionId', sessionId.value)

    const response = await fetch('/api/chat/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${sessionStorage.getItem('token') || localStorage.getItem('token') || ''}`
      },
      body: params
    })

    if (!response.ok) {
       throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder('utf-8')
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        messages.value[aiMsgIndex].content += chunk
        scrollToBottom()
      }
    }
  } catch (e: any) {
    console.error('Chat error:', e)
    let errorMsg = "网络错误，请稍后再试。"
    if (e.message?.includes('timeout')) {
      errorMsg = "AI 思考超时，请检查网络或稍后再试。"
    } else if (e.message?.includes('404')) {
      errorMsg = "后端接口未找到 (404)，请检查后端服务是否启动。"
    } else if (e.message?.includes('500')) {
      errorMsg = "后端服务内部错误 (500)，请检查后端日志。"
    }
    
    if (messages.value[aiMsgIndex].content) {
      messages.value[aiMsgIndex].content += `\n\n[系统提示: ${errorMsg}]`
    } else {
      messages.value[aiMsgIndex].content = errorMsg
    }
  } finally {
    chatLoading.value = false
    scrollToBottom()
  }
}
</script>

<style scoped>
.service-page {
  height: calc(100vh - 80px); /* 减去顶部导航栏高度 */
  padding: 20px;
  background-color: #f0f2f5;
  display: flex;
  justify-content: center;
}

.chat-container {
  width: 100%;
  max-width: 1000px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  padding: 16px 24px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.service-icon {
  font-size: 24px;
  color: var(--jd-red, #e1251b);
}

.mr-1 { margin-right: 4px; }

.chat-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #f9fafe;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message-row {
  display: flex;
  gap: 12px;
  max-width: 80%;
}

.message-row.user {
  align-self: flex-end;
  flex-direction: row;
}

.message-row.ai {
  align-self: flex-start;
}

.avatar {
  flex-shrink: 0;
}

.avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #e4e7ed;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.message-row.ai .message-bubble {
  background: #fff;
  color: #303133;
  border-top-left-radius: 2px;
}

.message-row.user .message-bubble {
  background: var(--jd-red, #e1251b);
  color: #fff;
  border-top-right-radius: 2px;
}

.time {
  font-size: 12px;
  color: #909399;
  margin: 0 4px;
}

.message-row.user .time {
  text-align: right;
}

.chat-footer {
  padding: 20px 24px;
  background: #fff;
  border-top: 1px solid #ebeef5;
}

.input-wrapper {
  position: relative;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 8px;
  transition: border-color 0.2s;
}

.input-wrapper:focus-within {
  border-color: var(--jd-red, #e1251b);
}

.input-wrapper :deep(.el-textarea__inner) {
  border: none;
  box-shadow: none;
  padding: 0;
  resize: none;
  background: transparent;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

/* Loading Animation */
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

/* Markdown Styles */
.message-bubble :deep(p) { margin: 0; }
.message-bubble :deep(p:not(:last-child)) { margin-bottom: 8px; }
.message-bubble :deep(a) { color: #409eff; text-decoration: underline; cursor: pointer; }
.message-row.user .message-bubble :deep(a) { color: #fff; }
.message-bubble :deep(code) { background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 4px; font-family: monospace; }
.message-row.user .message-bubble :deep(code) { background: rgba(255,255,255,0.2); }
</style>
