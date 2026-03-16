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
          <div class="price">￥{{ displayPriceText }}</div>
          <div class="sku-section" v-if="skuOptions.length">
            <div class="sku-row">
              <span class="sku-label">规格：</span>
              <el-radio-group v-model="selectedSkuId" class="sku-radio-group">
                <el-radio-button
                  v-for="s in skuOptions"
                  :key="s.skuId"
                  :label="s.skuId"
                  :disabled="s.disabled"
                >
                  {{ s.label }}
                </el-radio-button>
              </el-radio-group>
            </div>
            <div class="sku-meta" v-if="selectedSku">
              <span class="sku-meta-item">库存：{{ selectedSku.stock ?? 0 }}</span>
              <span class="sku-meta-item" v-if="selectedSku.saleCount != null"
                >销量：{{ selectedSku.saleCount }}</span
              >
            </div>
          </div>
          <!-- 商品优惠券区域 -->
          <div class="coupon-section" v-if="goodsCoupons.length">
            <div class="coupon-label">优惠券：</div>
            <div class="coupon-tags">
              <div
                v-for="c in goodsCoupons"
                :key="c.id"
                class="coupon-tag"
              >
                <span class="coupon-tag-text">减¥{{ c.discountAmount }} 满{{ c.thresholdAmount }}可用</span>
                <el-button
                  type="danger"
                  size="small"
                  :loading="claimingId === c.id"
                  @click="handleClaimCoupon(c)"
                >领取</el-button>
              </div>
            </div>
          </div>
          <div class="desc-label">商品描述：</div>
          <div class="desc">{{ product.des || "暂无描述" }}</div>
          <div class="actions">
            <el-button type="primary" size="large" @click="handleBuy">立即购买</el-button>
            <el-button type="warning" size="large" plain @click="addToCart">加入购物车</el-button>
            <el-button 
              type="info" 
              size="large" 
              plain 
              @click="goChat"
            >
              联系客服
            </el-button>
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
      <!-- 评论区：放在商品详情下方 -->
      <GoodsComment v-if="product" :goods-id="Number(route.params.id)" />
    </el-card>
  </div>
</template>

<script setup lang="ts" name="ProductDetail">
import { ref, onMounted, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from 'element-plus';
import { ArrowRight } from '@element-plus/icons-vue';
import request from "@/utils/request";
import { formatMoney, parseSkuAttrs, pickGoodsPriceValue, pickSkuPriceValue, skuAttrsToLabel } from "@/utils/goods";
import { cartAdd } from "@/api/cart";
import { dispatchCartChanged } from "@/utils/cartEvents";
import { couponsByGoods, couponSeckill, type Coupon } from "@/api/coupon";
import GoodsComment from "@/components/GoodsComment.vue";

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

// ---- 商品优惠券 ----
const goodsCoupons = ref<Coupon[]>([]);
const fetchGoodsCoupons = async (goodsId: number) => {
  try {
    const res: any = await couponsByGoods(goodsId);
    const ok = res?.code === 200 || res?.success === true;
    if (ok) goodsCoupons.value = res.data || [];
  } catch {}
};
const claimingId = ref<number | null>(null);
const handleClaimCoupon = async (coupon: Coupon) => {
  if (!userInfo.value) { ElMessage.warning('请先登录'); router.push('/login'); return; }
  if (!coupon.id || claimingId.value === coupon.id) return;
  claimingId.value = coupon.id;
  try {
    const res: any = await couponSeckill(coupon.id);
    const ok = res?.code === 200 || res?.success === true;
    if (ok) {
      ElMessage.success('领取成功！可在购物车结算时使用');
      fetchGoodsCoupons(Number(route.params.id));
    } else {
      ElMessage.error(res?.msg || '领取失败');
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '领取失败');
  } finally {
    claimingId.value = null;
  }
};

type SkuOption = {
  skuId: number;
  label: string;
  stock: number | null;
  saleCount: number | null;
  disabled: boolean;
  priceValue: number | null;
  raw: any;
};

const skuOptions = ref<SkuOption[]>([]);
const selectedSkuId = ref<number | null>(null);
const selectedSku = computed(() =>
  skuOptions.value.find((s) => s.skuId === selectedSkuId.value) || null
);

const displayPriceText = computed(() => {
  if (selectedSku.value?.priceValue != null) {
    return formatMoney(selectedSku.value.priceValue);
  }
  return formatMoney(pickGoodsPriceValue(product.value));
});

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
      const rawSkus = Array.isArray(res.data?.skus) ? res.data.skus : [];
      skuOptions.value = rawSkus
        .map((s: any) => {
          const skuId = Number(s?.skuId ?? s?.id ?? s?.sku_id);
          if (!Number.isFinite(skuId)) return null;
          const attrs = parseSkuAttrs(s?.skuAttrs ?? s?.sku_attrs ?? s?.attrs);
          const label =
            skuAttrsToLabel(attrs) || (Number.isFinite(skuId) ? `SKU ${skuId}` : "SKU");
          const stock = s?.stock != null ? Number(s.stock) : null;
          const saleCount = s?.saleCount != null ? Number(s.saleCount) : null;
          const priceValue = pickSkuPriceValue(s);
          const disabled = stock != null ? stock <= 0 : false;
          return { skuId, label, stock, saleCount, disabled, priceValue, raw: s } as SkuOption;
        })
        .filter((x: SkuOption | null): x is SkuOption => x != null);
      if (skuOptions.value.length) {
        const firstAvailable = skuOptions.value.find((s) => !s.disabled);
        selectedSkuId.value = (firstAvailable ?? skuOptions.value[0])?.skuId ?? null;
      } else {
        selectedSkuId.value = null;
      }
      
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
      fetchGoodsCoupons(Number(id));
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

const goToMerchant = () => {
  if (merchantId.value) {
    router.push(`/merchant/${merchantId.value}`);
  }
};

const goChat = () => {
  if (!userInfo.value) {
    ElMessage.warning("请先登录");
    router.push("/login");
    return;
  }
  if (!merchantId.value || !product.value?.id) {
    ElMessage.error("暂时无法发起客服会话，请稍后再试");
    return;
  }
  router.push({
    path: "/messages",
    query: {
      tab: "chat",
      merchantId: String(merchantId.value),
      goodsId: String(product.value.id),
    },
  });
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
  const skuId = selectedSkuId.value;
  if (!skuId) {
    ElMessage.warning("请选择规格");
    return;
  }

  try {
    const res: any = await cartAdd(skuId, 1);
    
    if (res?.code === 200 || res?.success === true) {
      ElMessage.success("已加入购物车");
      dispatchCartChanged();
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
  addToCart().then(() => {
    router.push("/cart");
  });
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
.sku-section {
  margin: 8px 0 12px;
}
.sku-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}
.sku-label {
  color: #606266;
  font-weight: 600;
  line-height: 32px;
}
.sku-radio-group :deep(.el-radio-button__inner) {
  border-radius: 16px;
}
.sku-meta {
  margin-top: 8px;
  color: #909399;
  font-size: 13px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.sku-meta-item {
  line-height: 1.4;
}

.coupon-section {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 8px 0 12px;
  flex-wrap: wrap;
}

.coupon-label {
  color: #606266;
  font-weight: 600;
  line-height: 28px;
  flex-shrink: 0;
}

.coupon-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.coupon-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fff0f0;
  border: 1px dashed #ff6b6b;
  border-radius: 4px;
  padding: 3px 8px;
}

.coupon-tag-text {
  font-size: 12px;
  color: #e1251b;
  font-weight: 600;
}
</style>
