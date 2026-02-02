<template>
  <main class="body">
    <div class="grid">
      <!-- 左：热门商品排行 -->
      <section class="left">
        <h3>热门商品排行</h3>
        <ol class="rank-list">
          <li v-for="(item, index) in hotProducts" :key="item.id">
            <span class="rank">{{ index + 1 }}</span>
            <span class="title">{{ item.title }}</span>
          </li>
        </ol>
      </section>

      <!-- 中：轮播图 -->
      <section class="center">
        <el-carousel height="100%" indicator-position="outside">
          <el-carousel-item v-for="src in carouselImages" :key="src">
            <div class="slide">
              <img :src="src" alt="carousel image" />
            </div>
          </el-carousel-item>
        </el-carousel>
      </section>

      <!-- 右：个人信息 / 登录注册 -->
      <section class="right">
        <div v-if="isLoggedIn" class="profile">
          <h3>个人信息</h3>
          <el-card>
            <p>昵称：{{ user?.username || user?.account || "用户" }}</p>
            <p>角色：{{ roleName }}</p>
            <el-button type="danger" size="small" @click="logout"
              >退出登录</el-button
            >
          </el-card>
        </div>
        <div v-else class="auth-actions">
          <h3>请登录</h3>
          <div class="auth-buttons">
            <router-link to="/login">
              <el-button type="primary" size="large">登录</el-button>
            </router-link>
            <router-link :to="{ path: '/login', query: { mode: 'register' } }">
              <el-button type="success" size="large">注册</el-button>
            </router-link>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts" name="Body">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import request from "@/utils/request";

const isLoggedIn = ref(false);
const user = ref<any>(null);
try {
  const raw = sessionStorage.getItem("user");
  user.value = raw ? JSON.parse(raw) : null;
} catch {
  user.value = null;
}
const roleName = computed(() => {
  const r = user.value?.role;
  if (r === 1) return "商家";
  if (r === 2) return "管理员";
  return "用户";
});
const logout = () => {
  sessionStorage.removeItem("user_isLoggedIn");
  sessionStorage.removeItem("user_user");
  sessionStorage.removeItem("user_token");
  sessionStorage.removeItem("token");
  isLoggedIn.value = false;
  user.value = null;
  window.dispatchEvent(new Event("userstatechange"));
};

const updateState = () => {
  const token = sessionStorage.getItem("user_isLoggedIn") === "1";
  try {
    const raw = sessionStorage.getItem("user_user");
    user.value = raw ? JSON.parse(raw) : null;
  } catch {
    user.value = null;
  }
  const roleOk = user.value?.role === 0;
  isLoggedIn.value = token && roleOk;
};

const hotProducts = ref<Array<{ id: number; title: string }>>([]);

const fetchHotProducts = async () => {
  try {
    const res = await request.get("goods/categoryList");
    const ok = res?.code === 200 || res?.success === true;
    if (ok && Array.isArray(res?.data)) {
      hotProducts.value = res.data.slice(0, 10).map((c: any) => ({
        id: Number(c.id),
        title: String(c.name),
      }));
      return;
    }
  } catch {}
  // Fallback data
  hotProducts.value = Array.from({ length: 10 }).map((_, i) => ({
    id: i + 1,
    title: `热门商品 ${i + 1}`,
  }));
};

onMounted(() => {
  window.addEventListener("userstatechange", updateState);
  updateState();
  fetchHotProducts();
});

onBeforeUnmount(() => {
  window.removeEventListener("userstatechange", updateState);
});

const carouselImages = ref<string[]>([
  "/carouseImg/1.jpg",
  "/carouseImg/2.jpg",
  "/carouseImg/3.jpg",
  "/carouseImg/4.jpg",
]);
</script>

<style scoped>
.body {
  padding: 16px 24px;
  height: 68vh;
  box-sizing: border-box;
  margin-top: 16px;
  overflow: visible;
  margin-bottom: 64px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 16px;
  height: 100%;
}
.left,
.center,
.right {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  box-sizing: border-box;
}
.left h3,
.right h3 {
  margin: 0 0 8px 0;
  color: #303133;
}
.rank-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-width: 360px;
  margin-left: auto;
  margin-right: auto;
}
.rank-list li {
  display: flex;
  align-items: center;
  padding: 8px 0;
  justify-content: space-between;
  border-bottom: 1px dashed #ebeef5;
}
.rank-list li:hover {
  background: #fff7f2;
  border-bottom-color: #ffd2b3;
  transform: translateY(-1px);
}
.rank-list li::after {
  content: "";
  width: 22px; /* mirror rank width to keep title centered */
}
.rank-list li:last-child {
  border-bottom: none;
}
.rank {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: var(--jd-orange);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.title {
  flex: 1;
  text-align: center;
}
.center {
  padding: 0;
  overflow: hidden;
}
.center :deep(.el-carousel) {
  height: 100%;
}
.center :deep(.el-carousel__container) {
  height: 100%;
}
.center :deep(.el-carousel__item) {
  height: 100%;
}
.slide {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}
.slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.auth-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.auth-buttons {
  display: flex;
  gap: 12px;
}
.profile :deep(.el-card) {
  width: 100%;
}
</style>
