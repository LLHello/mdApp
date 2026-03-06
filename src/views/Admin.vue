<template>
  <div class="admin">
    <div class="bar">
      <div class="title">管理员中心</div>
      <div class="user-info" title="账号">
        <img
          v-if="avatarUrl"
          :src="avatarUrl"
          class="avatar-img"
          alt="头像"
          @click="switchTab('notice')"
        />
        <div v-else class="avatar" @click="switchTab('notice')">
          {{ initial }}
        </div>
        <el-dropdown trigger="click" @command="onUserMenu" :teleported="false">
          <div class="name-and-caret" tabindex="0">
            <span class="name">{{ displayName }}</span>
            <span class="caret" aria-hidden="true">▼</span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人中心</el-dropdown-item>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    <div class="layout">
      <aside class="menu">
        <button
          v-for="a in actions"
          :key="a.key"
          class="menu-item"
          :class="{ active: a.key === active }"
          @click="switchTab(a.key)"
        >
          {{ a.title }}
        </button>
      </aside>
      <section class="content">
        <el-card>
          <h3 class="pane-title">{{ paneTitle }}</h3>
          <div v-if="active === 'notice'" class="pane">
            <el-tabs v-model="noticeTab">
              <el-tab-pane label="公告推送" name="push">
                <div class="form">
                  <el-radio-group v-model="mode">
                    <el-radio-button label="all">推送给所有人</el-radio-button>
                    <el-radio-button label="user">推送给个人</el-radio-button>
                  </el-radio-group>
                  <div class="mt emoji-input-container">
                    <v-md-editor v-model="msg" height="400px" placeholder="请输入公告内容"></v-md-editor>
                    <el-popover placement="top-start" :width="350" trigger="click">
                      <template #reference>
                        <el-button class="emoji-btn" circle size="small" style="top: 10px; right: 10px; bottom: auto;">😊</el-button>
                      </template>
                      <div class="emoji-picker-wrapper">
                        <Picker :data="emojiIndex" set="twitter" @select="addNoticeEmoji" :showPreview="false" :showSearch="false" />
                      </div>
                    </el-popover>
                  </div>
                  <div v-if="mode === 'user'" class="mt">
                    <el-select
                      v-model="selectedId"
                      filterable
                      clearable
                      placeholder="请选择接收用户（单选）"
                      style="width: 100%"
                      @focus="ensureUsers"
                    >
                      <el-option
                        v-for="u in users"
                        :key="u.id"
                        :label="u.display"
                        :value="u.id"
                      />
                    </el-select>
                  </div>
              <div class="actions">
                  <el-button type="primary" @click="onPush">推送</el-button>
                  <el-button @click="reset">清空</el-button>
                </div>
                </div>
              </el-tab-pane>
              <el-tab-pane label="公告查看" name="view">
                <div class="toolbar">
                  <el-button size="small" @click="loadSystemNotices">刷新</el-button>
                </div>
                <el-empty v-if="systemNotices.length === 0" description="暂无公告" />
                <el-table v-else :data="systemNotices" style="width: 100%" height="420">
                  <el-table-column prop="id" label="ID" width="120" />
                  <el-table-column label="内容">
                    <template #default="{ row }">
                      <v-md-editor :model-value="row.content" mode="preview"></v-md-editor>
                    </template>
                  </el-table-column>
                  <el-table-column prop="createTime" label="时间" width="180">
                    <template #default="{ row }">
                      {{ formatTime(row.createTime || row.time) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="180">
                    <template #default="{ row }">
                      <el-button type="primary" size="small" @click="openEdit(row)">编辑</el-button>
                      <el-button type="danger" size="small" @click="removeNotice(row)">删除</el-button>
                    </template>
                  </el-table-column>
                </el-table>
                <el-dialog v-model="editVisible" title="编辑公告" width="800px">
                  <el-form :model="editForm" label-width="90px">
                    <el-form-item label="内容">
                      <v-md-editor v-model="editForm.content" height="400px"></v-md-editor>
                    </el-form-item>
                  </el-form>
                  <template #footer>
                    <el-button @click="editVisible = false">取消</el-button>
                    <el-button type="primary" @click="submitEdit">保存</el-button>
                  </template>
                </el-dialog>
              </el-tab-pane>
            </el-tabs>
          </div>
          <div v-else-if="active === 'user'" class="pane">
            <el-table :data="allUsers" style="width: 100%" height="500">
              <el-table-column prop="id" label="ID" width="100" />
              <el-table-column prop="username" label="用户名" />
              <el-table-column prop="account" label="账号" />
              <el-table-column prop="role" label="角色" width="100">
                <template #default="{ row }">
                  <el-tag v-if="row.role === 0" type="info">普通用户</el-tag>
                  <el-tag v-else-if="row.role === 1" type="warning">商家</el-tag>
                  <el-tag v-else-if="row.role === 2" type="danger">管理员</el-tag>
                  <span v-else>未知</span>
                </template>
              </el-table-column>
              <el-table-column prop="gender" label="性别" width="60">
                <template #default="{ row }">
                  {{ row.gender === 1 ? '男' : (row.gender === 0 ? '女' : '未知') }}
                </template>
              </el-table-column>
              <el-table-column prop="isShow" label="状态" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.isShow === 1 ? 'success' : 'danger'">
                    {{ row.isShow === 1 ? '正常' : '禁用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createTime" label="创建时间" width="170">
                <template #default="{ row }">
                  {{ formatTime(row.createTime) }}
                </template>
              </el-table-column>
              <el-table-column prop="updateTime" label="更新时间" width="170">
                <template #default="{ row }">
                  {{ formatTime(row.updateTime) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-button
                    size="small"
                    :type="row.isShow === 1 ? 'danger' : 'success'"
                    @click="toggleUserStatus(row)"
                  >
                    {{ row.isShow === 1 ? '禁用' : '启用' }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div v-else-if="active === 'goods'" class="pane">
            <el-tabs v-model="goodsTab" @tab-change="onGoodsTabChange">
              <el-tab-pane
                v-for="c in categories"
                :key="c.id"
                :label="c.name"
                :name="String(c.id)"
              >
                <el-empty v-if="goodsList.length === 0" description="暂无商品" />
                <el-table v-else :data="goodsList" style="width: 100%" height="500" @row-click="showGoodDetail">
                  <el-table-column prop="id" label="ID" width="80" />
                  <el-table-column prop="title" label="商品名称" />
                  <el-table-column prop="clickTimes" label="点击量" width="100" />
                  <el-table-column prop="price" label="价格" width="100" />
                  <el-table-column prop="status" label="状态" width="120">
                    <template #default="{ row }">
                      <el-tag :type="getStatusType(row.status)">
                        {{ getStatusLabel(row.status) }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="200">
                    <template #default="{ row }">
                      <el-button-group>
                        <el-button size="small" type="success" @click.stop="updateGoodStatus(row, 1)">通过</el-button>
                        <el-button size="small" type="warning" @click.stop="updateGoodStatus(row, 2)">待审</el-button>
                        <el-button size="small" type="danger" @click.stop="updateGoodStatus(row, 0)">下架</el-button>
                      </el-button-group>
                    </template>
                  </el-table-column>
                </el-table>
              </el-tab-pane>
              <el-tab-pane label="TOP 10" name="top15">
                <el-empty v-if="topGoods.length === 0" description="暂无热门商品" />
                <el-table v-else :data="topGoods" style="width: 100%" height="500" @row-click="showGoodDetail">
                  <el-table-column prop="id" label="ID" width="80" />
                  <el-table-column prop="title" label="商品名称" />
                  <el-table-column prop="clickTimes" label="点击量" width="100" />
                  <el-table-column prop="price" label="价格" width="100" />
                  <el-table-column prop="status" label="状态" width="120">
                    <template #default="{ row }">
                      <el-tag :type="getStatusType(row.status)">
                        {{ getStatusLabel(row.status) }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="200">
                    <template #default="{ row }">
                      <el-button-group>
                        <el-button size="small" type="success" @click.stop="updateGoodStatus(row, 1)">通过</el-button>
                        <el-button size="small" type="warning" @click.stop="updateGoodStatus(row, 2)">待审</el-button>
                        <el-button size="small" type="danger" @click.stop="updateGoodStatus(row, 0)">下架</el-button>
                      </el-button-group>
                    </template>
                  </el-table-column>
                </el-table>
              </el-tab-pane>
            </el-tabs>
            <el-dialog v-model="goodDetailVisible" title="商品详情" width="600px">
              <div v-if="currentGood">
                <p><strong>名称：</strong>{{ currentGood.title }}</p>
                <p><strong>价格：</strong>{{ currentGood.price }}</p>
                <p><strong>描述：</strong>{{ currentGood.des || '暂无描述' }}</p>
                <p><strong>状态：</strong>{{ getStatusLabel(currentGood.status) }}</p>
                <div v-if="currentGood.picList && currentGood.picList.length">
                   <p><strong>图片：</strong></p>
                   <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                     <img v-for="(p, i) in currentGood.picList" :key="i" :src="normalizeAvatar(p)" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px;" />
                   </div>
                </div>
              </div>
            </el-dialog>
          </div>
          <div v-else-if="active === 'feedback'" class="pane">
            <div class="toolbar" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <el-radio-group v-model="feedbackFilter" size="small">
                <el-radio-button label="all">全部</el-radio-button>
                <el-radio-button label="replied">已回复</el-radio-button>
                <el-radio-button label="pending">待回复</el-radio-button>
              </el-radio-group>
              <el-button type="primary" size="small" @click="loadFeedback">刷新列表</el-button>
            </div>
            <el-table :data="filteredFeedbackList" style="width: 100%" height="450">
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="title" label="标题" width="150" show-overflow-tooltip />
              <el-table-column prop="content" label="内容" show-overflow-tooltip />
              <el-table-column prop="userId" label="用户ID" width="100" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.status === 1 || row.status === 2 ? 'success' : 'info'">
                    {{ row.status === 1 ? '已回复' : (row.status === 2 ? '已查看' : '待回复') }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createTime" label="时间" width="170">
                <template #default="{ row }">
                  {{ formatTime(row.createTime || row.time) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-button size="small" type="primary" @click="showFeedbackDetail(row)">查看</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div class="pagination">
              <el-pagination
                background
                layout="prev, pager, next"
                :total="feedbackTotal"
                :page-size="feedbackQuery.pageSize"
                :current-page="feedbackQuery.pageNum"
                @current-change="onFeedbackPageChange"
              />
            </div>
            <!-- Feedback Detail Dialog -->
            <el-dialog v-model="feedbackDetailVisible" title="反馈详情" width="600px">
              <div v-if="currentFeedback">
                <p><strong>用户ID：</strong>{{ currentFeedback.userId }}</p>
                <p><strong>标题：</strong>{{ currentFeedback.title || '无标题' }}</p>
                <p><strong>内容：</strong></p>
                <div style="background: #f5f7fa; padding: 10px; border-radius: 4px; margin-bottom: 10px; white-space: pre-wrap;">
                  {{ currentFeedback.content }}
                </div>
                <div v-if="currentFeedback.picList && currentFeedback.picList.length">
                   <p><strong>图片：</strong></p>
                   <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                     <img 
                       v-for="(p, i) in currentFeedback.picList" 
                       :key="i" 
                       :src="normalizeAvatar(p)" 
                       style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px;" 
                     />
                   </div>
                </div>
              </div>
              <template #footer>
                <el-button @click="feedbackDetailVisible = false">关闭</el-button>
                <el-button 
                  type="primary" 
                  @click="openReplyDialog" 
                  v-if="currentFeedback && currentFeedback.status === 0"
                >
                  回复用户
                </el-button>
                <el-button type="success" @click="viewReply(currentFeedback)" v-else>查看回复</el-button>
              </template>
            </el-dialog>
            <!-- Reply Dialog -->
            <el-dialog v-model="replyVisible" title="回复用户" width="500px">
              <div class="emoji-input-container">
                <el-input
                  v-model="replyMsg"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入回复内容"
                />
                <el-popover placement="bottom-start" :width="350" trigger="click">
                  <template #reference>
                    <el-button class="emoji-btn" circle size="small">😊</el-button>
                  </template>
                  <div class="emoji-picker-wrapper">
                    <Picker :data="emojiIndex" set="twitter" @select="addReplyEmoji" :showPreview="false" :showSearch="false" />
                  </div>
                </el-popover>
              </div>
              <template #footer>
                <el-button @click="replyVisible = false">取消</el-button>
                <el-button type="primary" @click="sendReply">发送</el-button>
              </template>
            </el-dialog>
          </div>
          <div v-else-if="active === 'syslog'" class="pane">
            <div class="toolbar">
              <el-input v-model="logQuery.username" placeholder="用户名" style="width: 150px; margin-right: 8px;" clearable @clear="loadLogs" />
              <el-input v-model="logQuery.module" placeholder="模块" style="width: 150px; margin-right: 8px;" clearable @clear="loadLogs" />
              <el-input v-model="logQuery.cost" placeholder="最小耗时(ms)" type="number" style="width: 150px; margin-right: 8px;" clearable @clear="loadLogs" />
              <el-button type="primary" @click="loadLogs">查询</el-button>
            </div>
            <el-table :data="logList" style="width: 100%" height="450" :row-style="tableRowStyle">
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="username" label="用户名" width="120" />
              <el-table-column prop="module" label="模块" width="120" />
              <el-table-column prop="operation" label="操作类型" width="120" />
              <el-table-column prop="description" label="描述" width="150" show-overflow-tooltip />
              <el-table-column prop="requestUrl" label="请求URL" width="150" show-overflow-tooltip />
              <el-table-column prop="requestMethod" label="方法" width="80" />
              <el-table-column prop="params" label="请求参数" width="150" show-overflow-tooltip />
              <el-table-column prop="timeCost" label="耗时(ms)" width="100" />
              <el-table-column prop="result" label="结果" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.result === '成功' ? 'success' : 'danger'">
                    {{ row.result }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createTime" label="时间" width="170">
                <template #default="{ row }">
                  {{ formatTime(row.createTime) }}
                </template>
              </el-table-column>
            </el-table>
            <div class="pagination">
              <el-pagination
                background
                layout="prev, pager, next"
                :total="logTotal"
                :page-size="logQuery.pageSize"
                :current-page="logQuery.pageNum"
                @current-change="onLogPageChange"
              />
            </div>
          </div>
          <div v-else-if="active === 'profile'" class="pane">
            <el-form :model="profileForm" label-width="90px">
              <el-form-item label="头像">
                <el-upload
                  action="#"
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="onAvatarChange"
                  accept="image/*"
                >
                  <img :src="profileAvatarUrl" class="avatar-large" alt="头像" />
                </el-upload>
              </el-form-item>
              <el-form-item label="昵称">
                <el-input v-model="profileForm.username" />
              </el-form-item>
              <el-form-item label="性别">
                <el-select v-model="profileForm.gender" style="width: 200px">
                  <el-option label="男" :value="1" />
                  <el-option label="女" :value="0" />
                </el-select>
              </el-form-item>
              <el-form-item label="简介">
                <el-input v-model="profileForm.des" type="textarea" rows="4" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="submitProfile">保存</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-card>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts" name="Admin">
import { ref, computed, onMounted, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import request from "@/utils/request";
import { useRouter } from "vue-router";
// @ts-ignore
import { Picker, EmojiIndex } from 'emoji-mart-vue-fast/src';
import 'emoji-mart-vue-fast/css/emoji-mart.css';
// @ts-ignore
import data from 'emoji-mart-vue-fast/data/all.json';

const emojiIndex = new EmojiIndex(data);

const addNoticeEmoji = (emoji: any) => {
  msg.value += emoji.native;
};

const addReplyEmoji = (emoji: any) => {
  replyMsg.value += emoji.native;
};

const raw = sessionStorage.getItem("admin_user");
const user = ref<any>(raw ? JSON.parse(raw) : null);
const displayName = computed(() => user.value?.username || user.value?.account || "管理员");
const initial = computed(() => (displayName.value || "管").slice(0, 1));

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
const getAvatarPath = (u: any) =>
  u?.icon ?? u?.avatar ?? u?.pic ?? u?.photo ?? u?.image ?? u?.headUrl ?? "";
const avatarUrl = computed(() => normalizeAvatar(getAvatarPath(user.value)));

const actions = [
  { key: "notice", title: "公告推送" },
  { key: "user", title: "用户管理" },
  { key: "goods", title: "商品管理" },
  { key: "feedback", title: "反馈管理" },
  { key: "syslog", title: "系统日志" },
  { key: "profile", title: "个人中心" },
];
const active = ref<string>("notice");
const paneTitle = computed(() => actions.find((a) => a.key === active.value)?.title || "");
const switchTab = (key: string) => {
  if (active.value !== key) active.value = key;
};

const users = ref<Array<{ id: number; display: string }>>([]);
const mode = ref<"all" | "user">("all");
const msg = ref("");
const selectedId = ref<number | null>(null);
const noticeTab = ref<"push" | "view">("push");
const nameOf = (u: any) =>
  u?.username ?? u?.account ?? u?.nickname ?? u?.name ?? `用户${u?.id ?? ""}`;
const ensureUsers = async () => {
  if (users.value.length > 0) return;
  try {
    const res: any = await request.get("users/getAll");
    const ok = res?.code === 200 || res?.success === true;
    const list: any[] = ok && Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    users.value = list
      .map((u: any) => ({
        id: Number(u?.id ?? u?.userId ?? u?.uid ?? NaN),
        display: String(nameOf(u)),
      }))
      .filter((i) => Number.isFinite(i.id) && i.display);
  } catch (e: any) {
    ElMessage.error(e?.message || "获取用户列表失败");
  }
};
const onPush = async () => {
  const text = msg.value.trim();
  if (!text) {
    ElMessage.warning("请输入公告内容");
    return;
  }
  try {
    if (mode.value === "all") {
      const res: any = await request.get("notice/pushAll", { params: { msg: text } });
      ElMessage.success(typeof res === "string" ? res : "群发成功");
      return;
    }
    if (selectedId.value == null) {
      ElMessage.warning("请选择接收用户");
      return;
    }
    const id = selectedId.value;
    const res: any = await request.get(`notice/push/${id}`, { params: { msg: text } })
    if (typeof res === "string" && res.includes("成功")) {
      ElMessage.success("推送成功");
    } else {
      ElMessage.success("推送成功");
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "推送失败");
  }
};
const reset = () => {
  msg.value = "";
  selectedId.value = null;
};

const systemNotices = ref<any[]>([]);
const loadSystemNotices = async () => {
  try {
    let res: any = await request.get("notice/getALl");
    if (!(res?.code === 200 || res?.success === true) || !Array.isArray(res?.data)) {
      res = await request.get("notice/getAll");
    }
    const list: any[] =
      (res?.code === 200 || res?.success === true) && Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
    systemNotices.value = list.map((n: any) => ({
      id: n?.id ?? n?.noticeId ?? "",
      title: n?.title ?? "公告",
      content: n?.content ?? n?.msg ?? "",
      createTime: n?.createTime ?? n?.time ?? null,
    }));
  } catch (e: any) {
    ElMessage.error(e?.message || "获取公告失败");
  }
};
const allUsers = ref<any[]>([]);
const loadAllUsers = async () => {
  try {
    const res: any = await request.get("users/getAll");
    const ok = res?.code === 200 || res?.success === true;
    const list: any[] = ok && Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    allUsers.value = list.map((u: any) => ({
      ...u,
      isShow: u.isShow ?? 1 // 默认为1
    }));
  } catch (e: any) {
    ElMessage.error(e?.message || "获取用户列表失败");
  }
};
const toggleUserStatus = async (row: any) => {
  try {
    const newStatus = row.isShow === 1 ? 0 : 1;
    const action = newStatus === 1 ? "启用" : "禁用";
    await ElMessageBox.confirm(`确认${action}用户 "${row.username || row.account}" ？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    const res: any = await request.put("users/modifyShow", null, {
      params: { isShow: newStatus, userId: row.id }
    });
    const ok = res?.code === 200 || res?.success === true;
    if (ok) {
      ElMessage.success(`${action}成功`);
      row.isShow = newStatus;
    } else {
      ElMessage.error(res?.msg || `${action}失败`);
    }
  } catch (e) {
    // cancelled or error
  }
};

watch(active, (val) => {
  if (val === 'user') loadAllUsers();
  if (val === 'goods') loadCategories();
  if (val === 'feedback') loadFeedback();
  if (val === 'syslog') loadLogs();
});

// 反馈管理相关
const feedbackList = ref<any[]>([]);
const feedbackTotal = ref(0);
const feedbackQuery = ref({ pageNum: 1, pageSize: 10 });
const feedbackFilter = ref('all'); // all, replied, pending

const filteredFeedbackList = computed(() => {
  if (feedbackFilter.value === 'replied') {
    return feedbackList.value.filter(item => item.status === 1 || item.status === 2);
  } else if (feedbackFilter.value === 'pending') {
    return feedbackList.value.filter(item => item.status === 0);
  }
  return feedbackList.value;
});
const feedbackDetailVisible = ref(false);
const currentFeedback = ref<any>(null);
const replyVisible = ref(false);
const replyMsg = ref("");

const loadFeedback = async () => {
  try {
    const res: any = await request.get("feedback/pull", {
      params: {
        pageNum: feedbackQuery.value.pageNum,
        pageSize: feedbackQuery.value.pageSize
      }
    });
    const ok = res?.code === 200 || res?.success === true;
    const data = ok ? (res.data || res) : {};
    
    if (data && (Array.isArray(data.list) || Array.isArray(data))) {
       const list = Array.isArray(data.list) ? data.list : data;
       // 确保status字段被正确处理
       feedbackList.value = list
         .map((item: any) => ({
           ...item,
           status: item.status !== undefined ? Number(item.status) : 0 // 默认未回复
         }))
         .sort((a: any, b: any) => {
           // 优先使用 createTime 进行倒序排列
           const t1 = new Date(a.createTime || a.time).getTime();
           const t2 = new Date(b.createTime || b.time).getTime();
           return t2 - t1;
         });
       feedbackTotal.value = data.total || feedbackList.value.length;
    } else {
       feedbackList.value = [];
       feedbackTotal.value = 0;
    }
  } catch (e: any) {
    ElMessage.error("获取反馈列表失败");
  }
};

const onFeedbackPageChange = (page: number) => {
  feedbackQuery.value.pageNum = page;
  loadFeedback();
};

const showFeedbackDetail = (row: any) => {
  const pics = row.pic ? String(row.pic).split(",").filter(Boolean) : [];
  currentFeedback.value = { ...row, picList: pics, userId: row.userId ?? row.uid ?? row.id }; // 尝试兼容 userId, uid, 或 id
  feedbackDetailVisible.value = true;
};

const viewReply = async (item: any) => {
  if (!item?.id) return;
  try {
    // 使用反馈ID作为replyId去查询
    const res: any = await request.get(`/feedback/getReply/${item.id}`);
    const ok = res?.code === 200 || res?.success === true;
    const content = ok ? (res.data?.content || res.data) : null;
    
    if (content) {
      ElMessageBox.alert(content, '回复内容', {
        confirmButtonText: '确定',
        type: 'info'
      });
    } else {
      ElMessage.info('暂无回复内容');
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '获取回复失败');
  }
};

const openReplyDialog = () => {
  replyMsg.value = "";
  replyVisible.value = true;
};

const sendReply = async () => {
  if (!replyMsg.value.trim()) {
    ElMessage.warning("请输入回复内容");
    return;
  }
  if (!currentFeedback.value?.id) {
    ElMessage.error("无法获取反馈ID");
    return;
  }
  try {
    // 使用 FormData 发送数据，兼容性更好
    const formData = new FormData();
    formData.append('feedbackId', String(currentFeedback.value.id));
    formData.append('content', replyMsg.value);

    // 管理员回复反馈接口: POST /feedback/replyFeedback
    const res: any = await request.post("/feedback/replyFeedback", formData);
    
    const ok = res?.code === 200 || res?.success === true;
    
    if (ok) {
      ElMessage.success("回复成功");
      replyVisible.value = false;
      feedbackDetailVisible.value = false;
      // 刷新列表以更新状态
      loadFeedback();
    } else {
      ElMessage.error(res?.msg || "回复失败");
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "回复失败");
  }
};

// 系统日志相关
const logList = ref<any[]>([]);
const logTotal = ref(0);
const logQuery = ref({
  pageNum: 1,
  pageSize: 10,
  username: "",
  module: "",
  cost: ""
});

const loadLogs = async () => {
  try {
    let res: any;
    if (logQuery.value.cost) {
      res = await request.get(`sys/log/getCost/${logQuery.value.cost}`, {
        params: {
          pageNum: logQuery.value.pageNum,
          pageSize: logQuery.value.pageSize
        }
      });
    } else {
      res = await request.get("sys/log/list", {
        params: {
          pageNum: logQuery.value.pageNum,
          pageSize: logQuery.value.pageSize,
          username: logQuery.value.username || undefined,
          module: logQuery.value.module || undefined
        }
      });
    }
    // 假设后端直接返回 PageInfo 对象，或者放在 data 字段中
    // PageInfo 结构通常为 { list: [], total: 100, ... }
    const data = (res?.code === 200 || res?.success === true) ? res.data : res;
    if (data && Array.isArray(data.list)) {
      logList.value = data.list;
      logTotal.value = data.total || 0;
    } else {
      logList.value = [];
      logTotal.value = 0;
    }
  } catch (e) {
    ElMessage.error("获取日志失败");
  }
};

const onLogPageChange = (page: number) => {
  logQuery.value.pageNum = page;
  loadLogs();
};

const tableRowStyle = ({ row }: { row: any }) => {
  if (row.timeCost > 50) {
    return { backgroundColor: '#fef0f0', color: '#f56c6c' };
  }
  return {};
};

// 商品管理相关
const categories = ref<any[]>([]);
const goodsTab = ref("");
const goodsList = ref<any[]>([]);
const topGoods = ref<any[]>([]);
const goodDetailVisible = ref(false);
const currentGood = ref<any>(null);

const loadCategories = async () => {
  try {
    const res: any = await request.get("goods/categoryList");
    const ok = res?.code === 200 || res?.success === true;
    const list = ok && Array.isArray(res?.data) ? res.data : [];
    categories.value = list;
    if (list.length > 0 && !goodsTab.value) {
      goodsTab.value = String(list[0].id);
      loadGoodsByCategory(list[0].id);
    }
  } catch (e: any) {
    ElMessage.error("获取分类失败");
  }
};

const loadGoodsByCategory = async (cid: any) => {
  try {
    const res: any = await request.get(`goods/categoryId/admin/${cid}`);
    const ok = res?.code === 200 || res?.success === true;
    goodsList.value = ok && Array.isArray(res?.data) ? res.data : [];
  } catch {
    goodsList.value = [];
  }
};

const loadTop15 = async () => {
  try {
    const res: any = await request.get("goods/top15");
    const ok = res?.code === 200 || res?.success === true;
    topGoods.value = ok && Array.isArray(res?.data) ? res.data : [];
  } catch {
    topGoods.value = [];
  }
};

const onGoodsTabChange = (name: any) => {
  if (name === "top15") {
    loadTop15();
  } else {
    loadGoodsByCategory(name);
  }
};

const getStatusLabel = (s: number) => {
  if (s === 0) return "未展示"; // 禁用/下架
  if (s === 1) return "展示中"; // 正常
  if (s === 2) return "未审核"; // 待审
  return "未知";
};
const getStatusType = (s: number) => {
  if (s === 1) return "success";
  if (s === 2) return "warning";
  return "danger";
};

const updateGoodStatus = async (row: any, status: number) => {
  try {
    const res: any = await request.put("goods/modifyStatus", null, {
      params: { goodsId: row.id, status }
    });
    const ok = res?.code === 200 || res?.success === true;
    if (ok) {
      ElMessage.success("状态更新成功");
      row.status = status;
    } else {
      ElMessage.error(res?.msg || "更新失败");
    }
  } catch {
    ElMessage.error("更新失败");
  }
};

const showGoodDetail = (row: any) => {
  const pics = row.pic ? String(row.pic).split(",").filter(Boolean) : [];
  currentGood.value = { ...row, picList: pics };
  goodDetailVisible.value = true;
};

const editVisible = ref(false);
const editForm = ref<{ id: any; content: string }>({ id: "", content: "" });
const openEdit = (row: any) => {
  editForm.value = { id: row.id, content: row.content || "" };
  editVisible.value = true;
};
const submitEdit = async () => {
  try {
    let ok = false;
    // 后端签名为 @PutMapping("/modify") public Result modifySystemNotice(SystemNotice systemNotice)
    // 使用表单参数方式传递，保证能被绑定；仅包含 id 与 content
    const res: any = await request.put("notice/modify", null, {
      params: { id: editForm.value.id, content: editForm.value.content },
    });
    ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error("保存失败");
      return;
    }
    editVisible.value = false;
    ElMessage.success("保存成功");
    loadSystemNotices();
  } catch (e: any) {
    ElMessage.error(e?.message || "保存失败");
  }
};
const removeNotice = async (row: any) => {
  try {
    await ElMessageBox.confirm("确认删除该公告？", "提示", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }
  try {
    let ok = false;
    try {
      const res: any = await request.delete(`notice/delete/${row.id}`);
      ok = res?.code === 200 || res?.success === true;
    } catch {
      const res2: any = await request.delete("notice/delete", { params: { id: row.id } });
      ok = res2?.code === 200 || res2?.success === true;
    }
    if (!ok) {
      ElMessage.error("删除失败");
      return;
    }
    ElMessage.success("删除成功");
    loadSystemNotices();
  } catch (e: any) {
    ElMessage.error(e?.message || "删除失败");
  }
};
const formatTime = (t: any) => {
  const d = t ? new Date(t) : null;
  return d ? d.toLocaleString() : "";
};
watch(noticeTab, (v) => {
  if (v === "view") loadSystemNotices();
});

const router = useRouter();
const onUserMenu = (cmd: string) => {
  if (cmd === "profile") {
    active.value = "profile";
  } else if (cmd === "logout") {
    sessionStorage.removeItem("admin_isLoggedIn");
    sessionStorage.removeItem("admin_user");
    sessionStorage.removeItem("admin_token");
    sessionStorage.removeItem("token");
    router.push("/login");
  }
};

const getUserId = () =>
  Number(user.value?.id ?? user.value?.userId ?? user.value?.uid ?? 0);
const profileForm = ref({
  id: getUserId(),
  username: user.value?.username || user.value?.account || "",
  gender: Number(user.value?.gender ?? 1),
  avatar: getAvatarPath(user.value) || "",
  des: user.value?.des || "",
});
const defaultAvatar = "/vite.svg";
const profileAvatarUrl = computed(
  () => normalizeAvatar(profileForm.value.avatar) || defaultAvatar
);

const onAvatarChange = async (file: any) => {
  if (!file?.raw) return;
  try {
    if (file.size > 10 * 1024 * 1024) {
      ElMessage.error("图片大小不能超过 10MB");
      return;
    }
    const form = new FormData();
    form.append("id", String(getUserId()));
    form.append("pic", file.raw);
    const res = await request.post("users/upload", form);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error(res?.msg || "上传失败");
      return;
    }
    const url =
      typeof res?.data === "string"
        ? res.data
        : res?.data?.url ?? res?.data?.path ?? res?.data?.avatar ?? "";
    if (url) {
      const finalUrl = (() => {
        const u = normalizeAvatar(url);
        const sep = u.includes("?") ? "&" : "?";
        return `${u}${sep}t=${Date.now()}`;
      })();
      profileForm.value.avatar = finalUrl;
      const merged = { ...(user.value || {}), id: getUserId(), icon: finalUrl };
      sessionStorage.setItem("admin_user", JSON.stringify(merged));
      user.value = merged;
      ElMessage.success(res?.msg || "头像上传成功");
      return;
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "上传失败");
  }
};

const submitProfile = async () => {
  const merged = {
    ...(user.value || {}),
    username: profileForm.value.username,
    gender: Number(profileForm.value.gender),
    icon: profileForm.value.avatar,
    des: profileForm.value.des,
  };
  try {
    const payload = {
      id: Number(profileForm.value.id || getUserId()),
      username: merged.username,
      gender: merged.gender,
      icon: merged.icon,
      des: merged.des,
    };
    const res = await request.put("users/modifyUser", payload);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error(res?.msg || "保存失败");
      return;
    }
    const updated = { ...merged, id: payload.id };
    sessionStorage.setItem("admin_user", JSON.stringify(updated));
    user.value = updated;
    ElMessage.success(res?.msg || "保存成功");
  } catch (e: any) {
    ElMessage.error(e?.message || "保存失败");
  }
};

onMounted(() => {
  if (mode.value === "user") ensureUsers();
});
</script>

<style scoped>
.admin {
  padding: 16px 24px;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.title {
  font-size: 20px;
  font-weight: 700;
  color: var(--jd-red);
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.name-and-caret {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
}
.caret {
  font-size: 12px;
  color: #909399;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f56c6c;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.name {
  color: #303133;
  font-weight: 600;
}
.avatar-img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #dcdfe6;
}
.layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 12px;
}
.menu {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 8px;
}
.menu-item {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: #fff;
  color: #606266;
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.15s ease;
}
.menu-item.active {
  background: #ffecec;
  border-color: var(--jd-red);
  color: var(--jd-red);
  font-weight: 600;
}
.content :deep(.el-card) {
  width: 100%;
}
.pane-title {
  margin: 0 0 8px 0;
  color: #303133;
}
.pane {
  width: 960px;
  min-height: 400px;
  margin: 0 auto;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.mt {
  margin-top: 8px;
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.avatar-large {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #dcdfe6;
}
/* 适配暗色/反转颜色风格，解决字体与背景同色看不清的问题 */
:deep(.v-md-editor) {
  background-color: #2b2b2b;
  border: 1px solid #4c4d4f;
  border-radius: 4px;
  box-shadow: none;
}
:deep(.v-md-editor__toolbar) {
  border-bottom: 1px solid #4c4d4f;
  background-color: #363636;
}
:deep(.v-md-editor__toolbar-item) {
  color: #e5eaf3;
  background-color: transparent; /* 确保背景透明，避免遮挡 */
}
:deep(.v-md-editor__toolbar-item:hover) {
  background-color: #505050;
  color: #fff;
}
/* 针对 active 状态（如当前选中的预览模式）的样式 */
:deep(.v-md-editor__toolbar-item--active),
:deep(.v-md-editor__toolbar-item--active:hover) {
  background-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}
:deep(.v-md-editor__menu) {
  background-color: #363636;
  border: 1px solid #4c4d4f;
}
:deep(.v-md-editor__menu-item) {
  color: #e5eaf3;
}
:deep(.v-md-editor__menu-item:hover) {
  background-color: #505050;
}
:deep(.v-md-editor__editor-wrapper), 
:deep(.v-md-editor__preview-wrapper) {
  background-color: #2b2b2b;
}
:deep(textarea) {
  background-color: #2b2b2b !important;
  color: #fff !important;
  caret-color: #fff; /* 光标颜色 */
}
/* 预览区文字颜色适配 */
:deep(.github-markdown-body) {
  background-color: #2b2b2b !important;
  color: #e5eaf3 !important;
}
:deep(.github-markdown-body h1),
:deep(.github-markdown-body h2),
:deep(.github-markdown-body h3),
:deep(.github-markdown-body h4),
:deep(.github-markdown-body h5),
:deep(.github-markdown-body h6) {
  color: #fff !important;
  border-bottom-color: #4c4d4f;
}
:deep(.github-markdown-body p),
:deep(.github-markdown-body ul),
:deep(.github-markdown-body ol),
:deep(.github-markdown-body li),
:deep(.github-markdown-body table),
:deep(.github-markdown-body tr),
:deep(.github-markdown-body th),
:deep(.github-markdown-body td),
:deep(.github-markdown-body blockquote) {
  color: #e5eaf3 !important;
}
:deep(.github-markdown-body hr) {
  background-color: #4c4d4f;
}
:deep(.github-markdown-body blockquote) {
  border-left-color: #4c4d4f;
  color: #999;
}
:deep(.github-markdown-body code) {
  background-color: #363636;
  color: #e5eaf3;
}
:deep(.github-markdown-body pre) {
  background-color: #1e1e1e;
}
.reply-dialog-content {
  padding: 10px;
  font-size: 16px;
  line-height: 1.5;
  color: #303133;
  white-space: pre-wrap;
}
.emoji-input-container {
  position: relative;
  width: 100%;
}
.emoji-btn {
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 10;
  font-size: 18px;
}
.emoji-picker-wrapper {
  display: flex;
  justify-content: center;
}
.emoji-picker-wrapper :deep(.emoji-mart-category-label span) {
  background-color: transparent !important;
  color: #666;
}
.emoji-picker-wrapper :deep(.emoji-mart-bar) {
  border-bottom: 1px solid #dcdfe6;
  background-color: #000 !important;
}
.emoji-picker-wrapper :deep(.emoji-mart-anchor-selected) {
  color: #409EFF !important;
}
.emoji-picker-wrapper :deep(.emoji-mart-anchor-bar) {
  background-color: #409EFF !important;
}
</style>
