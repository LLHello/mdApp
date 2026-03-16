<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">购物车</h2>
      <el-button text type="primary" @click="goOrders">我的订单</el-button>
    </div>
    <el-card>
      <el-empty v-if="!loading && !rows.length" description="购物车为空，去选购吧">
        <el-button type="primary" @click="goHome">去逛逛</el-button>
      </el-empty>
      <div v-else>
        <el-table v-loading="loading" :data="rows" style="width: 100%">
          <el-table-column width="56">
            <template #default="{ row }">
              <el-checkbox
                :model-value="row.checked === 1"
                :disabled="row.updating"
                @change="(v: any) => onToggleChecked(row, !!v)"
              />
            </template>
          </el-table-column>
          <el-table-column label="商品" min-width="320">
            <template #default="{ row }">
              <div class="goods-cell">
                <img class="goods-img" :src="row.pic || '/vite.svg'" alt="商品图片" />
                <div class="goods-info">
                  <div class="goods-title" @click="goProduct(row)">
                    {{ row.title || "商品" }}
                  </div>
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
          <el-table-column label="数量" width="170">
            <template #default="{ row }">
              <el-input-number
                v-model="row.quantity"
                :min="1"
                :max="row.stock ?? 9999"
                :disabled="row.updating"
                @change="(v: any) => onChangeQuantity(row, v)"
              />
            </template>
          </el-table-column>
          <el-table-column label="小计" width="140">
            <template #default="{ row }">
              <span v-if="row.priceValue != null">¥{{ formatMoney(row.priceValue * row.quantity) }}</span>
              <span v-else>--</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <el-button type="danger" text :loading="row.removing" @click="onRemove(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="rows.length" class="footer-bar">
          <div class="footer-left">
            <el-checkbox :model-value="allChecked" :disabled="anyUpdating" @change="(v: any) => toggleAll(!!v)">
              全选
            </el-checkbox>
            <el-button text type="primary" :disabled="anyUpdating" @click="refresh">刷新</el-button>
          </div>
          <div class="footer-right">
            <!-- 优惠券选择 -->
            <div class="coupon-select" v-if="checkedCount > 0">
              <el-select
                v-model="selectedClaimId"
                placeholder="选择优惠券"
                clearable
                style="width: 220px"
                size="small"
                v-loading="couponLoading"
              >
                <el-option
                  v-for="c in applicableCoupons"
                  :key="c.claimId"
                  :value="c.claimId"
                  :label="`${c.name} 减¥${c.discountAmount}（满¥${c.thresholdAmount}）`"
                >
                  <div class="coupon-option">
                    <span class="coupon-name">{{ c.name }}</span>
                    <span class="coupon-discount">-¥{{ c.discountAmount }}</span>
                  </div>
                  <div class="coupon-cond">满¥{{ c.thresholdAmount }} 可用{{ c.goodsId ? ' · 指定商品' : '' }}</div>
                </el-option>
                <template #empty>
                  <div style="padding:8px 12px;color:#999;font-size:13px">暂无可用优惠券</div>
                </template>
              </el-select>
              <span v-if="discountAmount > 0" class="discount-hint">已优惠 ¥{{ formatMoney(discountAmount) }}</span>
            </div>
            <div class="summary">
              <span>已选 {{ checkedCount }} 件</span>
              <span v-if="discountAmount > 0" class="total-origin">原价：¥{{ totalAmountText }}</span>
              <span class="total">实付：¥{{ discountAmount > 0 ? payAmountText : totalAmountText }}</span>
            </div>
            <el-button
              type="danger"
              :disabled="checkedCount === 0 || anyUpdating"
              :loading="creatingOrder"
              @click="createOrder"
            >
              创建订单
            </el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts" name="Cart">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import request from "@/utils/request";
import { formatMoney, parseSkuAttrs, skuAttrsToLabel } from "@/utils/goods";
import { cartList, cartRemove, cartUpdateChecked, cartUpdateQuantity } from "@/api/cart";
import { orderCreateFromCart } from "@/api/order";
import { myCoupons, type Coupon as CouponType } from "@/api/coupon";
import { dispatchCartChanged } from "@/utils/cartEvents";

type CartRow = {
  id: number;
  goodsId: number | null;
  skuId: number | null;
  title: string;
  pic: string;
  skuLabel: string;
  priceValue: number | null;
  stock: number | null;
  quantity: number;
  checked: 0 | 1;
  updating: boolean;
  removing: boolean;
  raw: any;
};

const router = useRouter();

const loading = ref(false);
const rows = ref<CartRow[]>([]);
const creatingOrder = ref(false);

// ---- 优惠券 ----
const couponList = ref<CouponType[]>([]);
const selectedClaimId = ref<number | null>(null);
const couponLoading = ref(false);

const applicableCoupons = computed(() => {
  const checkedGoodsIds = new Set(checkedRows.value.map((r) => r.goodsId).filter((id) => id != null));
  return couponList.value.filter((c) => {
    // 全场券或购物车包含该专属商品
    return c.goodsId == null || checkedGoodsIds.has(c.goodsId as number);
  });
});

