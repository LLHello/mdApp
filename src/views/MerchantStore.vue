<template>
  <div class="merchant-store">
    <div class="store-header">
      <div class="store-info">
        <img :src="merchantAvatar" class="store-avatar" />
        <div class="store-details">
          <h2 class="store-name">{{ merchantName }}</h2>
          <p class="store-desc">{{ merchantDesc || '暂无简介' }}</p>
        </div>
      </div>
      <div class="store-actions">
        <div class="fans-count">
          粉丝数：{{ fansCount }}
        </div>
        <el-button 
          type="danger" 
          :plain="!isFavorite" 
          :icon="isFavorite ? 'StarFilled' : 'Star'" 
          @click="toggleFavorite"
          :loading="favoriteLoading"
        >
          {{ isFavorite ? '已收藏' : '收藏店铺' }}
        </el-button>
      </div>
    </div>

    <el-divider />

    <div class="store-products">
      <h3>全部商品</h3>
      <div v-if="!products.length && !loading" class="empty-state">
         <LottieAnimation path="https://assets9.lottiefiles.com/packages/lf20_s8pbrcfw.json" width="200px" height="200px">
           <el-empty description="该商家暂无商品" />
         </LottieAnimation>
         <p style="text-align: center; color: #909399; margin-top: -40px;">该商家暂无商品</p>
      </div>
      <div v-else class="product-grid">
        <el-card
          v-for="item in products"
          :key="item.id"
          class="product-card"
          :body-style="{ padding: '0px' }"
          shadow="hover"
          @click="goToProduct(item.id)"
        >
          <div class="image-wrapper">
            <img :src="normalizeAvatar(item.pic[0])" class="image" />
          </div>
          <div class="card-content">
            <h3 class="product-title" :title="item.title">{{ item.title }}</h3>
            <div class="bottom">
              <span class="price">¥ {{ item.price }}</span>
              <span class="sales">销量: {{ item.sales || 0 }}</span>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '@/utils/request';
import LottieAnimation from '@/components/LottieAnimation.vue';
import { formatMoney, pickGoodsPriceValue } from '@/utils/goods';

const route = useRoute();
const router = useRouter();
const merchantId = ref(Number(route.params.id));
const merchantName = ref('');
const merchantAvatar = ref('/vite.svg');
const merchantDesc = ref('');
const products = ref<any[]>([]);
const loading = ref(false);
const fansCount = ref(0);

const isFavorite = ref(false);
const favoriteLoading = ref(false);
const favoriteId = ref<number | null>(null);

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
  if (uploadIdx >= 0) s = s.slice(uploadIdx);
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

const fetchMerchantInfo = async () => {
  if (!merchantId.value) return;
  try {
    const res: any = await request.get(`users/${merchantId.value}`);
    if (res?.code === 200 || res?.success === true) {
      const data = res.data;
      merchantName.value = data.username || data.nickname || data.account || '未知商家';
      merchantAvatar.value = normalizeAvatar(data.icon || data.avatar || data.pic || '/vite.svg');
      merchantDesc.value = data.des || '';
    }
    
    // 获取粉丝数
    const fansRes: any = await request.get('favorite/getFans', {
      params: { merchantId: merchantId.value }
    });
    if (fansRes?.code === 200 || fansRes?.success === true) {
      if (Array.isArray(fansRes.data)) {
        fansCount.value = fansRes.data.length;
      } else if (typeof fansRes.data === 'number') {
        fansCount.value = fansRes.data;
      } else if (fansRes.data?.total) {
        fansCount.value = Number(fansRes.data.total) || 0;
      } else {
        fansCount.value = 0;
      }
    }
  } catch (e) {
    console.error('Fetch merchant info failed', e);
  }
};

const fetchMerchantProducts = async () => {
  if (!merchantId.value) return;
  loading.value = true;
  try {
    const res: any = await request.get(`goods/merchantGoods/${merchantId.value}`);
    if (res?.code === 200 || res?.success === true) {
      const list = res.data || [];
      products.value = list.map((p: any) => {
        let picList: string[] = [];
        if (typeof p.pic === "string") {
          picList = p.pic.split(",").filter(Boolean);
        } else if (Array.isArray(p.pic)) {
          picList = p.pic.filter(Boolean);
        }
        if (picList.length === 0) picList = ["/carouseImg/1.jpg"];
        
        return {
          ...p,
          pic: picList,
          price: formatMoney(pickGoodsPriceValue(p))
        };
      });
    }
  } catch (e) {
    console.error('Fetch merchant products failed', e);
  } finally {
    loading.value = false;
  }
};

const checkFavoriteStatus = async () => {
  if (!userInfo.value || !merchantId.value) return;
  try {
    const res: any = await request.get("favorite/getStar", {
      params: { userId: userInfo.value.id }
    });
    
    if (res?.code === 200 || res?.success === true) {
      const list = res.data || [];
      // targetType=0 为商家
      const found = list.find((item: any) => item.targetType === 0 && Number(item.targetId) === merchantId.value);
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
  if (!merchantId.value) return;
  
  if (favoriteLoading.value) return;
  favoriteLoading.value = true;

  try {
    if (isFavorite.value) {
      // 取消收藏
      if (!favoriteId.value) {
         // 尝试重新获取一下
         await checkFavoriteStatus();
         if (!favoriteId.value) {
            ElMessage.error("获取收藏信息失败，请刷新重试");
            return;
         }
      }
      
      const res: any = await request.put("favorite/unStar", null, {
        params: { id: favoriteId.value }
      });
      
      if (res?.code === 200 || res?.success === true) {
        isFavorite.value = false;
        favoriteId.value = null;
        fansCount.value = Math.max(0, fansCount.value - 1);
        ElMessage.success("已取消关注");
      } else {
        ElMessage.error(res?.msg || "操作失败");
      }
    } else {
      // 添加收藏
      const formData = new FormData();
      formData.append('userId', userInfo.value.id);
      formData.append('targetType', '0'); // 0: 商家
      formData.append('targetId', String(merchantId.value));
      
      const res: any = await request.post("favorite/star", formData);
      
      if (res?.code === 200 || res?.success === true) {
        await checkFavoriteStatus();
        if (isFavorite.value) {
           fansCount.value += 1;
           ElMessage.success("关注成功");
        } else {
           ElMessage.warning("关注成功但同步状态失败，请刷新页面");
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

const goToProduct = (id: number) => {
  router.push(`/product/${id}`);
};

onMounted(() => {
  fetchMerchantInfo();
  fetchMerchantProducts();
  checkFavoriteStatus();
});

watch(() => route.params.id, (newId) => {
  if (newId) {
    merchantId.value = Number(newId);
    fetchMerchantInfo();
    fetchMerchantProducts();
    checkFavoriteStatus();
  }
});
</script>

<style scoped>
.merchant-store {
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 20px;
}
.store-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}
.store-info {
  display: flex;
  align-items: center;
  gap: 20px;
}
.store-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #ebeef5;
}
.store-name {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #303133;
}
.store-desc {
  margin: 0;
  color: #909399;
  font-size: 14px;
}
.fans-count {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}
.store-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}
.store-products {
  margin-top: 20px;
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}
.product-card {
  cursor: pointer;
  transition: transform 0.2s;
}
.product-card:hover {
  transform: translateY(-4px);
}
.image-wrapper {
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}
.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-content {
  padding: 12px;
}
.product-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.price {
  color: #f56c6c;
  font-size: 16px;
  font-weight: bold;
}
.sales {
  font-size: 12px;
  color: #909399;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}
</style>
