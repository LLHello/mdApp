<template>
  <div class="merchant">
    <div class="bar">
      <div class="title">商家中心</div>
      <div class="user-info">
        <div class="avatar">{{ initial }}</div>
        <span class="name">{{ displayName }}</span>
      </div>
    </div>
    <div class="layout">
      <aside class="menu">
        <button
          v-for="a in actions"
          :key="a.key"
          class="menu-item"
          :class="{ active: a.key === active }"
          @click="active = a.key"
        >
          {{ a.title }}
        </button>
      </aside>
      <section class="content">
        <el-card>
          <h3 class="pane-title">{{ paneTitle }}</h3>
          <div v-if="active === 'publish'" class="pane">
            <el-form :model="publishForm" label-width="90px">
              <el-form-item label="商品名称">
                <el-input v-model="publishForm.title" />
              </el-form-item>
              <el-form-item label="价格">
                <el-input v-model="publishForm.price" type="number" />
              </el-form-item>
              <el-form-item label="图片">
                <el-upload action="#" :auto-upload="false">
                  <el-button type="primary">选择图片</el-button>
                </el-upload>
              </el-form-item>
              <el-form-item>
                <el-button type="success" @click="submitPublish">发布</el-button>
              </el-form-item>
            </el-form>
          </div>
          <div v-else-if="active === 'edit'" class="pane edit-layout">
            <aside class="edit-list">
              <el-table :data="products" height="360" @row-click="selectProduct">
                <el-table-column prop="id" label="ID" width="80" />
                <el-table-column prop="title" label="名称" />
                <el-table-column prop="price" label="价格" width="120" />
              </el-table>
            </aside>
            <section class="edit-detail">
              <div v-if="selected">
                <div class="image-preview">
                  <img :src="selected.image" alt="商品图片" />
                </div>
                <el-form :model="selected" label-width="90px">
                  <el-form-item label="名称">
                    <el-input v-model="selected.title" />
                  </el-form-item>
                  <el-form-item label="价格">
                    <el-input v-model="selected.price" type="number" />
                  </el-form-item>
                  <el-form-item label="描述">
                    <el-input v-model="selected.description" type="textarea" rows="3" />
                  </el-form-item>
                  <el-form-item label="更换图片">
                    <el-upload action="#" :auto-upload="false" :show-file-list="false" :on-change="onEditImageChange" accept="image/*">
                      <el-button type="primary">选择图片</el-button>
                    </el-upload>
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" @click="submitEdit">保存修改</el-button>
                  </el-form-item>
                </el-form>
              </div>
              <el-empty v-else description="请选择左侧商品进行编辑" />
            </section>
          </div>
          <div v-else-if="active === 'shelf'" class="pane">
            <el-table :data="products" height="400">
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="title" label="名称" />
              <el-table-column label="上架状态" width="160">
                <template #default="{ row }">
                  <el-select v-model="row.status" placeholder="选择状态" size="small" style="width: 140px">
                    <el-option label="上架" value="online" />
                    <el-option label="下架" value="offline" />
                    <el-option label="售空" value="soldout" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-button type="primary" size="small" @click="submitShelfRow(row)">提交</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div v-else-if="active === 'profile'" class="pane">
            <el-form :model="profileForm" label-width="90px">
              <el-form-item label="头像">
                <el-upload action="#" :auto-upload="false" :show-file-list="false" :on-change="onAvatarChange" accept="image/*">
                  <img :src="profileForm.avatar || defaultAvatar" class="avatar-large" alt="头像" />
                </el-upload>
              </el-form-item>
              <el-form-item label="昵称">
                <el-input v-model="profileForm.username" />
              </el-form-item>
              <el-form-item label="性别">
                <el-select v-model="profileForm.gender" style="width: 200px">
                  <el-option label="男" :value="1" />
                  <el-option label="女" :value="0" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="submitProfile">保存</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-card>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts" name="Merchant">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