const selectedCoupon = computed(() =>
  applicableCoupons.value.find((c) => c.claimId === selectedClaimId.value) ?? null
);

const discountAmount = computed(() => {
  if (!selectedCoupon.value) return 0;
  const total = checkedRows.value.reduce(
    (sum, r) => sum + (r.priceValue || 0) * r.quantity, 0
  );
  const threshold = Number(selectedCoupon.value.thresholdAmount ?? 0);
  if (total < threshold) return 0;
  return Math.min(Number(selectedCoupon.value.discountAmount ?? 0), total);
});

const payAmountText = computed(() => {
  const list = checkedRows.value;
  if (!list.length) return '0.00';
  if (list.some((r) => r.priceValue == null)) return '--';
  const total = list.reduce((sum, r) => sum + (r.priceValue || 0) * r.quantity, 0);
  const pay = Math.max(0, total - discountAmount.value);
  return formatMoney(pay);
});

const fetchCoupons = async () => {
  couponLoading.value = true;
  try {
    const res: any = await myCoupons();
    const ok = res?.code === 200 || res?.success === true;
    if (ok) {
      couponList.value = res.data || [];
    }
  } catch {
    // ignore
  } finally {
    couponLoading.value = false;
  }
};

const toNumber = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const baseURL = request?.defaults?.baseURL || "";
const normalizePic = (p: any) => {
  if (!p) return "";
  let s = String(p).trim().replace(/\\/g, "/");
  if (s.startsWith("http") || s.startsWith("data:")) return s;
  const uploadIdx = s.toLowerCase().lastIndexOf("/upload/");
  if (uploadIdx >= 0) s = s.slice(uploadIdx);
  const b = baseURL?.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
  s = s.startsWith("/") ? s : "/" + s;
  const url = b + s;
  return url.replace(/([^:])\/{2,}/g, "$1/");
};

const normalizeRow = (it: any): CartRow | null => {
  const id = toNumber(it?.id ?? it?.cartItemId ?? it?.cart_item_id ?? it?.itemId) ?? null;
  if (id == null) return null;
  const quantity = Math.max(1, Number(it?.quantity ?? it?.count ?? it?.num ?? 1) || 1);
  const checkedRaw = it?.checked ?? it?.isChecked ?? it?.selected ?? 0;
  const checked = (Number(checkedRaw) ? 1 : 0) as 0 | 1;
  const priceValue =
    toNumber(it?.price) ??
    toNumber(it?.skuPrice ?? it?.sku_price) ??
    toNumber(it?.unitPrice ?? it?.unit_price) ??
    toNumber(it?.priceValue ?? it?.price_value) ??
    null;

  const goodsId = toNumber(it?.goodsId ?? it?.goodId ?? it?.productId ?? it?.gid) ?? null;
  const skuId = toNumber(it?.skuId ?? it?.sku_id) ?? null;
  const title = String(it?.title ?? it?.goodsTitle ?? it?.productTitle ?? it?.name ?? it?.skuTitle ?? "").trim();

  const stock = toNumber(it?.stock ?? it?.skuStock ?? it?.sku_stock);
  const skuAttrs = parseSkuAttrs(it?.skuAttrs ?? it?.sku_attrs ?? it?.attrs);
  const skuLabel = String(it?.skuLabel ?? it?.skuName ?? it?.specs ?? skuAttrsToLabel(skuAttrs) ?? "").trim();

  const picRaw =
    it?.pic ??
    it?.img ??
    it?.image ??
    it?.cover ??
    it?.goodsPic ??
    it?.goodsImg ??
    it?.productPic ??
    it?.productImg ??
    "";
  const pic = normalizePic(picRaw);

  return {
    id: Number(id),
    goodsId,
    skuId,
    title,
    pic,
    skuLabel,
    priceValue,
    stock: stock != null ? Number(stock) : null,
    quantity,
    checked,
    updating: false,
    removing: false,
    raw: it,
  };
};

const refresh = async () => {
  if (loading.value) return;
  loading.value = true;
  try {
    const res: any = await cartList();
    const ok = res?.code === 200 || res?.success === true;
    const data = ok ? res?.data : null;
    const list = Array.isArray(data) ? data : Array.isArray(data?.list) ? data.list : Array.isArray(data?.items) ? data.items : [];
    rows.value = list.map(normalizeRow).filter((x: any): x is CartRow => x != null);
  } catch (e: any) {
    ElMessage.error(e?.message || "获取购物车失败");
    rows.value = [];
  } finally {
    loading.value = false;
  }
};

