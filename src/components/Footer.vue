<template>
  <footer class="footer">
    <section class="categories-block">
      <ul class="category-list">
        <li v-for="c in categories" :key="c.id">
          <button
            class="category-chip"
            :class="{ active: c.id === activeCategory }"
            @click="selectCategory(c.id)"
          >
            {{ c.name }}
          </button>
        </li>
      </ul>
      <div class="category-content" v-if="activeCategory">
        <div class="product-grid">
          <router-link
            v-for="item in categoryContent[activeCategory] || []"
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
          <div
            v-if="!categoryContent[activeCategory]?.length"
            class="empty-tip"
          >
            暂无商品
          </div>
        </div>
      </div>
    </section>
    <div class="copyright">© 2025 MD App</div>
  </footer>
</template>

<script setup lang="ts" name="Footer">
import { ref, onMounted } from "vue";
import request from "@/utils/request";

const categories = ref<{ id: number; name: string }[]>([]);
const activeCategory = ref<number>(0);
const categoryContent = ref<
  Record<number, { id: number; title: string; price: number; image: string }[]>
>({});

const fetchCategories = async () => {
  try {
    const res: any = await request.get("goods/categoryList");
    const ok = res?.code === 200 || res?.success === true;
    if (ok && Array.isArray(res?.data)) {
      categories.value = res.data.map((c: any) => ({
        id: Number(c.id),
        name: String(c.name),
      }));

      if (categories.value.length > 0) {
        // 默认选中第一个分类并获取商品
        const first = categories.value[0];
        if (first && first.id) {
          activeCategory.value = first.id;
          fetchGoods(first.id);
        }
      }
    }
  } catch (e) {
    console.error("Fetch categories failed", e);
  }
};

const baseURL = request?.defaults?.baseURL || "";
const normalizeAvatar = (p: string) => {
  if (!p) return "";
  let s = String(p).trim().replace(/\\/g, "/");
  if (s.startsWith("http") || s.startsWith("data:")) return s;
  const uploadIdx = s.toLowerCase().lastIndexOf("/upload/");
  if (uploadIdx >= 0) {
    s = s.slice(uploadIdx);
  }
  if (!/\/upload\//i.test(s) && !/\/carouseImg\//i.test(s)) {
    const parts = s.split("/");
    const filename = parts[parts.length - 1];
    s = "/upload/" + filename;
  }
  const b = baseURL?.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
  s = s.startsWith("/") ? s : "/" + s;
  const url = b + s;
  return url.replace(/([^:])\/{2,}/g, "$1/");
};

const fetchGoods = async (categoryId: number) => {
  try {
    const res: any = await request.get(`goods/categoryId/${categoryId}`);
    const ok = res?.code === 200 || res?.success === true;

    if (ok && Array.isArray(res?.data)) {
      categoryContent.value[categoryId] = res.data.map((item: any) => {
        // 处理图片，后端返回的是 List<String>
        let imgUrl = "";
        if (Array.isArray(item.pic) && item.pic.length > 0) {
          imgUrl = item.pic[0];
        } else if (typeof item.pic === "string") {
          // 如果后端返回的是逗号分隔的字符串，只取第一张
          const parts = item.pic.split(",").filter(Boolean);
          if (parts.length > 0) {
            imgUrl = parts[0];
          }
        }

        // 规范化图片路径
        imgUrl = normalizeAvatar(imgUrl);
        // 默认图
        if (!imgUrl) imgUrl = "/carouseImg/1.jpg";

        return {
          id: item.id,
          title: item.title,
          price: Number(item.price) || 0,
          image: imgUrl,
        };
      });
    } else {
      categoryContent.value[categoryId] = [];
    }
  } catch (e) {
    console.error(`Fetch goods for category ${categoryId} failed`, e);
    categoryContent.value[categoryId] = [];
  }
};

const selectCategory = (id: number) => {
  activeCategory.value = id;
  fetchGoods(id);
};

onMounted(() => {
  fetchCategories();
});
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
  transition: background-color 0.2s ease, border-color 0.2s ease,
    color 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease;
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
  transition: transform 0.15s ease, box-shadow 0.15s ease,
    border-color 0.15s ease;
}
.product-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
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
