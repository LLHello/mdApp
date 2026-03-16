export const dispatchCartChanged = () => {
  window.dispatchEvent(new CustomEvent("cart:changed"));
};
