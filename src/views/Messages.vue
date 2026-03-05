<template>
  <div class="messages">
    <el-card>
      <el-tabs v-model="active">
        <el-tab-pane label="公告" name="notice">
          <div class="toolbar">
            <el-button size="small" @click="onRefresh">刷新</el-button>
            <el-button size="small" @click="markAll">全部标为已读</el-button>
          </div>
          <el-empty v-if="noticeList.length === 0" description="暂无公告" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="n in noticeList"
              :key="n.id"
              :timestamp="formatTime(n.createTime || n.time)"
              type="primary"
            >
              <div class="notice" :class="{ unread: !n.read }">
                <div class="title">{{ n.title }}</div>
                <v-md-editor :model-value="n.content" mode="preview"></v-md-editor>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-tab-pane>
        <el-tab-pane label="聊天" name="chat">
          <el-empty description="聊天功能筹备中" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts" name="Messages">
import { ref, onMounted } from "vue";
import { listNotices, markAllRead, syncNotices } from "@/utils/notice";

const active = ref("notice");
const noticeList = ref<any[]>([]);
const getUid = () => {
  try {
    const raw = sessionStorage.getItem("user_user");
    const u = raw ? JSON.parse(raw) : null;
    return u?.id ?? u?.userId ?? u?.uid ?? null;
  } catch {
    return null;
  }
};
const load = () => {
  const uid = getUid();
  if (uid != null) {
    noticeList.value = listNotices("user", uid);
  }
};
const onRefresh = async () => {
  const uid = getUid();
  if (uid != null) {
    const list = await syncNotices("user", uid);
    noticeList.value = list;
  }
};
const markAll = () => {
  const uid = getUid();
  if (uid != null) {
    markAllRead("user", uid);
    load();
  }
};
const formatTime = (t: number) => {
  const d = new Date(t);
  const s = d.toLocaleString();
  return s;
};
onMounted(() => {
  load();
  onRefresh();
});
</script>

<style scoped>
.messages {
  padding: 16px clamp(16px, 3vw, 48px);
}
.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
.notice.unread .title {
  font-weight: 700;
}
.title {
  color: #303133;
  margin-bottom: 6px;
}
.content {
  color: #606266;
  white-space: pre-wrap;
}
</style>
