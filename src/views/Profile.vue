<template>
  <div class="profile-container">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <span>个人信息</span>
          <el-button type="primary" @click="toggleEdit" v-if="!isEditing"
            >编辑信息</el-button
          >
          <div v-else>
            <el-button @click="cancelEdit">取消</el-button>
            <el-button type="success" @click="saveProfile">保存</el-button>
          </div>
        </div>
      </template>

      <el-form
        :model="form"
        label-width="80px"
        class="profile-form"
        :disabled="!isEditing"
      >
        <el-form-item label="头像">
          <el-upload
            class="avatar-uploader"
            action="#"
            :show-file-list="false"
            :auto-upload="false"
            :on-change="onAvatarChange"
            accept="image/*"
            :disabled="!isEditing"
          >
            <img v-if="avatarUrl" :src="avatarUrl" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="账号">
          <el-input v-model="form.account" disabled />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="form.gender">
            <el-radio :value="1">男</el-radio>
            <el-radio :value="0">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.des" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>

      <div class="security-section">
        <el-divider content-position="left">安全设置</el-divider>
        <el-button type="warning" plain @click="openPwdDialog"
          >修改密码</el-button
        >
      </div>

      <div class="favorite-section" ref="favoriteSectionRef">
        <el-divider content-position="left">我的收藏</el-divider>
        <el-tabs v-model="favoriteTab" @tab-change="handleFavoriteTabChange">
          <el-tab-pane label="收藏的商家" name="merchant">
            <div v-if="!merchantFavorites.length" class="empty-state">
               <LottieAnimation path="https://assets9.lottiefiles.com/packages/lf20_s8pbrcfw.json" width="200px" height="200px">
                 <el-empty description="暂无收藏商家" />
               </LottieAnimation>
               <p style="text-align: center; color: #909399; margin-top: -40px;">暂无收藏商家</p>
            </div>
            <div v-else class="favorite-list">
              <div v-for="item in merchantFavorites" :key="item.id" class="favorite-item">
                <div class="favorite-info" @click="goToMerchant(item.targetId)">
                  <img :src="normalizeAvatar(item.avatar || '')" class="favorite-img" />
                  <div class="favorite-text">
                    <div class="favorite-name">{{ item.name || '未知商家' }}</div>
                    <div class="favorite-time">收藏时间：{{ formatTime(item.createTime) }}</div>
                  </div>
                </div>
                <el-button type="danger" size="small" icon="Delete" circle @click="unStar(item.id, 'merchant')" />
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="收藏的商品" name="product">
            <div v-if="!productFavorites.length" class="empty-state">
               <LottieAnimation path="https://assets9.lottiefiles.com/packages/lf20_s8pbrcfw.json" width="200px" height="200px">
                 <el-empty description="暂无收藏商品" />
               </LottieAnimation>
               <p style="text-align: center; color: #909399; margin-top: -40px;">暂无收藏商品</p>
            </div>
            <div v-else class="favorite-list">
              <div v-for="item in productFavorites" :key="item.id" class="favorite-item">
                <div class="favorite-info" @click="goToProduct(item.targetId)">
                  <img :src="normalizeAvatar(item.pic || '')" class="favorite-img" />
                  <div class="favorite-text">
                    <div class="favorite-name">{{ item.title || '未知商品' }}</div>
                    <div class="favorite-desc">{{ item.des || '暂无描述' }}</div>
                    <div class="favorite-time">收藏时间：{{ formatTime(item.createTime) }}</div>
                  </div>
                </div>
                <el-button type="danger" size="small" icon="Delete" circle @click="unStar(item.id, 'product')" />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-card>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="pwdDialogVisible" title="修改密码" width="400px">
      <el-form :model="pwdForm" label-width="80px">
        <el-form-item label="旧密码">
          <el-input v-model="pwdForm.oldPWD" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="pwdForm.newPWD" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="pwdForm.newPWD2" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="pwdDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitPwd">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="Profile">
import { ref, computed, onMounted } from "vue";
import { Plus, Delete } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import request from "@/utils/request";
import { useRoute, useRouter } from "vue-router";
import LottieAnimation from '@/components/LottieAnimation.vue';

const router = useRouter();
const route = useRoute();
const isEditing = ref(false);
const pwdDialogVisible = ref(false);

