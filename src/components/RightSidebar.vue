<template>
  <aside class="right-sidebar">
    <button class="item" type="button" @click="go('/messages')" @mouseenter="playAnim('messages')" @mouseleave="stopAnim('messages')">
      <div class="icon-wrap" ref="messagesIcon">
        <el-icon v-show="!animsLoaded.messages"><Bell /></el-icon>
      </div>
      <div class="label">消息</div>
      <span class="badge" v-if="badgeCount > 0">{{ badgeCount }}</span>
    </button>
    <button class="item" type="button" @click="go('/cart')" @mouseenter="playAnim('cart')" @mouseleave="stopAnim('cart')">
      <div class="icon-wrap" ref="cartIcon">
        <el-icon v-show="!animsLoaded.cart"><ShoppingCart /></el-icon>
      </div>
      <div class="label">购物车</div>
      <span class="badge" v-if="cartCount > 0">{{ cartCount }}</span>
    </button>
    <button class="item" type="button" @click="go('/orders')" @mouseenter="playAnim('orders')" @mouseleave="stopAnim('orders')">
      <div class="icon-wrap" ref="ordersIcon">
        <el-icon v-show="!animsLoaded.orders"><List /></el-icon>
      </div>
      <div class="label">订单</div>
    </button>
    <button class="item" type="button" @click="go('/profile')" @mouseenter="playAnim('profile')" @mouseleave="stopAnim('profile')">
      <div class="icon-wrap" ref="profileIcon">
        <el-icon v-show="!animsLoaded.profile"><User /></el-icon>
      </div>
      <div class="label">我的</div>
    </button>
    <button class="item" type="button" @click="go('/service')" @mouseenter="playAnim('service')" @mouseleave="stopAnim('service')">
      <div class="icon-wrap" ref="serviceIcon">
        <el-icon v-show="!animsLoaded.service"><Headset /></el-icon>
      </div>
      <div class="label">AI客服</div>
    </button>
    <button class="item" type="button" @click="go('/feedback')" @mouseenter="playAnim('feedback')" @mouseleave="stopAnim('feedback')">
      <div class="icon-wrap" ref="feedbackIcon">
        <el-icon v-show="!animsLoaded.feedback"><EditPen /></el-icon>
      </div>
      <div class="label">反馈</div>
    </button>
    <el-popover placement="left" :width="350" trigger="click" popper-class="favorite-popover">
      <template #reference>
        <button class="item" type="button" @mouseenter="playAnim('favorite')" @mouseleave="stopAnim('favorite')">
          <div class="icon-wrap" ref="favoriteIcon">
            <el-icon v-show="!animsLoaded.favorite"><Star /></el-icon>
          </div>
          <div class="label">收藏</div>
        </button>
      </template>
      <div class="favorite-popover-content">
        <el-tabs v-model="favoriteTab">
          <el-tab-pane label="收藏的商家" name="merchant">
            <div class="favorite-list-mini">
              <el-empty v-if="!merchantFavorites.length" description="暂无收藏" image-size="60" />
              <div v-else v-for="item in merchantFavorites" :key="item.id" class="favorite-item-mini" @click="goToMerchant(item.targetId)">
                <img :src="normalizeAvatar(item.avatar || '')" class="fav-img" />
                <div class="fav-info">
                  <div class="fav-name">{{ item.name || '未知商家' }}</div>
                </div>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="收藏的商品" name="product">
            <div class="favorite-list-mini">
              <el-empty v-if="!productFavorites.length" description="暂无收藏" image-size="60" />
              <div v-else v-for="item in productFavorites" :key="item.id" class="favorite-item-mini" @click="goToProduct(item.targetId)">
                <img :src="normalizeAvatar(item.pic || '')" class="fav-img" />
                <div class="fav-info">
                  <div class="fav-name">{{ item.title || '未知商品' }}</div>
                  <div class="fav-price" v-if="item.price">¥{{ item.price }}</div>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-popover>
  </aside>
</template>