const raw = localStorage.getItem('merchant_user')
const user = ref<any>(raw ? JSON.parse(raw) : null)
const displayName = computed(() => user.value?.username || user.value?.account || '商家')
const initial = computed(() => (displayName.value || '商').slice(0, 1))

const actions = [
  { key: 'publish', title: '商品发布' },
  { key: 'edit', title: '商品信息修改' },
  { key: 'shelf', title: '商品上架与下架' },
  { key: 'profile', title: '个人信息修改' }
]
const active = ref<string>('publish')
const paneTitle = computed(() => actions.find(a => a.key === active.value)?.title || '')

const publishForm = ref({ title: '', price: '' })
const products = ref<Array<{ id: number; title: string; price: number; image: string; description: string; status: 'online' | 'offline' | 'soldout' }>>(
  Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    title: `示例商品 ${i + 1}`,
    price: Math.round((Math.random() * 90 + 10) * 100) / 100,
    image: '/carouseImg/' + (((i % 4) + 1)) + '.jpg',
    description: `这是示例商品 ${i + 1} 的描述信息`,
    status: ['online', 'offline', 'soldout'][i % 3] as 'online' | 'offline' | 'soldout'
  }))
)
const selected = ref<any>(null)
const profileForm = ref({ username: displayName.value, gender: 1, avatar: user.value?.avatar || '' })
const defaultAvatar = '/vite.svg'

const submitPublish = () => ElMessage.success('已提交商品发布')
const selectProduct = (row: any) => {
  selected.value = { ...row }
}
const onEditImageChange = (file: any) => {
  if (!file?.raw) return
  const reader = new FileReader()
  reader.onload = () => {
    if (selected.value) selected.value.image = reader.result as string
  }
  reader.readAsDataURL(file.raw)
}
const submitEdit = () => {
  if (!selected.value) return
  const idx = products.value.findIndex(p => p.id === selected.value.id)
  if (idx >= 0) products.value[idx] = { ...selected.value }
  ElMessage.success('已保存商品修改')
}
const submitShelfRow = (row: any) => {
  ElMessage.success(`商品 ${row.id} 状态更新为 ${row.status}`)
}
const onAvatarChange = (file: any) => {
  if (!file?.raw) return
  const reader = new FileReader()
  reader.onload = () => {
    profileForm.value.avatar = reader.result as string
  }
  reader.readAsDataURL(file.raw)
}
const submitProfile = () => {
  const raw = localStorage.getItem('merchant_user')
  const u = raw ? JSON.parse(raw) : {}
  const merged = { ...u, username: profileForm.value.username, gender: profileForm.value.gender, avatar: profileForm.value.avatar }
  localStorage.setItem('merchant_user', JSON.stringify(merged))
  ElMessage.success('已保存个人信息')
}
</script>

<style scoped>
.merchant {
  padding: 16px 24px;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.title {
  font-size: 20px;
  font-weight: 700;
  color: var(--jd-red);
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f56c6c;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.name {
  color: #303133;
  font-weight: 600;
}
.layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 12px;
}
.menu {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 8px;
}
.menu-item {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: #fff;
  color: #606266;
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.15s ease;
}
.menu-item:hover {
  background: #f5f7fa;
  border-color: #dcdfe6;
  color: #303133;
}
.menu-item:focus,
.menu-item:focus-visible {
  outline: none;
}
.menu-item.active {
  background: #ffecec;
  border-color: var(--jd-red);
  color: var(--jd-red);
  font-weight: 600;
}
.content :deep(.el-card) {
  width: 100%;
}
.pane-title {
  margin: 0 0 8px 0;
  color: #303133;
}

.pane {
  width: 960px;
  min-height: 560px;
  margin: 0 auto;
}
.edit-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 12px;
}
.image-preview img {
  width: 240px;
  height: 240px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}
.avatar-large {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #dcdfe6;
}
</style>
