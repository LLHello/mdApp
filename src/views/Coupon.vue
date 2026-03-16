<template>
  <div class="coupon-page">
    <Header />
    <div class="main-content">
      <div class="container">
        <h2 class="page-title">领券中心</h2>

        <el-tabs v-model="activeTab" class="coupon-tabs">
          <!-- ===== 领券中心 ===== -->
          <el-tab-pane label="领券中心" name="center">
            <div v-loading="loading" class="coupon-list">
              <el-empty v-if="!loading && coupons.length === 0" description="暂无优惠券" />
              <div v-for="coupon in coupons" :key="coupon.id" class="coupon-card">
                <div class="coupon-left">
                  <div class="amount">
                    <span class="symbol">¥</span>
                    <span class="value">{{ coupon.discountAmount }}</span>
                  </div>
                  <div class="condition">满 {{ coupon.thresholdAmount }} 元可用</div>
                </div>
                <div class="coupon-right">
                  <div class="info">
                    <h3 class="name">{{ coupon.name }}</h3>
                    <p class="sub-tag" v-if="coupon.goodsId">限定商品专属</p>
                    <p class="time">{{ formatDate(coupon.startTime) }} - {{ formatDate(coupon.endTime) }}</p>
                    <div class="progress-bar">
                      <el-progress
                        :percentage="calculateProgress(coupon)"
                        :format="progressFormat"
                        :status="coupon.availableStock === 0 ? 'exception' : ''"
                      />
                    </div>
                  </div>
                  <div class="action">
                    <el-button
                      type="danger"
                      round
                      :disabled="isExpired(coupon) || isSoldOut(coupon)"
                      @click="handleSeckill(coupon)"
                    >
                      {{ getButtonText(coupon) }}
                    </el-button>
                  </div>
                </div>
                <div class="circle top"></div>
                <div class="circle bottom"></div>
              </div>
            </div>
          </el-tab-pane>

          <!-- ===== 我的优惠券 ===== -->
          <el-tab-pane label="我的优惠券" name="my">
            <div v-loading="myLoading" class="coupon-list">
              <el-empty v-if="!myLoading && myCouponList.length === 0" description="暂无可用优惠券" />
              <div v-for="coupon in myCouponList" :key="coupon.claimId" class="coupon-card">
                <div class="coupon-left my-left">
                  <div class="amount">
                    <span class="symbol">¥</span>
                    <span class="value">{{ coupon.discountAmount }}</span>
                  </div>
                  <div class="condition">满 {{ coupon.thresholdAmount }} 元可用</div>
                </div>
                <div class="coupon-right">
                  <div class="info">
                    <h3 class="name">{{ coupon.name }}</h3>
                    <p class="sub-tag goods-tag" v-if="coupon.goodsId">限定商品专属</p>
                    <p class="time">有效期至 {{ formatDate(coupon.endTime) }}</p>
                    <el-tag type="success" size="small">未使用</el-tag>
                  </div>
                  <div class="action">
                    <el-button type="primary" round @click="goShopping">去使用</el-button>
                  </div>
                </div>
                <div class="circle top"></div>
                <div class="circle bottom"></div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import { couponList, couponSeckill, myCoupons, type Coupon } from '@/api/coupon'
import { ElMessage } from 'element-plus'

const router = useRouter()
const activeTab = ref('center')

// ---- 领券中心 ----
const loading = ref(false)
const coupons = ref<Coupon[]>([])

const fetchCoupons = async () => {
  loading.value = true
  try {
    const res: any = await couponList()
    const ok = res?.code === 200 || res?.success === true
    if (ok) {
      coupons.value = res.data || []
    } else {
      ElMessage.error(res?.msg || '获取优惠券列表失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '网络错误')
  } finally {
    loading.value = false
  }
}

const handleSeckill = async (coupon: Coupon) => {
  if (!coupon.id) return
  try {
    const res: any = await couponSeckill(coupon.id)
    const ok = res?.code === 200 || res?.success === true
    if (ok) {
      ElMessage.success('领取成功！可在「我的优惠券」中查看')
      fetchCoupons()
    } else {
      ElMessage.error(res?.msg || '领取失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '领取失败')
  }
}

// ---- 我的优惠券 ----
const myLoading = ref(false)
const myCouponList = ref<Coupon[]>([])

const fetchMyCoupons = async () => {
  myLoading.value = true
  try {
    const res: any = await myCoupons()
    const ok = res?.code === 200 || res?.success === true
    if (ok) {
      myCouponList.value = (res.data || []).map((c: any) => ({
        ...c,
        claimId: c.claimId ?? c.id,
      }))
    } else {
      ElMessage.error(res?.msg || '获取我的优惠券失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '网络错误')
  } finally {
    myLoading.value = false
  }
}

watch(activeTab, (val) => {
  if (val === 'my') fetchMyCoupons()
})

const goShopping = () => router.push('/')

// ---- helpers ----
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`
}

const calculateProgress = (coupon: Coupon) => {
  const total = coupon.totalStock
  if (!total || total <= 0) return 100
  const available = coupon.availableStock ?? 0
  const used = total - available
  return Math.floor((used / total) * 100)
}

const progressFormat = (percentage: number) => `已抢${percentage}%`

const isExpired = (coupon: Coupon) => {
  if (!coupon.endTime) return false
  return new Date(coupon.endTime).getTime() < Date.now()
}

const isSoldOut = (coupon: Coupon) => coupon.availableStock === 0

const getButtonText = (coupon: Coupon) => {
  if (isExpired(coupon)) return '已过期'
  if (isSoldOut(coupon)) return '已抢光'
  return '立即领取'
}

onMounted(() => {
  fetchCoupons()
})
</script>

<style scoped>
.coupon-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f4f4f4;
}

.main-content {
  flex: 1;
  padding: 20px 0;
}

.container {
  width: 1200px;
  margin: 0 auto;
}

.page-title {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
  font-size: 28px;
  font-weight: bold;
}

.coupon-tabs {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.coupon-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  padding-top: 16px;
}

.coupon-card {
  display: flex;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  height: 130px;
  position: relative;
  transition: transform 0.2s;
  border: 1px solid #f0f0f0;
}

.coupon-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.coupon-left {
  width: 140px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #fff;
  position: relative;
  border-right: 2px dashed rgba(244, 244, 244, 0.8);
  flex-shrink: 0;
}

.my-left {
  background: linear-gradient(135deg, #43b89c 0%, #5ed4b8 100%);
}

.amount {
  font-size: 32px;
  font-weight: bold;
  line-height: 1;
}

.symbol {
  font-size: 18px;
  margin-right: 2px;
  vertical-align: top;
  line-height: 2;
}

.condition {
  font-size: 12px;
  margin-top: 6px;
  opacity: 0.9;
}

.coupon-right {
  flex: 1;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-width: 0;
}

.name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub-tag {
  font-size: 11px;
  color: #ff6b6b;
  margin: 0;
  background: #fff0f0;
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  width: fit-content;
}

.goods-tag {
  color: #43b89c;
  background: #f0faf7;
}

.time {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.progress-bar {
  width: 160px;
}

.action {
  margin-left: 16px;
  flex-shrink: 0;
}

.circle {
  position: absolute;
  width: 20px;
  height: 20px;
  background-color: #f4f4f4;
  border-radius: 50%;
  left: 130px;
  z-index: 10;
}

.top {
  top: -10px;
}

.bottom {
  bottom: -10px;
}
</style>
