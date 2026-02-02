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
          <div class="price">￥{{ Number(product.price).toFixed(2) }}</div>
          <div class="desc-label">商品描述：</div>
          <div class="desc">{{ product.des || "暂无描述" }}</div>
          <div class="actions">
            <el-button type="primary" size="large">立即购买</el-button>
          </div>
        </div>
      </div>
      <el-empty v-else description="加载中..." />
    </el-card>
  </div>
</template>

<script setup lang="ts" name="ProductDetail">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import request from "@/utils/request";

const route = useRoute();
const product = ref<any>(null);
const images = ref<string[]>([]);
const activeIndex = ref(0);
const initialIndex = ref(0);
const carouselRef = ref<any>(null);

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
    // 添加时间戳防止缓存
    const res: any = await request.get(`goods/good/${id}?t=${Date.now()}`);
    const ok = res?.code === 200 || res?.success === true;
    if (ok && res.data) {
      product.value = res.data;

      // 处理图片
      let picList: string[] = [];
      if (res.data.pic) {
        if (Array.isArray(res.data.pic)) {
          picList = res.data.pic;
        } else if (typeof res.data.pic === "string") {
          picList = res.data.pic.split(",");
        }
      }
      
      // 过滤空值并去重
      picList = picList
        .map((p) => String(p).trim())
        .filter((p) => p && p !== "null" && p !== "undefined");
        
      // 规范化图片路径
      images.value = picList.map((url) => normalizeAvatar(url));

      if (images.value.length === 0) {
        // 默认图
        images.value = ["/carouseImg/1.jpg"];
      }
      
      // 重置索引
      activeIndex.value = 0;
      initialIndex.value = 0;
      if (carouselRef.value) {
        carouselRef.value.setActiveItem(0);
      }
    }
  } catch (e) {
    console.error("Fetch product detail failed", e);
  }
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
    if (newId) fetchProduct();
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