<script setup lang="ts" name="RightSidebar">
import { useRouter } from 'vue-router'
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { unreadCount } from '@/utils/notice'
import request from '@/utils/request'
import { formatMoney, pickGoodsPriceValue } from '@/utils/goods'
import { cartList } from '@/api/cart'
import lottie from 'lottie-web'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

// Custom renderer to open links in new tab
const defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, _env, self) {
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  if (!token) return defaultRender(tokens, idx, options, env, self);
  const aIndex = token.attrIndex('target');
  if (aIndex < 0) {
    token.attrPush(['target', '_blank']);
  } else if (token.attrs?.[aIndex]) {
    token.attrs[aIndex][1] = '_blank';
  }
  return defaultRender(tokens, idx, options, env, self);
};

const router = useRouter()
const go = (path: string) => router.push(path)
const badgeCount = ref<number>(0)
const cartCount = ref<number>(0)
const cartCountLoading = ref(false)

// Lottie refs
const messagesIcon = ref<HTMLElement>()
const cartIcon = ref<HTMLElement>()
const ordersIcon = ref<HTMLElement>()
const profileIcon = ref<HTMLElement>()
const serviceIcon = ref<HTMLElement>()
const feedbackIcon = ref<HTMLElement>()
const favoriteIcon = ref<HTMLElement>()

const anims: Record<string, any> = {}
const animsLoaded = ref<Record<string, boolean>>({})

// Favorite logic
const favoriteTab = ref('merchant')
const merchantFavorites = ref<any[]>([])
const productFavorites = ref<any[]>([])

const getUid = () => {
  try {
    const raw = sessionStorage.getItem('user_user')
    const u = raw ? JSON.parse(raw) : null
    return u?.id ?? u?.userId ?? u?.uid ?? null
  } catch { return null }
}

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

