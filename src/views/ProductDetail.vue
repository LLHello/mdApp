<template>
  <div class="detail">
    <el-breadcrumb separator="/">
      <el-breadcrumb-item to="/">首页</el-breadcrumb-item>
      <el-breadcrumb-item>商品详情</el-breadcrumb-item>
    </el-breadcrumb>
    <el-card class="detail-card">
      <div class="detail-grid">
        <div class="image-wrap">
          <img :src="image" alt="商品图片" />
        </div>
        <div class="info-wrap">
          <h2 class="title">商品 {{ id }}</h2>
          <div class="price">￥{{ price.toFixed(2) }}</div>
          <el-button type="primary">立即购买</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts" name="ProductDetail">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const id = route.params.id as string
const price = computed(() => Number(id) % 1000 + 199)
const image = computed(() => `/carouseImg/${(Number(id) % 4) + 1}.jpg`)
</script>

<style scoped>
.detail {
  padding: 16px 24px;
}
.detail-card {
  margin-top: 12px;
}
.detail-grid {
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: 16px;
}
.image-wrap {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}
.image-wrap img {
  width: 100%;
  height: 300px;
  object-fit: cover;
}
.info-wrap .title {
  margin: 0 0 10px 0;
  color: #303133;
}
.info-wrap .price {
  color: #e1251b;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 10px;
}
</style>
