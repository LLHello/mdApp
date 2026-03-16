<template>
  <div class="feedback-page">
    <h2>意见反馈</h2>
    <el-tabs v-model="activeTab" class="feedback-tabs">
      <el-tab-pane label="提交反馈" name="submit">
        <div class="form-container">
          <el-form :model="form" label-width="80px" ref="formRef">
            <el-form-item label="标题">
              <el-input v-model="form.title" placeholder="请输入反馈标题（可选）" />
            </el-form-item>
            <el-form-item label="内容" required>
              <div class="emoji-input-container">
                <el-input
                  v-model="form.content"
                  type="textarea"
                  :rows="6"
                  placeholder="请详细描述您的问题或建议..."
                  ref="contentInputRef"
                />
                <el-popover placement="bottom-start" :width="350" trigger="click">
                  <template #reference>
                    <el-button class="emoji-btn" circle size="small">😊</el-button>
                  </template>
                  <div class="emoji-picker-wrapper">
                    <Picker :data="emojiIndex" set="twitter" @select="addEmoji" :showPreview="false" :showSearch="false" />
                  </div>
                </el-popover>
              </div>
            </el-form-item>
            <el-form-item label="图片">
              <el-upload
                action="#"
                list-type="picture-card"
                :auto-upload="false"
                :on-change="handleFileChange"
                :on-remove="handleFileRemove"
                multiple
                :limit="5"
                accept="image/*"
              >
                <el-icon><Plus /></el-icon>
              </el-upload>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="submitFeedback" :loading="loading">提交反馈</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="我的反馈" name="history">
        <div class="history-container">
          <el-tabs v-model="feedbackStatusTab">
            <el-tab-pane label="全部" name="all">
              <div v-if="!feedbackList.length && !loadingHistory" class="empty-state">
                 <LottieAnimation path="https://assets9.lottiefiles.com/packages/lf20_s8pbrcfw.json" width="200px" height="200px">
                   <el-empty description="暂无反馈记录" />
                 </LottieAnimation>
                 <p style="text-align: center; color: #909399; margin-top: -40px;">暂无反馈记录</p>
              </div>
              <el-timeline v-else>
                <el-timeline-item
                  v-for="(item, index) in feedbackList"
                  :key="index"
                  :timestamp="formatTime(item.createTime || item.time)"
                  placement="top"
                >
                  <el-card class="feedback-card">
                    <template #header>
                      <div class="card-header">
                        <span class="feedback-title">{{ item.title || '无标题' }}</span>
                        <el-tag :type="item.status === 1 || item.status === 2 || item.replyContent ? 'success' : 'info'" size="small">
                          {{ (item.status === 1 || item.status === 2 || item.replyContent) ? (item.status === 2 ? '已查看' : '已回复') : '待回复' }}
                        </el-tag>
                      </div>
                    </template>
                    <p class="feedback-content">{{ item.content }}</p>
                    
                    <div v-if="item.picList && item.picList.length" class="feedback-images">
                       <img 
                         v-for="(p, i) in item.picList" 
                         :key="i" 
                         :src="normalizeAvatar(p)" 
                         class="feedback-img"
                       />
                    </div>

                    <div class="reply-section">
                      <el-divider>管理员回复</el-divider>
                      <div v-if="item.replyContent" class="reply-content">
                        {{ item.replyContent }}
                      </div>
                      <el-button 
                        v-else 
                        type="primary" 
                        link 
                        @click="viewReply(item)"
                        :loading="item.loadingReply"
                      >
                        查看回复
                      </el-button>
                    </div>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
            </el-tab-pane>
            <el-tab-pane label="已回复" name="replied">
              <el-empty v-if="!repliedFeedbackList.length && !loadingHistory" description="暂无已回复反馈" />
              <el-timeline v-else>
                <el-timeline-item
                  v-for="(item, index) in repliedFeedbackList"
                  :key="index"
                  :timestamp="formatTime(item.createTime || item.time)"
                  placement="top"
                >
                  <el-card class="feedback-card">
                    <template #header>
                      <div class="card-header">
                        <span class="feedback-title">{{ item.title || '无标题' }}</span>
                        <el-tag type="success" size="small">已回复</el-tag>
                      </div>
                    </template>
                    <p class="feedback-content">{{ item.content }}</p>
                    <div v-if="item.picList && item.picList.length" class="feedback-images">
                       <img 
                         v-for="(p, i) in item.picList" 
                         :key="i" 
                         :src="normalizeAvatar(p)" 
                         class="feedback-img"
                       />
                    </div>
                    <div class="reply-section">
                      <el-divider>管理员回复</el-divider>
                      <div v-if="item.replyContent" class="reply-content">
                        {{ item.replyContent }}
                      </div>
                      <el-button 
                        v-else 
                        type="primary" 
                        link 
                        @click="viewReply(item)"
                        :loading="item.loadingReply"
                      >
                        查看回复
                      </el-button>
                    </div>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
            </el-tab-pane>
            <el-tab-pane label="已查看" name="checked">
              <el-empty v-if="!checkedFeedbackList.length && !loadingHistory" description="暂无已查看反馈" />
              <el-timeline v-else>
                <el-timeline-item
                  v-for="(item, index) in checkedFeedbackList"
                  :key="index"
                  :timestamp="formatTime(item.createTime || item.time)"
                  placement="top"
                >
                  <el-card class="feedback-card">
                    <template #header>
                      <div class="card-header">
                        <span class="feedback-title">{{ item.title || '无标题' }}</span>
                        <el-tag type="success" size="small">已查看</el-tag>
                      </div>
                    </template>
                    <p class="feedback-content">{{ item.content }}</p>
                    <div v-if="item.picList && item.picList.length" class="feedback-images">
                       <img 
                         v-for="(p, i) in item.picList" 
                         :key="i" 
                         :src="normalizeAvatar(p)" 
                         class="feedback-img"
                       />
                    </div>
                    <div class="reply-section">
                      <el-divider>管理员回复</el-divider>
                      <div v-if="item.replyContent" class="reply-content">
                        {{ item.replyContent }}
                      </div>
                      <el-button 
                        v-else 
                        type="primary" 
                        link 
                        @click="viewReply(item)"
                        :loading="item.loadingReply"
                      >
                        查看回复
                      </el-button>
                    </div>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
            </el-tab-pane>
            <el-tab-pane label="待回复" name="pending">
              <el-empty v-if="!pendingFeedbackList.length && !loadingHistory" description="暂无待回复反馈" />
              <el-timeline v-else>
                <el-timeline-item
                  v-for="(item, index) in pendingFeedbackList"
                  :key="index"
                  :timestamp="formatTime(item.createTime || item.time)"
                  placement="top"
                >
                  <el-card class="feedback-card">
                    <template #header>
                      <div class="card-header">
                        <span class="feedback-title">{{ item.title || '无标题' }}</span>
                        <el-tag type="info" size="small">待回复</el-tag>
                      </div>
                    </template>
                    <p class="feedback-content">{{ item.content }}</p>
                    <div v-if="item.picList && item.picList.length" class="feedback-images">
                       <img 
                         v-for="(p, i) in item.picList" 
                         :key="i" 
                         :src="normalizeAvatar(p)" 
                         class="feedback-img"
                       />
                    </div>
                    <div class="reply-section">
                      <el-button 
                        type="primary" 
                        link 
                        @click="viewReply(item)"
                        :loading="item.loadingReply"
                      >
                        查看回复
                      </el-button>
                    </div>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 查看回复弹窗 -->
    <el-dialog v-model="replyDialogVisible" title="管理员回复" width="500px">
      <div class="reply-dialog-content">
        {{ currentReplyContent }}
      </div>
      <template #footer>
        <el-button type="primary" @click="replyDialogVisible = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import request from '@/utils/request';
