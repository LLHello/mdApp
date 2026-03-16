<template>
  <div class="page">
    <div class="page-header">
      <div class="left">
        <el-button text type="primary" @click="goBack">返回</el-button>
        <h2 class="page-title">订单详情</h2>
      </div>
      <div class="actions">
        <el-button
          v-if="order && canPay"
          type="danger"
          :loading="paying"
          :disabled="loading"
          @click="onPay"
        >
          支付
        </el-button>
        <el-button
          v-if="order && canPay"
          type="info"
          plain
          :loading="cancelling"
          :disabled="loading"
          @click="onCancel"
        >
          取消订单
        </el-button>
        <el-button
          v-if="order && canRefund"
          type="warning"
          :loading="refunding"
          :disabled="loading"
          @click="onRefund"
        >
          退款
        </el-button>
        <el-button text type="primary" :disabled="loading || paying || refunding" @click="refresh">刷新</el-button>
      </div>
    </div>

    <el-card v-loading="loading">
      <el-empty v-if="!loading && !order" description="订单不存在或已删除" />
      <div v-else-if="order" class="detail">
        <div class="info-grid">
          <div class="info-item">
            <div class="label">订单号</div>
            <div class="value mono">{{ order.orderNo || `#${order.id}` }}</div>
          </div>
          <div class="info-item">
            <div class="label">状态</div>
            <div class="value">
              <el-tag :type="statusTagType(order.statusText)">{{ order.statusText }}</el-tag>
            </div>
          </div>
          <div class="info-item">
            <div class="label">商品总额</div>
            <div class="value">
              <span v-if="order.totalAmount != null">¥{{ formatMoney(order.totalAmount) }}</span>
              <span v-else>--</span>
            </div>
          </div>
          <div class="info-item" v-if="order.discountAmount && Number(order.discountAmount) > 0">
            <div class="label">优惠金额</div>
            <div class="value discount">-¥{{ formatMoney(order.discountAmount) }}</div>
          </div>
          <div class="info-item">
            <div class="label">实付金额</div>
            <div class="value pay-amount">
              <span v-if="order.payAmount != null">¥{{ formatMoney(order.payAmount) }}</span>
              <span v-else>--</span>
            </div>
          </div>
          <div class="info-item">
            <div class="label">下单时间</div>
            <div class="value">{{ order.createTimeText }}</div>
          </div>
        </div>

        <!-- 优惠券选择区域（仅待支付订单显示） -->
        <div v-if="canPay" class="coupon-section">
          <el-divider content-position="left">优惠券</el-divider>
          <div v-if="loadingCoupons" class="coupon-loading"><el-text type="info">加载中...</el-text></div>
          <div v-else-if="availableCoupons.length === 0" class="coupon-empty">
            <el-text type="info">暂无可用优惠券</el-text>
          </div>
          <div v-else class="coupon-picker">
            <el-radio-group v-model="selectedClaimId" @change="onCouponChange">
              <el-radio :value="null" class="coupon-radio">不使用优惠券</el-radio>
              <el-radio
                v-for="c in availableCoupons"
                :key="c.claimId"
                :value="c.claimId"
                class="coupon-radio"
              >
                <span class="coupon-radio-label">
                  <span class="c-amount">¥{{ c.discountAmount }} 减免</span>
                  <span class="c-cond">满{{ c.thresholdAmount }}可用</span>
                  <span class="c-name">{{ c.name }}</span>
                </span>
              </el-radio>
            </el-radio-group>
            <div class="coupon-preview" v-if="selectedClaimId">
              使用优惠后实付：<span class="preview-amount">¥{{ formatMoney(previewPayAmount) }}</span>
            </div>
          </div>
        </div>

        <el-divider content-position="left">商品明细</el-divider>

        <el-empty v-if="!items.length" description="暂无商品明细" />
        <el-table v-else :data="items" style="width: 100%">
          <el-table-column label="商品" min-width="320">
            <template #default="{ row }">
              <div class="goods-cell">
                <img class="goods-img" :src="row.pic || '/vite.svg'" alt="商品图片" />
                <div class="goods-info">
                  <div class="goods-title">{{ row.title || '商品' }}</div>
                  <div class="goods-sku" v-if="row.skuLabel">{{ row.skuLabel }}</div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="单价" width="120">
            <template #default="{ row }">
              <span v-if="row.priceValue != null">¥{{ formatMoney(row.priceValue) }}</span>
              <span v-else>--</span>
            </template>
          </el-table-column>
          <el-table-column label="数量" width="100">
            <template #default="{ row }">{{ row.quantity }}</template>
          </el-table-column>
          <el-table-column label="小计" width="140">
            <template #default="{ row }">
              <span v-if="row.priceValue != null">¥{{ formatMoney(row.priceValue * row.quantity) }}</span>
              <span v-else>--</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts" name="OrderDetail">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import request from "@/utils/request";