const onChangeQuantity = async (row: CartRow, v: any) => {
  const quantity = Math.max(1, Number(v) || 1);
  const prev = row.quantity;
  row.quantity = quantity;
  row.updating = true;
  try {
    const res: any = await cartUpdateQuantity(row.id, quantity);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      row.quantity = prev;
      ElMessage.error(res?.msg || "修改数量失败");
      return;
    }
    dispatchCartChanged();
  } catch (e: any) {
    row.quantity = prev;
    ElMessage.error(e?.message || "修改数量失败");
  } finally {
    row.updating = false;
  }
};

const onToggleChecked = async (row: CartRow, v: boolean) => {
  const checked = (v ? 1 : 0) as 0 | 1;
  const prev = row.checked;
  row.checked = checked;
  row.updating = true;
  try {
    const res: any = await cartUpdateChecked(row.id, checked);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      row.checked = prev;
      ElMessage.error(res?.msg || "修改勾选失败");
      return;
    }
    dispatchCartChanged();
  } catch (e: any) {
    row.checked = prev;
    ElMessage.error(e?.message || "修改勾选失败");
  } finally {
    row.updating = false;
  }
};

const onRemove = async (row: CartRow) => {
  try {
    await ElMessageBox.confirm("确认删除该商品吗？", "提示", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }

  row.removing = true;
  try {
    const res: any = await cartRemove(row.id);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error(res?.msg || "删除失败");
      return;
    }
    rows.value = rows.value.filter((r) => r.id !== row.id);
    dispatchCartChanged();
    ElMessage.success("已删除");
  } catch (e: any) {
    ElMessage.error(e?.message || "删除失败");
  } finally {
    row.removing = false;
  }
};

const checkedRows = computed(() => rows.value.filter((r) => r.checked === 1));
const checkedCount = computed(() => checkedRows.value.length);
const allChecked = computed(() => rows.value.length > 0 && rows.value.every((r) => r.checked === 1));
const anyUpdating = computed(() => creatingOrder.value || rows.value.some((r) => r.updating || r.removing));
const totalAmountText = computed(() => {
  const list = checkedRows.value;
  if (!list.length) return "0.00";
  if (list.some((r) => r.priceValue == null)) return "--";
  const total = list.reduce((sum, r) => sum + (r.priceValue || 0) * r.quantity, 0);
  return formatMoney(total);
});

const toggleAll = async (v: boolean) => {
  const target = (v ? 1 : 0) as 0 | 1;
  const targets = rows.value.filter((r) => r.checked !== target);
  for (const r of targets) {
    await onToggleChecked(r, target === 1);
  }
};

const pickOrderId = (data: any): number | null => {
  const id =
    data?.id ??
    data?.orderId ??
    data?.order_id ??
    data?.order?.id ??
    data?.data?.id ??
    data?.data?.orderId ??
    null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
};

const createOrder = async () => {
  if (creatingOrder.value) return;
  // 验证所选优惠券门槛
  if (selectedCoupon.value) {
    const total = checkedRows.value.reduce(
      (sum, r) => sum + (r.priceValue || 0) * r.quantity, 0
    );
    const threshold = Number(selectedCoupon.value.thresholdAmount ?? 0);
    if (total < threshold) {
      ElMessage.warning(`该优惠券需满 ¥${threshold} 才可使用，当前合计 ¥${formatMoney(total)}`);
      return;
    }
  }
  creatingOrder.value = true;
  try {
    const res: any = await orderCreateFromCart(selectedClaimId.value);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error(res?.msg || '创建订单失败');
      return;
    }
    ElMessage.success('订单创建成功');
    dispatchCartChanged();
    selectedClaimId.value = null;
    const oid = pickOrderId(res?.data ?? res);
    if (oid != null) {
      router.push(`/orders/${oid}`);
    } else {
      router.push('/orders');
    }
    await refresh();
  } catch (e: any) {
    ElMessage.error(e?.message || '创建订单失败');
  } finally {
    creatingOrder.value = false;
  }
};

const goProduct = (row: CartRow) => {
  const id = row.goodsId ?? row.raw?.goodsId ?? row.raw?.goodId ?? row.raw?.productId;
  if (id != null) router.push(`/product/${id}`);
};
const goOrders = () => router.push("/orders");
const goHome = () => router.push("/");

onMounted(() => {
  refresh();
  fetchCoupons();
});
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
.page-title {
  margin: 0;
}
.goods-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.goods-img {
  width: 64px;
  height: 64px;
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
  cursor: pointer;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.goods-sku {
  color: #909399;
  font-size: 12px;
  line-height: 1.2;
}
.footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 6px 0;
}
.footer-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.footer-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.summary {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #606266;
}
.total {
  font-weight: 700;
  color: var(--jd-red, #e1251b);
}
.total-origin {
  color: #999;
  text-decoration: line-through;
  font-size: 13px;
}
.coupon-select {
  display: flex;
  align-items: center;
  gap: 8px;
}
.discount-hint {
  color: #e1251b;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
.coupon-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.coupon-name {
  font-size: 13px;
  color: #303133;
}
.coupon-discount {
  font-weight: 700;
  color: #e1251b;
  font-size: 14px;
}
.coupon-cond {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}
</style>
