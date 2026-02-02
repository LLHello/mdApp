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
import { Plus } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import request from "@/utils/request";
import { useRouter } from "vue-router";

const router = useRouter();
const isEditing = ref(false);
const pwdDialogVisible = ref(false);

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

onMounted(() => {
  fetchUserInfo();
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

.security-section {
  margin-top: 40px;
}
</style>