import LottieAnimation from '@/components/LottieAnimation.vue';
// @ts-ignore
import { Picker, EmojiIndex } from 'emoji-mart-vue-fast/src';
import 'emoji-mart-vue-fast/css/emoji-mart.css';
// @ts-ignore
import data from 'emoji-mart-vue-fast/data/all.json';

const emojiIndex = new EmojiIndex(data);

const addEmoji = (emoji: any) => {
  form.value.content += emoji.native;
};

const activeTab = ref('submit');
const feedbackStatusTab = ref('all');
const form = ref({
  title: '',
  content: ''
});
const fileList = ref<any[]>([]);
const loading = ref(false);
const feedbackList = ref<any[]>([]);
const loadingHistory = ref(false);

// 弹窗相关状态
const replyDialogVisible = ref(false);
const currentReplyContent = ref('');

const repliedFeedbackList = computed(() => {
  return feedbackList.value.filter(item => item.status === 1);
});

const checkedFeedbackList = computed(() => {
  return feedbackList.value.filter(item => item.status === 2);
});

const pendingFeedbackList = computed(() => {
  return feedbackList.value.filter(item => item.status === 0);
});

// 监听标签切换，切换到“我的反馈”时重新请求数据
watch(activeTab, (newTab) => {
  if (newTab === 'history') {
    fetchFeedbackList();
  }
});

