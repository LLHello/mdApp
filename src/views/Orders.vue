<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">我的订单</h2>
      <div class="actions">
        <el-select v-model="statusFilter" placeholder="订单状态" style="width: 140px" :disabled="loading">
          <el-option label="全部" :value="null" />
          <el-option label="待支付" :value="0" />
          <el-option label="已支付" :value="1" />
          <el-option label="已退款" :value="2" />
          <el-option label="已取消" :value="3" />
        </el-select>
        <el-button type="primary" plain @click="goCart">去购物车</el-button>
        <el-button text type="primary" :disabled="loading" @click="refresh">刷新</el-button>
      </div>
    </div>

    <el-card>
      <el-empty v-if="!loading && !orders.length" description="暂无订单" />
      <el-table v-else v-loading="loading" :data="orders" style="width: 100%">
        <el-table-column label="订单号" min-width="220">
          <template #default="{ row }">
            <div class="mono">{{ row.orderNo || `#${row.id}` }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.statusText)">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="140">
          <template #default="{ row }">
            <span v-if="row.totalAmount != null">¥{{ formatMoney(row.totalAmount) }}</span>
            <span v-else>--</span>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" width="190">
          <template #default="{ row }">
            <span>{{ row.createTimeText }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" @click="goDetail(row.id)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts" name="Orders">
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { formatMoney } from "@/utils/goods";
import { orderList, orderPay, orderRefund, orderCancel } from "@/api/order";

type OrderRow = {
  id: number;
  orderNo: string;
  statusText: string;
  totalAmount: number | null;
  createTimeText: string;
  raw: any;
};

const router = useRouter();
const loading = ref(false);
const orders = ref<OrderRow[]>([]);
const payingMap = ref<Record<number, boolean>>({});
const refundingMap = ref<Record<number, boolean>>({});
const cancellingMap = ref<Record<number, boolean>>({});
const statusFilter = ref<number | null>(null);

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

const canPay = (row: OrderRow) => {
  const rawStatus =
    row.raw?.status ?? row.raw?.state ?? row.raw?.orderStatus ?? row.raw?.order_status ?? null;
  const n = Number(rawStatus);
  if (Number.isFinite(n)) return n === 0;
  return String(row.statusText || "").includes("待支付");
};

const isPaying = (id: number) => !!payingMap.value[id];
const isRefunding = (id: number) => !!refundingMap.value[id];
const isCancelling = (id: number) => !!cancellingMap.value[id];

const onPay = async (row: OrderRow) => {
  if (!canPay(row) || isPaying(row.id)) return;
  try {
    await ElMessageBox.confirm("确认支付该订单吗？", "支付", {
      confirmButtonText: "确认支付",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }

  payingMap.value[row.id] = true;
  try {
    const res: any = await orderPay(row.id);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error(res?.msg || "支付失败");
      return;
    }
    ElMessage.success("支付成功");
    await refresh();
  } catch (e: any) {
    ElMessage.error(e?.message || "支付失败");
  } finally {
    payingMap.value[row.id] = false;
  }
};

const canRefund = (row: OrderRow) => {
  const rawStatus =
    row.raw?.status ?? row.raw?.state ?? row.raw?.orderStatus ?? row.raw?.order_status ?? null;
  const n = Number(rawStatus);
  // Status 1: 已支付
  if (Number.isFinite(n)) return n === 1;
  return String(row.statusText || "").includes("已支付");
};

const onRefund = async (row: OrderRow) => {
  if (!canRefund(row) || isRefunding(row.id)) return;
  try {
    await ElMessageBox.confirm("确认申请退款吗？", "退款", {
      confirmButtonText: "确认退款",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }

  refundingMap.value[row.id] = true;
  try {
    const res: any = await orderRefund(row.id);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error(res?.msg || "退款申请失败");
      return;
    }
    ElMessage.success("退款申请成功");
    await refresh();
  } catch (e: any) {
    ElMessage.error(e?.message || "退款申请失败");
  } finally {
    refundingMap.value[row.id] = false;
  }
};

const onCancel = async (row: OrderRow) => {
  if (!canPay(row) || isCancelling(row.id)) return;
  try {
    await ElMessageBox.confirm("确认取消该订单吗？", "取消订单", {
      confirmButtonText: "确认取消",
      cancelButtonText: "再想想",
      type: "warning",
    });
  } catch {
    return;
  }

  cancellingMap.value[row.id] = true;
  try {
    const res: any = await orderCancel(row.id);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error(res?.msg || "取消订单失败");
      return;
    }
    ElMessage.success("订单已取消");
    await refresh();
  } catch (e: any) {
    ElMessage.error(e?.message || "取消订单失败");
  } finally {
    cancellingMap.value[row.id] = false;
  }
};


const normalize = (it: any): OrderRow | null => {
  const id = toNumber(it?.id ?? it?.orderId ?? it?.order_id) ?? null;
  if (id == null) return null;
  const orderNo = String(it?.orderNo ?? it?.no ?? it?.sn ?? it?.orderSn ?? it?.order_sn ?? "").trim();
  const totalAmount =
    toNumber(it?.totalAmount ?? it?.total_amount) ??
    toNumber(it?.amount ?? it?.payAmount ?? it?.pay_amount) ??
    toNumber(it?.totalPrice ?? it?.total_price) ??
    null;
  const statusText = statusToText(it?.status ?? it?.state ?? it?.orderStatus ?? it?.order_status);
  const createTimeText = formatTime(it?.createTime ?? it?.create_time ?? it?.time ?? it?.createdAt);
  return { id: Number(id), orderNo, statusText, totalAmount, createTimeText, raw: it };
};

const refresh = async () => {
  if (loading.value) return;
  loading.value = true;
  try {
    const res: any = await orderList(statusFilter.value ?? undefined);
    const ok = res?.code === 200 || res?.success === true;
    const data = ok ? res?.data : null;
    const list = Array.isArray(data) ? data : Array.isArray(data?.list) ? data.list : Array.isArray(data?.items) ? data.items : [];
    orders.value = list.map(normalize).filter((x: any): x is OrderRow => x != null);
  } catch (e: any) {
    ElMessage.error(e?.message || "获取订单列表失败");
    orders.value = [];
  } finally {
    loading.value = false;
  }
};

const statusTagType = (text: string) => {
  const t = String(text || "");
  if (t.includes("退款")) return "info";
  if (t.includes("已支付")) return "success";
  if (t.includes("待")) return "warning";
  return "primary";
};

const goDetail = (id: number) => router.push(`/orders/${id}`);
const goCart = () => router.push("/cart");

onMounted(refresh);
watch(statusFilter, () => {
  refresh();
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
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
    monospace;
}
</style>
