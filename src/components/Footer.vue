<template>
  <footer class="footer">
    <section class="categories-block">
      <ul class="category-list">
        <li v-for="c in categories" :key="c">
          <button
            class="category-chip"
            :class="{ active: c === activeCategory }"
            @click="selectCategory(c)"
          >
            {{ c }}
          </button>
        </li>
      </ul>
      <div class="category-content" v-if="activeCategory">
        <div class="product-grid">
          <router-link
            v-for="item in categoryContent[activeCategory]"
            :key="item.id"
            :to="`/product/${item.id}`"
            class="product-card"
          >
            <img :src="item.image" :alt="item.title" />
            <div class="product-info">
              <div class="product-title">{{ item.title }}</div>
              <div class="product-price">￥{{ item.price.toFixed(2) }}</div>
            </div>
          </router-link>
        </div>
      </div>
    </section>
    <div class="copyright">© 2025 MD App</div>
  </footer>
</template>

<script setup lang="ts" name="Footer">
import { ref } from 'vue'

const categories = ref<string[]>([
  '电子产品',
  '服饰',
  '美妆',
  '家电',
  '图书',
  '运动户外',
  '母婴',
  '食品',
  '宠物',
  '其他'
])
const activeCategory = ref<string>('电子产品')
const categoryContent: Record<string, { id: number; title: string; price: number; image: string }[]> = {}
categories.value.forEach((c, i) => {
  categoryContent[c] = Array.from({ length: 8 }).map((_, j) => ({
    id: i * 100 + j,
    title: `${c} 示例商品 ${j + 1}`,
    price: Math.round((Math.random() * 900 + 100) * 100) / 100,
    image: '/carouseImg/' + (((j % 4) + 1)) + '.jpg'
  }))
})
const selectCategory = (c: string) => {
  activeCategory.value = c
}
</script>

<style scoped>
.footer {
  padding: 20px 24px;
  border-top: 1px solid #ebeef5;
  text-align: center;
  color: #909399;
  background: #fff;
  margin-top: 64px;
}
.categories-block {
  margin-bottom: 32px;
}
.category-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding: 0;
  margin: 0 0 12px 0;
  list-style: none;
  justify-content: center;
}
.category-chip {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 16px;
  background: #fafafa;
  color: #606266;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease;
  outline: none;
}
.category-chip:focus,
.category-chip:focus-visible,
.category-chip:active {
  outline: none;
  box-shadow: 0 2px 8px rgba(225, 37, 27, 0.12);
  border-color: var(--jd-red);
}
.category-chip:hover {
  background: #fff2f0;
  border-color: var(--jd-red);
  color: var(--jd-red);
  box-shadow: 0 2px 8px rgba(225, 37, 27, 0.12);
  transform: translateY(-1px);
}
.category-chip.active {
  background: #fff2f0;
  border-color: var(--jd-red);
  color: var(--jd-red);
  box-shadow: 0 2px 8px rgba(225, 37, 27, 0.12);
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.product-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.product-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.12);
  border-color: #e7e7e7;
}
.product-card img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  background: #f7f7f7;
}
.product-info {
  padding: 8px 10px;
}
.product-title {
  font-size: 14px;
  color: #303133;
  line-height: 1.4;
  height: 2.8em;
  overflow: hidden;
}
.product-price {
  margin-top: 6px;
  color: var(--jd-red);
  font-weight: 600;
}
.copyright {
  font-size: 12px;
  color: #a8abb2;
}
</style>