const userInfo = computed(() => {
  const userStr = sessionStorage.getItem('user_user');
  return userStr ? JSON.parse(userStr) : null;
});

const handleFileChange = (_file: any, files: any[]) => {
  fileList.value = files;
};
const handleFileRemove = (_file: any, files: any[]) => {
  fileList.value = files;
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return '';
  return new Date(timeStr).toLocaleString();
};

const submitFeedback = async () => {
  if (!userInfo.value) {
    ElMessage.warning('请先登录');
    return;
  }
  
  if (!form.value.content.trim()) {
    ElMessage.warning('请输入反馈内容');
    return;
  }
  
  loading.value = true;
  try {
    const formData = new FormData();
    formData.append('title', form.value.title);
    formData.append('content', form.value.content);
    formData.append('userId', userInfo.value.id);
    formData.append('time', new Date().toISOString());
    
    fileList.value.forEach((f: any) => {
      if (f.raw) {
        formData.append('files', f.raw);
      }
    });

    const res: any = await request.post('/feedback/push', formData);

    const ok = res?.code === 200 || res?.success === true;
    if (ok) {
      ElMessage.success('反馈提交成功');
      form.value.title = '';
      form.value.content = '';
      fileList.value = [];
      // Refresh list if needed, or switch tab
      fetchFeedbackList();
    } else {
      ElMessage.error(res?.msg || '提交失败');
    }
  } catch (e: any) {
    ElMessage.error(e.message || '提交失败');
  } finally {
    loading.value = false;
  }
};

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

const fetchFeedbackList = async () => {
  if (!userInfo.value) return;
  
  loadingHistory.value = true;
  try {
    const res: any = await request.get(`/feedback/getFeedback/${userInfo.value.id}`);
    if (res?.code === 200 || res?.success === true) {
      const list = res.data || [];
      // 根据 time 或 createTime 倒序排序 (最新的在前面)
      feedbackList.value = list
        .map((item: any) => ({
          ...item,
          picList: item.pic ? String(item.pic).split(",").filter(Boolean) : []
        }))
        .sort((a: any, b: any) => {
           const t1 = new Date(a.createTime || a.time).getTime();
           const t2 = new Date(b.createTime || b.time).getTime();
           return t2 - t1;
         });
    }
  } catch (e) {
    console.error('Failed to fetch feedback history', e);
  } finally {
    loadingHistory.value = false;
  }
};

const viewReply = async (item: any) => {
  item.loadingReply = true;
  try {
    // 用户查看回复接口: GET /feedback/checkReply?feedbackId=...
    const res: any = await request.get('/feedback/checkReply', {
      params: { feedbackId: item.id }
    });
    
    const ok = res?.code === 200 || res?.success === true;
    // 如果返回数据非空，且有内容，则显示内容
    const content = ok ? (res.data?.content || res.data) : null;
    
    if (content) {
      item.replyContent = content;
      item.status = 2; // 标记为用户已查看回复
      
      // 显示弹窗
      currentReplyContent.value = content;
      replyDialogVisible.value = true;
    } else {
      ElMessage.info('暂无回复');
    }
  } catch (e: any) {
    ElMessage.error(e.message || '获取回复失败');
  } finally {
    item.loadingReply = false;
  }
};

onMounted(() => {
  if (userInfo.value) {
    fetchFeedbackList();
  }
});
</script>

<style scoped>
.feedback-page {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}
.form-container, .history-container {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
  min-height: 400px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.feedback-title {
  font-weight: bold;
}
.feedback-content {
  margin: 10px 0;
  white-space: pre-wrap;
}
.reply-section {
  margin-top: 15px;
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
}
.reply-content {
  color: #606266;
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
.feedback-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.feedback-img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
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
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}
</style>
