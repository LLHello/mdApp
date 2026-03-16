import request from "@/utils/request";

export const cartAdd = (skuId: number, quantity: number) =>
  request.post("cart/add", null, { params: { skuId, quantity } });

export const cartList = () => request.get("cart/list");

export const cartUpdateQuantity = (cartItemId: number, quantity: number) =>
  request.put("cart/quantity", null, { params: { cartItemId, quantity } });

export const cartUpdateChecked = (cartItemId: number, checked: 0 | 1) =>
  request.put("cart/checked", null, { params: { cartItemId, checked } });

export const cartRemove = (id: number) => request.delete(`cart/${id}`);