import { formatMoney, parseSkuAttrs, skuAttrsToLabel } from "@/utils/goods";
import { orderDetail, orderPay, orderRefund, orderCancel } from "@/api/order";
import { myCoupons, type Coupon } from "@/api/coupon";

type OrderInfo = {
  id: number;
  orderNo: string;
  statusText: string;
  totalAmount: number | null;
  payAmount: number | null;
  discountAmount: number | null;
  couponClaimId: number | null;
  createTimeText: string;
  raw: any;
};

type OrderItemRow = {
  id: number | null;
  title: string;
  pic: string;
  skuLabel: string;
  priceValue: number | null;
  quantity: number;
  raw: any;
};

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const paying = ref(false);
const cancelling = ref(false);
const refunding = ref(false);
const order = ref<OrderInfo | null>(null);
const items = ref<OrderItemRow[]>([]);

// ---- Coupon selection ----
const availableCoupons = ref<Coupon[]>([]);
const loadingCoupons = ref(false);
const selectedClaimId = ref<number | null>(null);

const fetchAvailableCoupons = async () => {
  loadingCoupons.value = true;
  try {
    const res: any = await myCoupons();
    const ok = res?.code === 200 || res?.success === true;
    if (ok) {
      const all: Coupon[] = (res.data || []).map((c: any) => ({
        ...c,
        claimId: c.claimId ?? c.id,
      }));
      // 只展示与订单商品相关的优惠券：
      //   全场券（goodsId == null）始终可用
      //   专属商品券（goodsId != null）仅当订单中包含该商品时展示
      const orderGoodsIds = new Set(
        items.value.map((it) => toNumber(it.raw?.goodsId ?? it.raw?.goods_id)).filter((id) => id != null)
      );
      availableCoupons.value = all.filter(
        (c) => c.goodsId == null || orderGoodsIds.has(c.goodsId as number)
      );
    }
  } catch {}
  finally {
    loadingCoupons.value = false;
  }
};

const onCouponChange = () => {}; // reactive preview updates automatically

const selectedCoupon = computed(() =>
  availableCoupons.value.find((c) => c.claimId === selectedClaimId.value) ?? null
);

const previewPayAmount = computed(() => {
  const total = order.value?.totalAmount ?? 0;
  if (!selectedCoupon.value) return total;
  const threshold = Number(selectedCoupon.value.thresholdAmount ?? 0);
  if (total < threshold) return total;
  const discount = Number(selectedCoupon.value.discountAmount ?? 0);
  return Math.max(0, total - discount);
});

// ---- helpers ----
const toNumber = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const formatTime = (v: any) => {
  if (!v) return "--";
  const t = new Date(v).getTime();
  if (!Number.isFinite(t) || t <= 0) return String(v);
  return new Date(t).toLocaleString();
};

const statusToText = (v: any) => {
  if (v == null || v === "") return "未知";
  if (typeof v === "string") return v;
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (n === 0) return "待支付";
  if (n === 1) return "已支付";
  if (n === 2) return "已退款";
  if (n === 3) return "已取消";
  return String(v);
};

const baseURL = request?.defaults?.baseURL || "";
const normalizePic = (p: any) => {
  if (!p) return "";
  let s = String(p).trim().replace(/\\\\/g, "/");
  if (s.startsWith("http") || s.startsWith("data:")) return s;
  const uploadIdx = s.toLowerCase().lastIndexOf("/upload/");
  if (uploadIdx >= 0) s = s.slice(uploadIdx);
  const b = baseURL?.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
  s = s.startsWith("/") ? s : "/" + s;
  const url = b + s;
  return url.replace(/([^:])\/{2,}/g, "$1/");
};