// 收藏相关
const favoriteTab = ref('merchant');
const merchantFavorites = ref<any[]>([]);
const productFavorites = ref<any[]>([]);

const formatTime = (timeStr: string) => {
  if (!timeStr) return '';
  return new Date(timeStr).toLocaleString();
};

const handleFavoriteTabChange = () => {
  // 可以根据 tab 切换做一些懒加载，这里暂不需要，因为 fetchFavorites 一次性加载了
};

const fetchFavorites = async () => {
  if (!user.value?.id) return;
  try {
    const res: any = await request.get("favorite/getStar", {
      params: { userId: user.value.id }
    });
    
    if (res?.code === 200 || res?.success === true) {
      const list = res.data || [];
      // 分类
      const merchants = list.filter((i: any) => i.targetType === 0);
      const products = list.filter((i: any) => i.targetType === 1);
      
      // 异步获取详情
      // 获取商家详情
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

      // 获取商品详情
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
            des: gData.des,
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

const unStar = async (id: number, type: string) => {
  try {
    const res: any = await request.put("favorite/unStar", null, {
      params: { id }
    });
    if (res?.code === 200 || res?.success === true) {
      ElMessage.success("取消收藏成功");
      // 本地移除
      if (type === 'merchant') {
        merchantFavorites.value = merchantFavorites.value.filter(item => item.id !== id);
      } else {
        productFavorites.value = productFavorites.value.filter(item => item.id !== id);
      }
    } else {
      ElMessage.error(res?.msg || "操作失败");
    }
  } catch (e: any) {
    ElMessage.error(e.message || "操作失败");
  }
};

const goToMerchant = (id: number) => {
  if (id) {
    router.push(`/merchant/${id}`);
  }
};

const goToProduct = (id: number) => {
  router.push(`/product/${id}`);
};

// 用户信息初始化
const rawUser = sessionStorage.getItem("user_user");
const user = ref<any>(rawUser ? JSON.parse(rawUser) : {});

const form = ref({
  account: user.value.account || "",
  username: user.value.username || "",
  gender: user.value.gender ?? 1,
  des: user.value.des || "",
  avatar: user.value.icon || user.value.avatar || "",
});

const pwdForm = ref({
  oldPWD: "",
  newPWD: "",
  newPWD2: "",
});

const baseURL = request?.defaults?.baseURL || "";
const normalizeAvatar = (p: string) => {
  if (!p) return "";
  let s = String(p).trim().replace(/\\/g, "/");
  if (s.startsWith("http") || s.startsWith("data:")) return s;
  const uploadIdx = s.toLowerCase().lastIndexOf("/upload/");
  if (uploadIdx >= 0) {
    s = s.slice(uploadIdx);
  }
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

const avatarUrl = computed(() => normalizeAvatar(form.value.avatar));

const updateLocalUser = (updates: any) => {
  const raw = sessionStorage.getItem("user_user");
  const u = raw ? JSON.parse(raw) : {};
  const merged = { ...u, ...updates };
  sessionStorage.setItem("user_user", JSON.stringify(merged));
  user.value = merged;
};

const fetchUserInfo = async () => {
  const id = user.value?.id;
  if (!id) return;
  try {
    const res: any = await request.get(`users/${id}`);
    const ok = res?.code === 200 || res?.success === true;
    if (ok && res.data) {
      updateLocalUser(res.data);
      // Sync form with new data
      form.value = {
        account: res.data.account || "",
        username: res.data.username || "",
        gender: res.data.gender ?? 1,
        des: res.data.des || "",
        avatar: res.data.icon || res.data.avatar || "",
      };
    }
  } catch (e) {
    console.error("Fetch user info failed", e);
  }
};

const favoriteSectionRef = ref<HTMLElement | null>(null);

onMounted(() => {
  fetchUserInfo();
  fetchFavorites();
  // 如果 URL query 中有 tab=favorite，则自动滚动到收藏区域
  if (route.query.tab === 'favorite') {
    setTimeout(() => {
      favoriteSectionRef.value?.scrollIntoView({ behavior: 'smooth' });
    }, 500);
  }
});

const toggleEdit = () => {
  isEditing.value = true;
};

const cancelEdit = () => {
  // 恢复原始数据
  const raw = sessionStorage.getItem("user_user");
  const u = raw ? JSON.parse(raw) : {};
  form.value = {
    account: u.account || "",
    username: u.username || "",
    gender: u.gender ?? 1,
    des: u.des || "",
    avatar: u.icon || u.avatar || "",
  };
  isEditing.value = false;
};

const onAvatarChange = async (file: any) => {
  if (!file?.raw) return;
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error("图片大小不能超过 10MB");
    return;
  }

  const formData = new FormData();
  formData.append("id", String(user.value.id));
  formData.append("pic", file.raw);

  try {
    const res: any = await request.post("users/upload", formData);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error(res?.msg || "上传失败");
      return;
    }

    // 获取返回的 URL
    const url =
      typeof res?.data === "string"
        ? res.data
        : res?.data?.url ?? res?.data?.path ?? "";

    if (url) {
      const finalUrl = normalizeAvatar(url) + `?t=${Date.now()}`;
      form.value.avatar = finalUrl;
      updateLocalUser({ icon: finalUrl });
      ElMessage.success("头像上传成功");
    }
  } catch (e: any) {
    ElMessage.error(e.message || "上传出错");
  }
};

const saveProfile = async () => {
  const payload = {
    id: user.value.id,
    username: form.value.username,
    gender: form.value.gender,
    icon: form.value.avatar,
    des: form.value.des,
  };

  try {
    const res: any = await request.put("users/modifyUser", payload);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error(res?.msg || "保存失败");
      return;
    }

    // 检查并存储新 Token
    const newToken = res.data?.token || res.token;
    if (newToken) {
      sessionStorage.setItem("token", newToken);
      sessionStorage.setItem("user_token", newToken);
    }

    // 使用后端返回的数据更新本地状态
    // const newUserInfo = res.data || payload;
    // updateLocalUser(newUserInfo);

    // 重新加载用户信息
    await fetchUserInfo();

    isEditing.value = false;
    ElMessage.success("保存成功");
    // 触发全局事件更新 Header 等组件状态
    window.dispatchEvent(new Event("userstatechange"));
  } catch (e: any) {
    ElMessage.error(e.message || "保存失败");
  }
};

const openPwdDialog = () => {
  pwdForm.value = { oldPWD: "", newPWD: "", newPWD2: "" };
  pwdDialogVisible.value = true;
};

const submitPwd = async () => {
  if (
    !pwdForm.value.oldPWD ||
    !pwdForm.value.newPWD ||
    !pwdForm.value.newPWD2
  ) {
    ElMessage.error("请填写完整密码信息");
    return;
  }
  if (pwdForm.value.newPWD !== pwdForm.value.newPWD2) {
    ElMessage.error("两次新密码不一致");
    return;
  }

  try {
    const params = {
      id: user.value.id,
      oldPWD: pwdForm.value.oldPWD,
      newPWD: pwdForm.value.newPWD,
      newPWD2: pwdForm.value.newPWD2,
    };
    const res: any = await request.put("users/modifyPWD", null, { params });
    const ok = res?.code === 200 || res?.success === true;

    if (!ok) {
      ElMessage.error(res?.msg || "修改失败");
      return;
    }

    ElMessage.success("密码修改成功，请重新登录");
    pwdDialogVisible.value = false;
    // 退出登录逻辑
    sessionStorage.removeItem("user_isLoggedIn");
    sessionStorage.removeItem("user_user");
    sessionStorage.removeItem("user_token");
    sessionStorage.removeItem("token");
    router.push("/login");
  } catch (e: any) {
    ElMessage.error(e.message || "请求失败");
  }
};
</script>

<style scoped>
.profile-container {
  max-width: 800px;
  margin: 20px auto;
  padding: 0 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-form {
  max-width: 500px;
  margin: 0 auto;
}

.avatar-uploader .avatar {
  width: 100px;
  height: 100px;
  display: block;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #dcdfe6;
}

.avatar-uploader .avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  text-align: center;
  border: 1px dashed #dcdfe6;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
}

.avatar-uploader .avatar-uploader-icon:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.security-section, .favorite-section {
  margin-top: 40px;
}

.favorite-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.favorite-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  transition: all 0.3s;
}

.favorite-item:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.favorite-info {
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  flex: 1;
}

.favorite-img {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  object-fit: cover;
}

.favorite-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.favorite-name {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.favorite-desc {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.favorite-time {
  font-size: 12px;
  color: #c0c4cc;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}
</style>