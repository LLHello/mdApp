<template>
  <div class="chat-center">
    <div class="left">
      <div class="left-header">
        <div class="left-title">聊天列表</div>
        <el-button size="small" @click="refreshConversations" :loading="loadingList">刷新</el-button>
      </div>
      <div class="conv-list">
        <el-empty v-if="conversations.length === 0" description="暂无会话" />
        <div
          v-for="c in conversations"
          :key="c.conversationId"
          class="conv-item"
          :class="{ active: c.conversationId === activeConversationId }"
          @click="openConversation(c)"
        >
          <div class="conv-top">
            <div class="conv-name">{{ c.peerName || "对方" }}</div>
            <div class="conv-time">{{ formatTime(c.lastMessageTime) }}</div>
          </div>
          <div class="conv-bottom">
            <div class="conv-last">{{ c.lastMessageContent || "" }}</div>
            <div v-if="(c.unreadCount || 0) > 0" class="conv-badge">{{ c.unreadCount }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="right">
      <div class="chat-header">
        <div class="chat-title">
          <span>聊天</span>
          <span v-if="activePeerName" class="chat-sub">当前：{{ activePeerName }}</span>
        </div>
        <div class="chat-state">
          <span :class="['dot', socketReady ? 'ok' : 'bad']"></span>
          <span class="state-text">{{ socketReady ? "在线" : "连接中" }}</span>
        </div>
      </div>

      <div class="chat-body" ref="chatBodyRef">
        <el-empty v-if="activeConversationId == null" description="请选择一个会话" />
        <template v-else>
          <el-empty v-if="chatMessages.length === 0" description="还没有消息，快发起咨询吧～" />
          <div
            v-for="m in chatMessages"
            v-else
            :key="m.localId"
            :class="['chat-row', m.fromSelf ? 'self' : 'peer']"
          >
            <div class="bubble">
              <div v-if="m.goodsInfo" class="goods-card">
                <img v-if="m.goodsInfo.pic" :src="m.goodsInfo.pic" class="goods-card-img" alt="商品图" />
                <div class="goods-card-info">
                  <div class="goods-card-title">{{ m.goodsInfo.title }}</div>
                  <div class="goods-card-price">￥{{ m.goodsInfo.price }}</div>
                </div>
              </div>
              <div class="bubble-content">{{ m.content }}</div>
              <div class="bubble-time">{{ m.time }}</div>
            </div>
          </div>
        </template>
      </div>

      <div class="chat-footer">
        <el-input
          v-model="chatInput"
          type="textarea"
          :rows="3"
          placeholder="输入要发送的内容，Enter 发送，Shift+Enter 换行"
          @keydown.enter.exact.prevent="sendChat"
          :disabled="!socketReady || activePeerId == null"
        />
        <div class="chat-actions">
          <el-button
            type="primary"
            :disabled="!socketReady || activePeerId == null || !chatInput.trim()"
            @click="sendChat"
          >
            发送
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="ChatCenter">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import request from "@/utils/request";

type StoragePrefix = "user" | "merchant" | "admin";

type Conversation = {
  conversationId: number;
  peerId: number;
  peerName: string;
  peerIcon: string;
  unreadCount: number;
  lastMessageId: number | null;
  lastMessageContent: string | null;
  lastMessageTime: string | null;
};

type ChatMessageDTO = {
  id: number;
  conversationId: number;
  senderId: number;
  receiverId: number;
  content: string;
  createTime?: string | null;
  goodsId?: number | null;
};

interface GoodsInfo {
  id: number;
  title: string;
  pic: string;
  price: string;
}

interface ChatMsg {
  localId: string;
  messageId?: number;
  fromSelf: boolean;
  content: string;
  time: string;
  goodsId?: number | null;
  goodsInfo?: GoodsInfo | null;
}

const props = defineProps<{
  storagePrefix: StoragePrefix;
  initialPeerId?: number | null;
  initialGoodsId?: number | null;
}>();

const getUid = () => {
  try {
    const raw = sessionStorage.getItem(`${props.storagePrefix}_user`);
    const u = raw ? JSON.parse(raw) : null;
    return u?.id ?? u?.userId ?? u?.uid ?? null;
  } catch {
    return null;
  }
};

const getToken = () => {
  const tk =
    sessionStorage.getItem(`${props.storagePrefix}_token`) ||
    sessionStorage.getItem("token") ||
    localStorage.getItem(`${props.storagePrefix}_token`) ||
    localStorage.getItem("token");
  return tk || "";
};

const conversations = ref<Conversation[]>([]);
const loadingList = ref(false);

const socketRef = ref<WebSocket | null>(null);
const socketReady = ref(false);
const reconnectTimer = ref<number | null>(null);

const activeConversationId = ref<number | null>(null);
const activePeerId = ref<number | null>(null);
const activePeerName = ref("");

const chatMessages = ref<ChatMsg[]>([]);
const chatInput = ref("");
const chatBodyRef = ref<HTMLElement | null>(null);
const goodsCache = ref<Map<number, GoodsInfo>>(new Map());

const fetchGoodsInfo = async (goodsId: number): Promise<GoodsInfo | null> => {
  if (goodsCache.value.has(goodsId)) return goodsCache.value.get(goodsId)!;
  try {
    const res: any = await request.get(`goods/good/${goodsId}`);
    const ok = res?.code === 200 || res?.success === true;
    if (ok && res.data) {
      const g = res.data;
      let pic = "";
      if (typeof g.pic === "string") pic = g.pic.split(",")[0] || "";
      else if (Array.isArray(g.pic)) pic = g.pic[0] || "";
      const info: GoodsInfo = {
        id: Number(g.id),
        title: String(g.title || ""),
        pic,
        price: String(g.price || ""),
      };
      goodsCache.value.set(goodsId, info);
      return info;
    }
  } catch {}
  return null;
};

const enrichWithGoods = async (msg: ChatMsg): Promise<ChatMsg> => {
  if (!msg.goodsId) return msg;
  const info = await fetchGoodsInfo(msg.goodsId);
  return { ...msg, goodsInfo: info };
};

const hasActiveConversation = computed(() => activeConversationId.value != null);
const activeGoodsId = computed(() => {
  if (!props.initialGoodsId) return null;
  if (!props.initialPeerId) return null;
  if (activePeerId.value == null) return null;
  return Number(props.initialPeerId) === Number(activePeerId.value) ? Number(props.initialGoodsId) : null;
});

const formatTime = (t: any) => {
  if (!t) return "";
  const s = String(t);
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return s;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const scrollToBottom = () => {
  nextTick(() => {
    if (chatBodyRef.value) {
      chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight;
    }
  });
};

const buildWsUrl = () => {
  const uid = getUid();
  if (!uid) return "";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  const token = getToken();
  const base = `${protocol}//${host}/ws/${uid}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
};

const connectSocket = () => {
  const uid = getUid();
  if (!uid) {
    ElMessage.warning("请先登录后再使用聊天功能");
    return;
  }
  const url = buildWsUrl();
  if (!url) return;

  try {
    if (socketRef.value) {
      try {
        socketRef.value.close();
      } catch {}
    }
    socketReady.value = false;
    const ws = new WebSocket(url);
    socketRef.value = ws;

    ws.onopen = () => {
      socketReady.value = true;
    };
    ws.onclose = () => {
      socketReady.value = false;
      if (reconnectTimer.value == null) {
        reconnectTimer.value = window.setTimeout(() => {
          reconnectTimer.value = null;
          connectSocket();
        }, 2000);
      }
    };
    ws.onerror = () => {
      socketReady.value = false;
    };

    ws.onmessage = (ev) => {
      const text = typeof ev.data === "string" ? ev.data : "";
      if (!text) return;
      let root: any;
      try {
        root = JSON.parse(text);
      } catch {
        return;
      }
      const type = root?.type;
      const data = root?.data;
      if (!type) return;

      if (type === "chat.message" && data) {
        const m = data as ChatMessageDTO;
        const selfId = getUid();
        const fromSelf = m.senderId === selfId;
        if (activeConversationId.value === m.conversationId) {
          const baseMsg: ChatMsg = {
            localId: `m-${m.id || Date.now()}`,
            messageId: m.id,
            fromSelf,
            content: m.content || "",
            time: formatTime(m.createTime) || formatTime(new Date().toISOString()),
            goodsId: m.goodsId ?? null,
          };
          enrichWithGoods(baseMsg).then((enriched) => {
            chatMessages.value.push(enriched);
            scrollToBottom();
          });
          if (!fromSelf && m.id) {
            sendReadAck(m.conversationId, m.senderId, m.id);
          }
        } else {
          const idx = conversations.value.findIndex(
            (c) => c.conversationId === m.conversationId
          );
          if (idx >= 0) {
            const c = conversations.value[idx];
            conversations.value[idx] = {
              ...c,
              unreadCount: fromSelf ? c.unreadCount : (c.unreadCount || 0) + 1,
              lastMessageId: m.id,
              lastMessageContent: m.content,
              lastMessageTime: m.createTime || c.lastMessageTime,
            };
          } else {
            refreshConversations();
          }
        }
        return;
      }

      if (type === "chat.history" && data) {
        const convId = Number(data.conversationId);
        if (!Number.isFinite(convId) || activeConversationId.value !== convId) {
          return;
        }
        const list = Array.isArray(data.messages) ? data.messages : [];
        const selfId = getUid();
        const baseMsgs: ChatMsg[] = list.map((m: any) => {
          const mm = m as ChatMessageDTO;
          return {
            localId: `h-${mm.id}`,
            messageId: mm.id,
            fromSelf: mm.senderId === selfId,
            content: mm.content || "",
            time: formatTime(mm.createTime) || "",
            goodsId: mm.goodsId ?? null,
          } as ChatMsg;
        });
        chatMessages.value = baseMsgs;
        scrollToBottom();
        baseMsgs.forEach((msg) => {
          if (msg.goodsId) {
            enrichWithGoods(msg).then((enriched) => {
              const i = chatMessages.value.findIndex((x) => x.localId === enriched.localId);
              if (i >= 0) chatMessages.value[i] = enriched;
            });
          }
        });
        const last = list[list.length - 1];
        if (last && last.id && last.senderId && last.senderId !== selfId) {
          sendReadAck(convId, last.senderId, last.id);
        }
        return;
      }

      if (type === "chat.ack" && data) {
        const clientMsgId = String(data.clientMsgId || "");
        const messageId = Number(data.messageId || 0);
        if (clientMsgId && messageId) {
          const idx = chatMessages.value.findIndex((x) => x.localId === clientMsgId);
          if (idx >= 0) {
            chatMessages.value[idx] = { ...chatMessages.value[idx], messageId };
          }
        }
        const convId = Number(data.conversationId || 0);
        if (convId && activeConversationId.value == null) {
          activeConversationId.value = convId;
        }
      }
    };
  } catch {
    socketReady.value = false;
    ElMessage.error("无法连接聊天服务，请稍后再试");
  }
};

const refreshConversations = async () => {
  const uid = getUid();
  if (!uid) return;
  loadingList.value = true;
  try {
    const res: any = await request.get("chat/conversations");
    const ok = res?.code === 200;
    conversations.value = ok && Array.isArray(res.data) ? res.data : [];
    if (
      hasActiveConversation.value &&
      !conversations.value.some((c) => c.conversationId === activeConversationId.value)
    ) {
      activeConversationId.value = null;
      activePeerId.value = null;
      activePeerName.value = "";
      chatMessages.value = [];
    }
  } catch {
    conversations.value = [];
  } finally {
    loadingList.value = false;
  }
};

const ensureConversation = async (peerId: number) => {
  try {
    const res: any = await request.post("chat/conversations/ensure", null, {
      params: { peerId },
    });
    const ok = res?.code === 200;
    if (!ok) return null;
    const cid = Number(res?.data);
    return Number.isFinite(cid) ? cid : null;
  } catch {
    return null;
  }
};

const requestHistory = (conversationId: number, peerId: number) => {
  if (!socketRef.value || !socketReady.value) return;
  try {
    socketRef.value.send(
      JSON.stringify({
        type: "chat.history",
        conversationId,
        peerId,
        limit: 500,
        daysAgo: 15,
      })
    );
  } catch {}
};

const sendReadAck = (conversationId: number, peerId: number, lastReadMessageId: number) => {
  if (!socketRef.value || !socketReady.value) return;
  try {
    socketRef.value.send(
      JSON.stringify({
        type: "chat.read",
        conversationId,
        peerId,
        lastReadMessageId,
      })
    );
  } catch {}
};

const openConversation = async (c: Conversation) => {
  activeConversationId.value = c.conversationId;
  activePeerId.value = c.peerId;
  activePeerName.value = c.peerName || "";
  chatMessages.value = [];

  const idx = conversations.value.findIndex((x) => x.conversationId === c.conversationId);
  if (idx >= 0 && (conversations.value[idx].unreadCount || 0) > 0) {
    conversations.value[idx] = { ...conversations.value[idx], unreadCount: 0 };
  }
  if (socketReady.value) {
    requestHistory(c.conversationId, c.peerId);
  }
};

const sendChat = () => {
  const text = chatInput.value.trim();
  if (
    !text ||
    !socketRef.value ||
    !socketReady.value ||
    activePeerId.value == null
  ) {
    return;
  }
  const clientMsgId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload: any = {
    type: "chat.send",
    toUserId: activePeerId.value,
    content: text,
    msgType: 0,
    clientMsgId,
  };
  if (activeGoodsId.value) {
    payload.goodsId = activeGoodsId.value;
  }
  try {
    socketRef.value.send(JSON.stringify(payload));
    const outMsg: ChatMsg = {
      localId: clientMsgId,
      fromSelf: true,
      content: text,
      time: formatTime(new Date().toISOString()),
      goodsId: activeGoodsId.value ?? null,
    };
    if (outMsg.goodsId) {
      enrichWithGoods(outMsg).then((enriched) => {
        const i = chatMessages.value.findIndex((x) => x.localId === enriched.localId);
        if (i >= 0) chatMessages.value[i] = enriched;
      });
    }
    chatMessages.value.push(outMsg);
    chatInput.value = "";
    scrollToBottom();

    const idx = conversations.value.findIndex((c) => c.peerId === activePeerId.value);
    if (idx >= 0) {
      const c = conversations.value[idx];
      conversations.value[idx] = {
        ...c,
        lastMessageContent: text,
        lastMessageTime: new Date().toISOString(),
      };
    }
  } catch {
    ElMessage.error("发送失败，请检查网络状况");
  }
};

const initWithPeer = async (peerId: number) => {
  const cid = await ensureConversation(peerId);
  await refreshConversations();
  const conv =
    conversations.value.find((c) => c.conversationId === cid) ||
    conversations.value.find((c) => c.peerId === peerId) ||
    null;
  if (conv) {
    await openConversation(conv);
  }
};

watch(
  () => socketReady.value,
  (ready) => {
    if (ready && activeConversationId.value != null && activePeerId.value != null) {
      requestHistory(activeConversationId.value, activePeerId.value);
    }
  }
);

onMounted(async () => {
  await refreshConversations();
  connectSocket();
  const pid = props.initialPeerId;
  if (pid != null && Number.isFinite(Number(pid))) {
    await initWithPeer(Number(pid));
  }
});

onBeforeUnmount(() => {
  if (reconnectTimer.value != null) {
    window.clearTimeout(reconnectTimer.value);
    reconnectTimer.value = null;
  }
  if (socketRef.value) {
    try {
      socketRef.value.close();
    } catch {}
  }
});
</script>

<style scoped>
.chat-center {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 12px;
  min-height: 520px;
}
.left {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.left-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #ebeef5;
}
.left-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.conv-list {
  padding: 6px;
  overflow-y: auto;
  flex: 1;
}
.conv-item {
  padding: 10px 10px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}
.conv-item:hover {
  background: #f5f7fa;
}
.conv-item.active {
  border-color: #dcdfe6;
  background: #f5f7fa;
}
.conv-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.conv-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conv-time {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}
.conv-bottom {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.conv-last {
  font-size: 12px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conv-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--jd-red, #e1251b);
  color: #fff;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  flex-shrink: 0;
}
.right {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.chat-header {
  padding: 10px 12px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chat-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.chat-sub {
  font-size: 13px;
  color: #909399;
  font-weight: 400;
}
.chat-state {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.dot.ok {
  background: #67c23a;
}
.dot.bad {
  background: #f56c6c;
}
.state-text {
  font-size: 12px;
  color: #909399;
}
.chat-body {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.chat-row {
  display: flex;
}
.chat-row.self {
  justify-content: flex-end;
}
.chat-row.peer {
  justify-content: flex-start;
}
.bubble {
  max-width: 70%;
  padding: 8px 12px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.chat-row.self .bubble {
  background: var(--jd-red, #e1251b);
  color: #fff;
}
.bubble-content {
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}
.bubble-time {
  margin-top: 4px;
  font-size: 11px;
  color: #909399;
  text-align: right;
}
.goods-card {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  padding: 6px 8px;
  margin-bottom: 6px;
  min-width: 180px;
  max-width: 260px;
}
.chat-row.self .goods-card {
  background: rgba(255, 255, 255, 0.2);
}
.goods-card-img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}
.goods-card-info {
  flex: 1;
  min-width: 0;
}
.goods-card-title {
  font-size: 12px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: inherit;
}
.goods-card-price {
  font-size: 13px;
  font-weight: 600;
  margin-top: 2px;
  color: inherit;
  opacity: 0.9;
}
.chat-footer {
  border-top: 1px solid #ebeef5;
  padding: 10px 12px;
}
.chat-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}
</style>