const normalizeOrder = (it: any): OrderInfo | null => {
  const id = toNumber(it?.id ?? it?.orderId ?? it?.order_id) ?? null;
  if (id == null) return null;
  const orderNo = String(it?.orderNo ?? it?.no ?? it?.sn ?? it?.orderSn ?? it?.order_sn ?? "").trim();
  const totalAmount =
    toNumber(it?.totalAmount ?? it?.total_amount) ??
    toNumber(it?.amount ?? it?.payAmount ?? it?.pay_amount) ??
    null;
  const payAmount = toNumber(it?.payAmount ?? it?.pay_amount) ?? totalAmount;
  const discountAmount = toNumber(it?.discountAmount ?? it?.discount_amount) ?? 0;
  const couponClaimId = toNumber(it?.couponClaimId ?? it?.coupon_claim_id) ?? null;
  const statusText = statusToText(it?.status ?? it?.state ?? it?.orderStatus ?? it?.order_status);
  const createTimeText = formatTime(it?.createTime ?? it?.create_time ?? it?.time ?? it?.createdAt);
  return { id: Number(id), orderNo, statusText, totalAmount, payAmount, discountAmount, couponClaimId, createTimeText, raw: it };
};

const canPay = computed(() => {
  const o = order.value;
  if (!o) return false;
  const rawStatus = o.raw?.status ?? o.raw?.state ?? null;
  const n = Number(rawStatus);
  if (Number.isFinite(n)) return n === 0;
  return String(o.statusText || "").includes("待支付");
});

const canRefund = computed(() => {
  const o = order.value;
  if (!o) return false;
  const rawStatus = o.raw?.status ?? o.raw?.state ?? null;
  const n = Number(rawStatus);
  if (Number.isFinite(n)) return n === 1;
  return String(o.statusText || "").includes("已支付");
});

const normalizeItem = (it: any): OrderItemRow | null => {
  const quantity = Math.max(1, Number(it?.quantity ?? it?.count ?? it?.num ?? 1) || 1);
  const priceValue =
    toNumber(it?.price) ??
    toNumber(it?.skuPrice ?? it?.sku_price) ??
    toNumber(it?.unitPrice ?? it?.unit_price) ??
    toNumber(it?.priceValue ?? it?.price_value) ??
    null;
  const title = String(it?.title ?? it?.goodsTitle ?? it?.productTitle ?? it?.name ?? "").trim();
  const skuAttrs = parseSkuAttrs(it?.skuAttrs ?? it?.sku_attrs ?? it?.attrs);
  const skuLabel = String(it?.skuLabel ?? it?.skuName ?? it?.specs ?? skuAttrsToLabel(skuAttrs) ?? "").trim();
  const picRaw = it?.pic ?? it?.img ?? it?.image ?? it?.cover ?? it?.goodsPic ?? "";
  const pic = normalizePic(picRaw);
  const id = toNumber(it?.id ?? it?.itemId ?? it?.orderItemId);
  return { id: id != null ? Number(id) : null, title, pic, skuLabel, priceValue, quantity, raw: it };
};

const pickDetailPayload = (data: any) => {
  if (!data) return { order: null, items: [] as any[] };
  if (Array.isArray(data?.items) || Array.isArray(data?.orderItems)) {
    return { order: data?.order ?? data, items: data?.items ?? data?.orderItems };
  }
  if (Array.isArray(data?.detailItems) || Array.isArray(data?.details)) {
    return { order: data?.order ?? data, items: data?.detailItems ?? data?.details };
  }
  if (data?.order && Array.isArray(data?.order?.items)) {
    return { order: data.order, items: data.order.items };
  }
  return { order: data, items: [] as any[] };
};

const refresh = async () => {
  const id = Number(route.params.id);
  if (!Number.isFinite(id)) { order.value = null; items.value = []; return; }
  if (loading.value) return;
  loading.value = true;
  try {
    const res: any = await orderDetail(id);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error(res?.msg || "获取订单详情失败");
      order.value = null; items.value = [];
      return;
    }
    const payload = pickDetailPayload(res?.data ?? res);
    order.value = normalizeOrder(payload.order);
    items.value = (payload.items || []).map(normalizeItem).filter((x: any): x is OrderItemRow => x != null);
    // Load available coupons when order is in pending-pay state
    if (canPay.value) fetchAvailableCoupons();
  } catch (e: any) {
    ElMessage.error(e?.message || "获取订单详情失败");
    order.value = null; items.value = [];
  } finally {
    loading.value = false;
  }
};

