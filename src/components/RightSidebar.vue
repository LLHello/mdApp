<template>
  <aside class="right-sidebar">
    <button class="item" type="button" @click="go('/cart')">
      <div class="icon-wrap">
        <el-icon><ShoppingCart /></el-icon>
        <span class="badge">25</span>
      </div>
      <div class="label">购物车</div>
    </button>
    <button class="item" type="button" @click="go('/profile')">
      <div class="icon-wrap">
        <el-icon><User /></el-icon>
      </div>
      <div class="label">我的</div>
    </button>
    <button class="item" type="button" @click="go('/service')">
      <div class="icon-wrap">
        <el-icon><Headset /></el-icon>
      </div>
      <div class="label">客服</div>
    </button>
    <button class="item" type="button" @click="go('/feedback')">
      <div class="icon-wrap">
        <el-icon><EditPen /></el-icon>
      </div>
      <div class="label">反馈</div>
    </button>
  </aside>
</template>

<script setup lang="ts" name="RightSidebar">
import { ShoppingCart, User, Headset, EditPen } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const go = (path: string) => router.push(path)
</script>

<style scoped>
.right-sidebar {
  position: fixed;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 16px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.08);
  padding: 6px 4px;
  z-index: 1000;
}
.item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 6px 8px;
  color: #303133;
  background: transparent;
  border: none;
  width: 100%;
  cursor: pointer;
  padding: 6px 4px;
  border-radius: 12px;
  transition: background-color 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  outline: none;
}
.icon-wrap {
  position: relative;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.badge {
  position: absolute;
  right: -4px;
  top: -4px;
  background: var(--jd-red);
  color: #fff;
  font-size: 8px;
  padding: 0 4px;
  border-radius: 10px;
}
.label {
  font-size: 9px;
  margin-top: 2px;
  color: #606266;
  text-align: center;
  letter-spacing: 0.2px;
}
.item:hover .label {
  color: var(--jd-red);
}
.item:hover {
  background: #fff2f0;
  border-color: var(--jd-red);
  box-shadow: 0 2px 8px rgba(225, 37, 27, 0.12);
  transform: translateY(-1px);
}
.item:focus,
.item:active {
  outline: none;
  background: #ffecec;
  border-color: var(--jd-red);
  box-shadow: 0 0 0 2px rgba(225, 37, 27, 0.15) inset;
}
</style>