const fetchFavorites = async () => {
  const uid = getUid()
  if (!uid) return;
  try {
    const res: any = await request.get("favorite/getStar", {
      params: { userId: uid }
    });
    
    if (res?.code === 200 || res?.success === true) {
      const list = res.data || [];
      const merchants = list.filter((i: any) => i.targetType === 0);
      const products = list.filter((i: any) => i.targetType === 1);
      
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

      const productPromises = products.map(async (item: any) => {
        try {
          const gRes: any = await request.get(`goods/good/${item.targetId}`);
          const gData = (gRes?.code === 200 || gRes?.success === true) ? gRes.data : {};
          let pic = '';
          if (gData.pic) {
             const pics = Array.isArray(gData.pic) ? gData.pic : String(gData.pic).split(',');
             pic = pics[0];
          }
          const pv = pickGoodsPriceValue(gData);
          return {
            ...item,
            title: gData.title,
            price: pv != null ? formatMoney(pv) : '',
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

const goToMerchant = (id: number) => {
  if (id) router.push(`/merchant/${id}`);
};

const goToProduct = (id: number) => {
  router.push(`/product/${id}`);
};

const refreshBadge = () => {
  const uid = getUid()
  if (uid != null) badgeCount.value = unreadCount('user', uid)
}
const onNew = () => refreshBadge()

const refreshCartCount = async () => {
  const uid = getUid()
  if (!uid || cartCountLoading.value) return
  cartCountLoading.value = true
  try {
    const res: any = await cartList()
    const ok = res?.code === 200 || res?.success === true
    const data = ok ? res?.data : null
    const list = Array.isArray(data) ? data : Array.isArray(data?.list) ? data.list : Array.isArray(data?.items) ? data.items : []
    const count = list.reduce((sum: number, it: any) => {
      const q = Number(it?.quantity ?? it?.count ?? it?.num ?? 1) || 1
      return sum + Math.max(1, q)
    }, 0)
    cartCount.value = Math.max(0, count)
  } catch {}
  cartCountLoading.value = false
}

const onCartChanged = () => refreshCartCount()

const initLottie = (key: string, el: HTMLElement, path: string) => {
  if (!el) return
  if (anims[key]) {
    anims[key].destroy()
  }
  try {
    const anim = lottie.loadAnimation({
      container: el,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      path: path
    })
    
    // 监听加载成功事件
    anim.addEventListener('DOMLoaded', () => {
      animsLoaded.value[key] = true
    })
    
    // 监听错误事件（虽然 lottie-web 的错误处理比较有限，但值得加上）
    anim.addEventListener('data_failed', () => {
      animsLoaded.value[key] = false
    })
    
    anims[key] = anim
  } catch (e) {
    console.warn(`Lottie init failed for ${key}`, e)
    animsLoaded.value[key] = false
  }
}

const playAnim = (key: string) => {
  if (anims[key]) {
    anims[key].stop()
    anims[key].play()
  }
  // 如果是收藏，hover时也刷新一下数据
  if (key === 'favorite') {
    fetchFavorites()
  }
}

const stopAnim = (_key: string) => {
  // Optional: anims[key]?.stop()
}

onMounted(() => {
  refreshBadge()
  refreshCartCount()
  fetchFavorites()
  window.addEventListener('notice:new', onNew as any)
  window.addEventListener('notice:readall', onNew as any)
  window.addEventListener('notice:read', onNew as any)
  window.addEventListener('cart:changed', onCartChanged as any)

  nextTick(() => {
    // 使用 Lottie 官方或一些免费的 JSON 资源
    // 这里使用一些示例 JSON URL，实际项目中建议下载到本地 assets
    // 消息 (Bell)
    initLottie('messages', messagesIcon.value!, 'https://assets10.lottiefiles.com/packages/lf20_dvba73.json')
    // 购物车
    initLottie('cart', cartIcon.value!, 'https://assets9.lottiefiles.com/packages/lf20_3b15j9.json')
    // 订单
    initLottie('orders', ordersIcon.value!, 'https://assets2.lottiefiles.com/packages/lf20_yt7v8f.json')
    // 我的 (User)
    initLottie('profile', profileIcon.value!, 'https://assets2.lottiefiles.com/packages/lf20_lyp6w8.json')
    // 客服 (Headset)
    initLottie('service', serviceIcon.value!, 'https://assets2.lottiefiles.com/packages/lf20_in4cuf.json')
    // 反馈 (Edit)
    initLottie('feedback', feedbackIcon.value!, 'https://assets5.lottiefiles.com/packages/lf20_7s279k.json')
    // 收藏 (Star)
    initLottie('favorite', favoriteIcon.value!, 'https://assets4.lottiefiles.com/packages/lf20_n2m0is.json')
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('notice:new', onNew as any)
  window.removeEventListener('notice:readall', onNew as any)
  window.removeEventListener('notice:read', onNew as any)
  window.removeEventListener('cart:changed', onCartChanged as any)
  Object.values(anims).forEach(anim => anim.destroy())
})
</script>

<style scoped>
.right-sidebar {
  position: fixed;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 16px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.08);
  padding: 8px 4px;
  z-index: 1000;
}
.item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  margin: 4px 0;
  color: #303133;
  background: transparent;
  border: none;
  width: 100%;
  cursor: pointer;
  padding: 8px 0;
  border-radius: 12px;
  transition: all 0.2s ease;
  outline: none;
  position: relative;
}
.icon-wrap {
  position: relative;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.badge {
  position: absolute;
  right: 4px;
  top: 4px;
  background: var(--jd-red);
  color: #fff;
  font-size: 10px;
  padding: 0 5px;
  height: 16px;
  line-height: 16px;
  border-radius: 8px;
  transform: scale(0.8);
}
.label {
  font-size: 10px;
  margin-top: 2px;
  color: #606266;
  text-align: center;
  transform: scale(0.9);
}
.item:hover .label {
  color: var(--jd-red);
}
.item:hover {
  background: #fff2f0;
}

/* Popover styles */
.favorite-list-mini {
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.favorite-item-mini {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}
.favorite-item-mini:hover {
  background: #f5f7fa;
}
.fav-img {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid #eee;
}
.fav-info {
  flex: 1;
  overflow: hidden;
}
.fav-name {
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fav-price {
  font-size: 12px;
  color: #f56c6c;
  margin-top: 2px;
}
</style>
