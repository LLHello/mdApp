<template>
  <div class="detail">
    <el-breadcrumb separator="/">
      <el-breadcrumb-item to="/">首页</el-breadcrumb-item>
      <el-breadcrumb-item>商品详情</el-breadcrumb-item>
    </el-breadcrumb>
    <el-card class="detail-card">
      <div v-if="product" class="detail-grid">
        <div class="image-wrap">
          <el-carousel
            trigger="click"
            height="400px"
            :autoplay="false"
            arrow="always"
            :initial-index="initialIndex"
            @change="onCarouselChange"
            ref="carouselRef"
          >
            <el-carousel-item v-for="(img, idx) in images" :key="idx">
              <div class="carousel-image-container">
                <img :src="img" alt="商品图片" />
              </div>
            </el-carousel-item>
          </el-carousel>
          <!-- 缩略图列表 -->
          <div class="thumbnail-list" v-if="images.length > 1">
            <div
              v-for="(img, idx) in images"
              :key="idx"
              class="thumbnail-item"
              :class="{ active: idx === activeIndex }"
              @click="setActiveItem(idx)"
            >
              <img :src="img" alt="缩略图" />
            </div>
          </div>
        </div>
        <div class="info-wrap">
          <h2 class="title">{{ product.title }}</h2>
          <div class="meta">
            <span class="clicks">点击量：{{ clickCount }}</span>
          </div>
          <div class="merchant" v-if="merchantName || merchantAvatar" @click="goToMerchant">
            <img class="merchant-avatar" :src="merchantAvatar || '/vite.svg'" alt="商家头像" />
            <span class="merchant-name">{{ merchantName || "商家" }}</span>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
          <div class="price">￥{{ Number(product.price).toFixed(2) }}</div>
          <div class="desc-label">商品描述：</div>
          <div class="desc">{{ product.des || "暂无描述" }}</div>
          <div class="actions">
            <el-button type="primary" size="large" @click="handleBuy">立即购买</el-button>
            <el-button type="warning" size="large" plain @click="addToCart">加入购物车</el-button>
            <el-button 
              type="danger" 
              size="large" 
              plain 
              @click="toggleFavorite"
              :icon="isFavorite ? 'StarFilled' : 'Star'"
              :loading="favoriteLoading"
            >
              {{ isFavorite ? '已收藏' : '收藏' }}
            </el-button>
          </div>
        </div>
      </div>
      <el-empty v-else description="加载中..." />
    </el-card>
  </div>
</template>

