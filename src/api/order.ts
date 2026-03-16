import request from "@/utils/request";

export const orderCreateFromCart = (couponClaimId?: number | null) =>
  request.post("order/createFromCart", null, {
    params: couponClaimId != null ? { couponClaimId } : {},
  });

export const orderList = (status?: number) =>
  request.get("order/list", { params: status == null ? {} : { status } });

export const orderDetail = (id: number) => request.get(`order/${id}`);

export const orderPay = (id: number) => request.post(`order/pay/${id}`);

export const orderRefund = (id: number) => request.post(`order/refund/${id}`);

export const orderCancel = (id: number) => request.post(`order/cancel/${id}`);
