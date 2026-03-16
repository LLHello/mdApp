import request from "@/utils/request";

export interface Coupon {
  id?: number;
  claimId?: number;        // 领取记录ID（myCoupons接口返回）
  name: string;
  goodsId?: number | null; // null=全场券
  discountAmount: number;
  thresholdAmount: number;
  startTime: string;
  endTime: string;
  totalStock: number;
  availableStock: number;
  status?: number;
  [key: string]: any;
}

export const couponCreate = (data: Coupon) => request.post("/coupon/create", data);

export const couponList = () => request.get("/coupon/list");

export const couponPreheat = (id: number) => request.post(`/coupon/preheat/${id}`);

export const couponSeckill = (id: number) => request.post(`/coupon/seckill/${id}`);

/** 当前用户已领取且未使用的优惠券 */
export const myCoupons = () => request.get("/coupon/my");

/** 指定商品可用的优惠券（全场券 + 商品专属券） */
export const couponsByGoods = (goodsId: number) =>
  request.get("/coupon/byGoods", { params: { goodsId } });