<script setup lang="ts" name="ProductDetail">
import { ref, onMounted, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from 'element-plus';
import { Star, StarFilled, ArrowRight } from '@element-plus/icons-vue';
import request from "@/utils/request";

const route = useRoute();
const router = useRouter();
const product = ref<any>(null);
const images = ref<string[]>([]);
const activeIndex = ref(0);
const initialIndex = ref(0);
const carouselRef = ref<any>(null);
const clickCount = ref<number>(0);
const merchantName = ref<string>("");
const merchantAvatar = ref<string>("");
const merchantId = ref<number | null>(null);
const isFavorite = ref(false);
const favoriteLoading = ref(false);

const userInfo = computed(() => {
  const userStr = sessionStorage.getItem('user_user');
  return userStr ? JSON.parse(userStr) : null;
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
  if (!/\/upload\//i.test(s) && !/\/carouseImg\//i.test(s)) {
    const parts = s.split("/");
    const filename = parts[parts.length - 1];
    s = "/upload/" + filename;
  }
  const b = baseURL?.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
  s = s.startsWith("/") ? s : "/" + s;
  const url = b + s;
  return url.replace(/([^:])\/{2,}/g, "$1/");
};

const fetchProduct = async () => {
  const id = route.params.id;
  if (!id) return;
  try {
    const res: any = await request.get(`goods/good/${id}?t=${Date.now()}`);
    const ok = res?.code === 200 || res?.success === true;
    if (ok && res.data) {
      product.value = res.data;
      
      // 检查收藏状态
      checkFavoriteStatus();

      let picList: string[] = [];
      if (res.data.pic) {
        if (Array.isArray(res.data.pic)) {
          picList = res.data.pic;
        } else if (typeof res.data.pic === "string") {
          picList = res.data.pic.split(",");
        }
      }
      
      picList = picList
        .map((p) => String(p).trim())
        .filter((p) => p && p !== "null" && p !== "undefined");
        
      images.value = picList.map((url) => normalizeAvatar(url));

      if (images.value.length === 0) {
        images.value = ["/carouseImg/1.jpg"];
      }
      
      activeIndex.value = 0;
      initialIndex.value = 0;
      if (carouselRef.value) {
        carouselRef.value.setActiveItem(0);
      }
      fetchClickCount(Number(id));
      const mid =
        res.data?.merchantId ??
        res.data?.merchantID ??
        res.data?.sellerId ??
        res.data?.mid ??
        null;
      if (mid != null) {
        merchantId.value = Number(mid);
        fetchMerchant(Number(mid));
      } else {
        merchantId.value = null;
        merchantName.value = "";
        merchantAvatar.value = "";
      }
    }
  } catch (e) {
    console.error("Fetch product detail failed", e);
  }
};

const goToMerchant = () => {
  if (merchantId.value) {
    router.push(`/merchant/${merchantId.value}`);
  }
};

const fetchClickCount = async (id: number) => {
  try {
    const res: any = await request.get("goods/clickCount", {
      params: { goodId: id },
    });
    const ok = res?.code === 200 || res?.success === true;
    if (ok) {
      if (typeof res?.data === "number") {
        clickCount.value = res.data;
        return;
      }
      const c =
        res?.data?.count ??
        res?.data?.clickCount ??
        res?.data?.clicks ??
        res?.count ??
        res?.clickCount ??
        res?.clicks;
      if (c != null) {
        clickCount.value = Number(c) || 0;
        return;
      }
    }
  } catch {}
  clickCount.value = 0;
};

const pickName = (u: any) =>
  u?.username ?? u?.account ?? u?.nickname ?? u?.name ?? "";
const pickAvatar = (u: any) =>
  u?.icon ?? u?.avatar ?? u?.pic ?? u?.photo ?? u?.image ?? u?.headUrl ?? "";
const fetchMerchant = async (mid: number) => {
  try {
    const res: any = await request.get(`users/${mid}`);
    const ok = res?.code === 200 || res?.success === true;
    if (ok && res?.data) {
      const u = res.data;
      merchantName.value = String(pickName(u) || "");
      merchantAvatar.value = normalizeAvatar(String(pickAvatar(u) || ""));
      return;
    }
  } catch {}
  merchantName.value = "";
  merchantAvatar.value = "";
};

const favoriteId = ref<number | null>(null);

const checkFavoriteStatus = async () => {
  if (!userInfo.value || !product.value?.id) return;
  try {
    // 使用新接口获取所有收藏，然后在前端匹配
    const res: any = await request.get("favorite/getStar", {
      params: { userId: userInfo.value.id }
    });
    
    if (res?.code === 200 || res?.success === true) {
      const list = res.data || [];
      // 查找当前商品是否在收藏列表中 (targetType=1 为商品)
      // 统一转换为字符串比较，避免类型不一致
      const pid = String(product.value.id);
      const found = list.find((item: any) => item.targetType === 1 && String(item.targetId) === pid);
      if (found) {
        isFavorite.value = true;
        favoriteId.value = found.id;
      } else {
        isFavorite.value = false;
        favoriteId.value = null;
      }
    }
  } catch (e) {
    console.error("Check favorite status failed", e);
  }
};

const toggleFavorite = async () => {
  if (!userInfo.value) {
    ElMessage.warning("请先登录");
    router.push("/login");
    return;
  }
  if (!product.value?.id) return;
  
  if (favoriteLoading.value) return;
  favoriteLoading.value = true;

  try {
    if (isFavorite.value) {
      // 取消收藏: PUT /favorite/unStar?id=...
      if (!favoriteId.value) {
        ElMessage.error("获取收藏信息失败，请刷新重试");
        return;
      }
      
      const res: any = await request.put("favorite/unStar", null, {
        params: { id: favoriteId.value }
      });
      
      const ok = res?.code === 200 || res?.success === true;
      if (ok) {
        isFavorite.value = false;
        favoriteId.value = null;
        ElMessage.success("已取消收藏");
      } else {
        ElMessage.error(res?.msg || "操作失败");
      }
    } else {
      // 添加收藏: POST /favorite/star
      // 参数 UserFavorite: { userId, targetType: 1, targetId: ... }
      // 注意：后端接受对象，通常是用 application/json 或者 form-data
      // 这里尝试用 form-data 也就是 post 第二个参数，或者 params
      // 根据 Controller 定义 public Result star(UserFavorite userFavorite)，非 @RequestBody
      // 通常意味着支持 x-www-form-urlencoded 或 query params
      
      const formData = new FormData();
      formData.append('userId', userInfo.value.id);
      formData.append('targetType', '1'); // 1: 商品
      formData.append('targetId', String(product.value.id));
      // createTime removed
      
      const res: any = await request.post("favorite/star", formData);
      
      const ok = res?.code === 200 || res?.success === true;
      if (ok) {
        // 重新获取一下列表以拿到 ID
        await checkFavoriteStatus();
        if (isFavorite.value) {
          ElMessage.success("已收藏");
        } else {
          // 假如checkFavoriteStatus没查到，可能是同步延迟，但这里也不好直接设置true，因为没有id无法取消
          ElMessage.warning("收藏成功但同步状态失败，请刷新页面");
        }
      } else {
        ElMessage.error(res?.msg || "操作失败");
      }
    }
  } catch (e: any) {
    ElMessage.error(e.message || "操作失败");
  } finally {
    favoriteLoading.value = false;
  }
};

const addToCart = async () => {
  if (!userInfo.value) {
    ElMessage.warning("请先登录");
    router.push("/login");
    return;
  }
  if (!product.value?.id) return;

  try {
    const res: any = await request.post("cart/add", null, {
      params: {
        userId: userInfo.value.id,
        goodsId: product.value.id,
        count: 1 // 默认添加1件
      }
    });
    
    if (res?.code === 200 || res?.success === true) {
      ElMessage.success("已加入购物车");
    } else {
      ElMessage.error(res?.msg || "加入购物车失败");
    }
  } catch (e: any) {
    ElMessage.error(e.message || "加入购物车失败");
  }
};

const handleBuy = () => {
  if (!userInfo.value) {
    ElMessage.warning("请先登录");
    router.push("/login");
    return;
  }
  // 这里可以跳转到订单确认页，或者直接触发购买逻辑
  ElMessage.success("功能开发中，敬请期待");
};

const onCarouselChange = (idx: number) => {
  activeIndex.value = idx;
};

const setActiveItem = (idx: number) => {
  if (carouselRef.value) {
    carouselRef.value.setActiveItem(idx);
    activeIndex.value = idx;
  }
};

onMounted(() => {
  fetchProduct();
});

watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      fetchProduct();
    }
  }
);
</script>

<style scoped>
.detail {
  padding: 16px 24px;
}
.detail-card {
  margin-top: 12px;
}
.detail-grid {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
}
.image-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.carousel-image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #ebeef5;
}
.carousel-image-container img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.thumbnail-list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px;
}
.thumbnail-item {
  width: 60px;
  height: 60px;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  overflow: hidden;
  flex-shrink: 0;
  transition: all 0.2s;
}
.thumbnail-item.active {
  border-color: var(--jd-red, #e1251b);
}
.thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.info-wrap {
  display: flex;
  flex-direction: column;
}
.info-wrap .title {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 22px;
  line-height: 1.4;
}
.meta {
  margin-bottom: 8px;
  color: #909399;
  font-size: 13px;
}
.merchant {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}
.merchant:hover {
  background-color: #f5f7fa;
}
.arrow-icon {
  font-size: 14px;
  color: #909399;
}
.merchant-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #ebeef5;
}
.merchant-name {
  color: #606266;
}
.info-wrap .price {
  color: #e1251b;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
}
.desc-label {
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}
.info-wrap .desc {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 32px;
  flex-grow: 1;
  white-space: pre-wrap;
}
.actions {
  margin-top: auto;
}
</style>