const onPay = async () => {
  if (!order.value || paying.value) return;

  // Validate coupon threshold if one is selected
  if (selectedClaimId.value && selectedCoupon.value) {
    const threshold = Number(selectedCoupon.value.thresholdAmount ?? 0);
    const total = order.value.totalAmount ?? 0;
    if (total < threshold) {
      ElMessage.warning(`订单金额 ¥${formatMoney(total)} 未满优惠券使用门槛 ¥${formatMoney(threshold)}`);
      return;
    }
  }

  const couponDesc = selectedCoupon.value
    ? `\n使用优惠券「${selectedCoupon.value.name}」，优惠 ¥${formatMoney(Number(selectedCoupon.value.discountAmount))}\n实付：¥${formatMoney(previewPayAmount.value)}`
    : `\n实付：¥${formatMoney(order.value.totalAmount ?? 0)}`;

  try {
    await ElMessageBox.confirm(`确认支付该订单吗？${couponDesc}`, "支付", {
      confirmButtonText: "确认支付",
      cancelButtonText: "取消",
      type: "warning",
      dangerouslyUseHTMLString: false,
    });
  } catch { return; }

  paying.value = true;
  try {
    // Pass coupon claim id when paying - backend applies it during createFromCart,
    // but for existing orders the coupon was already locked at creation.
    // Here we just trigger the pay endpoint which uses the stored couponClaimId on the order.
    const res: any = await import("@/api/order").then(m => m.orderPay(order.value!.id));
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) { ElMessage.error(res?.msg || "支付失败"); return; }
    ElMessage.success("支付成功");
    await refresh();
  } catch (e: any) {
    ElMessage.error(e?.message || "支付失败");
  } finally {
    paying.value = false;
  }
};

const onRefund = async () => {
  if (!order.value || refunding.value) return;
  try {
    await ElMessageBox.confirm("确认申请退款吗？优惠券将同步退回。", "退款", {
      confirmButtonText: "确认退款", cancelButtonText: "取消", type: "warning",
    });
  } catch { return; }
  refunding.value = true;
  try {
    const res: any = await import("@/api/order").then(m => m.orderRefund(order.value!.id));
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) { ElMessage.error(res?.msg || "退款申请失败"); return; }
    ElMessage.success("退款成功，优惠券已退回");
    await refresh();
  } catch (e: any) {
    ElMessage.error(e?.message || "退款申请失败");
  } finally {
    refunding.value = false;
  }
};

const onCancel = async () => {
  if (!order.value || cancelling.value) return;
  try {
    await ElMessageBox.confirm("确认取消该订单吗？", "取消订单", {
      confirmButtonText: "确认取消", cancelButtonText: "再想想", type: "warning",
    });
  } catch { return; }
  cancelling.value = true;
  try {
    const res: any = await import("@/api/order").then(m => m.orderCancel(order.value!.id));
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) { ElMessage.error(res?.msg || "取消订单失败"); return; }
    ElMessage.success("订单已取消");
    await refresh();
  } catch (e: any) {
    ElMessage.error(e?.message || "取消订单失败");
  } finally {
    cancelling.value = false;
  }
};

const statusTagType = (text: string) => {
  const t = String(text || "");
  if (t.includes("退款")) return "info";
  if (t.includes("已支付")) return "success";
  if (t.includes("待")) return "warning";
  if (t.includes("取消")) return "info";
  return "primary";
};

const goBack = () => router.back();

onMounted(refresh);
watch(() => route.params.id, refresh);
</script>

<style scoped>
.page {
  padding: 16px 24px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-title {
  margin: 0;
}
.detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.info-item {
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 10px 12px;
}
.label {
  color: #909399;
  font-size: 12px;
  margin-bottom: 6px;
}
.value {
  color: #303133;
  font-weight: 600;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 500;
}
.discount {
  color: #67c23a;
}
.pay-amount {
  color: #e1251b;
  font-size: 16px;
}
.coupon-section {
  margin-top: 4px;
}
.coupon-loading,
.coupon-empty {
  padding: 8px 0;
}
.coupon-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.coupon-radio {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}
.coupon-radio-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.c-amount {
  font-weight: 700;
  color: #e1251b;
  font-size: 14px;
}
.c-cond {
  font-size: 12px;
  color: #909399;
}
.c-name {
  font-size: 12px;
  color: #606266;
  background: #f5f7fa;
  padding: 1px 6px;
  border-radius: 3px;
}
.coupon-preview {
  margin-top: 4px;
  font-size: 13px;
  color: #606266;
}
.preview-amount {
  color: #e1251b;
  font-weight: 700;
  font-size: 16px;
}
.goods-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.goods-img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #ebeef5;
  background: #f5f7fa;
}
.goods-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.goods-title {
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.goods-sku {
  color: #909399;
  font-size: 12px;
}
@media (max-width: 1100px) {
  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

  const b = baseURL?.endsWith("/") ? baseURL.slice(0, 