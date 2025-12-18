<template>
  <div class="merchant">
    <div class="bar">
      <div class="title">商家中心</div>
      <div class="user-info" title="账号">
        <img
          v-if="avatarUrl"
          :src="avatarUrl"
          class="avatar-img"
          alt="头像"
          @click="active = 'profile'"
        />
        <div v-else class="avatar" @click="active = 'profile'">{{ initial }}</div>
        <el-dropdown trigger="click" @command="onUserMenu" :teleported="false">
          <div class="name-and-caret" tabindex="0">
            <span class="name">{{ displayName }}</span>
            <span class="caret" aria-hidden="true">▼</span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="password">修改密码</el-dropdown-item>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
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
                <el-input v-model="publishForm.price" />
              </el-form-item>
              <el-form-item label="分类">
                <el-select v-model="publishForm.categoryId" placeholder="请选择分类" style="width: 200px">
                  <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="图片">
                <el-upload action="#" :auto-upload="false" :show-file-list="false" :on-change="onPublishPicChange" accept="image/*" list-type="picture-card">
                  <el-button type="primary">选择图片</el-button>
                </el-upload>
                <div class="pic-list">
                  <div v-for="(p, i) in publishForm.pic" :key="i" class="pic-item">
                    <img :src="p" />
                    <el-button type="danger" text size="small" @click="removePublishPic(i)">移除</el-button>
                  </div>
                </div>
              </el-form-item>
              <el-form-item label="展示状态">
                <el-select v-model="publishForm.isShow" placeholder="选择状态" style="width: 140px">
                  <el-option label="不展示" :value="0" />
                  <el-option label="展示" :value="1" />
                  <el-option label="售空" :value="2" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="success" @click="submitPublish">发布</el-button>
              </el-form-item>
            </el-form>
          </div>
          <div v-else-if="active === 'edit'" class="pane edit-layout">
            <aside class="edit-list">
              <el-table :data="products" height="360" @row-click="selectProduct">
                <el-table-column prop="title" label="名称" />
                <el-table-column prop="price" label="价格" width="120" />
              </el-table>
            </aside>
            <section class="edit-detail">
              <div v-if="selected">
                <div class="image-preview">
                  <img :src="(selected.pic && selected.pic[0]) || ''" alt="商品图片" />
                </div>
                <el-form :model="selected" label-width="90px">
                  <el-form-item label="名称">
                    <el-input v-model="selected.title" />
                  </el-form-item>
                  <el-form-item label="价格">
                    <el-input v-model="selected.price" />
                  </el-form-item>
                  <el-form-item label="分类">
                    <el-select v-model="selected.categoryId" placeholder="请选择分类" style="width: 200px">
                      <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="描述">
                    <el-input v-model="selected.des" type="textarea" rows="3" />
                  </el-form-item>
                  <el-form-item label="商品图片">
                    <el-upload action="#" :auto-upload="false" :show-file-list="false" :on-change="onEditImageChange" accept="image/*" list-type="picture-card">
                      <el-button type="primary">添加图片</el-button>
                    </el-upload>
                    <div class="pic-list">
                      <div v-for="(p, i) in selected.pic" :key="i" class="pic-item">
                        <img :src="p" />
                        <el-button type="danger" text size="small" @click="removeEditPic(i)">移除</el-button>
                      </div>
                    </div>
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
              <el-table-column prop="title" label="名称" />
              <el-table-column label="上架状态" width="160">
                <template #default="{ row }">
                  <el-select v-model="row.isShow" placeholder="选择状态" size="small" style="width: 140px">
                    <el-option label="不展示" :value="0" />
                    <el-option label="展示" :value="1" />
                    <el-option label="售空" :value="2" />
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
                  <img :src="profileAvatarUrl" class="avatar-large" alt="头像" />
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
              <el-form-item label="商家简介">
                <el-input v-model="profileForm.des" type="textarea" rows="4" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="submitProfile">保存</el-button>
                <el-button type="warning" style="margin-left: 8px" @click="openPwdDialog">修改密码</el-button>
              </el-form-item>
            </el-form>
            <el-dialog v-model="pwdDialogVisible" title="修改密码" width="420px">
              <el-form :model="pwdForm" label-width="90px">
                <el-form-item label="旧密码">
                  <el-input v-model="pwdForm.oldPWD" type="password" show-password />
                </el-form-item>
                <el-form-item label="新密码">
                  <el-input v-model="pwdForm.newPWD" type="password" show-password />
                </el-form-item>
                <el-form-item label="确认新密码">
                  <el-input v-model="pwdForm.newPWD2" type="password" show-password />
                </el-form-item>
              </el-form>
              <template #footer>
                <el-button @click="pwdDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="submitPwd">确定</el-button>
              </template>
            </el-dialog>
          </div>
        </el-card>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts" name="Merchant">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { useRouter } from 'vue-router'

const raw = localStorage.getItem('merchant_user')
const user = ref<any>(raw ? JSON.parse(raw) : null)
const displayName = computed(() => user.value?.username || user.value?.account || '商家')
const initial = computed(() => (displayName.value || '商').slice(0, 1))

const baseURL = request?.defaults?.baseURL || ''
const normalizeAvatar = (p: string) => {
  if (!p) return ''
  let s = String(p).trim().replace(/\\/g, '/')
  if (s.startsWith('http') || s.startsWith('data:')) return s
  const uploadIdx = s.toLowerCase().lastIndexOf('/upload/')
  if (uploadIdx >= 0) {
    s = s.slice(uploadIdx) // 以 /upload/ 开头
  }
  if (!/\/upload\//i.test(s)) {
    const parts = s.split('/')
    const filename = parts[parts.length - 1]
    s = '/upload/' + filename
  }
  const b = baseURL?.endsWith('/') ? baseURL.slice(0, -1) : baseURL
  s = s.startsWith('/') ? s : '/' + s
  const url = b + s
  return url.replace(/([^:])\/{2,}/g, '$1/')
}
const getAvatarPath = (u: any) => u?.icon ?? u?.avatar ?? u?.pic ?? u?.photo ?? u?.image ?? u?.headUrl ?? ''
const avatarUrl = computed(() => normalizeAvatar(getAvatarPath(user.value)))

const actions = [
  { key: 'publish', title: '商品发布' },
  { key: 'edit', title: '商品信息修改' },
  { key: 'shelf', title: '商品上架与下架' },
  { key: 'profile', title: '个人信息修改' }
]
const active = ref<string>('publish')
const paneTitle = computed(() => actions.find(a => a.key === active.value)?.title || '')

const categories = ref<Array<{ id: number; name: string }>>([])
const publishForm = ref<{ title: string; price: string; categoryId: number | null; pic: string[]; isShow: number }>({
  title: '',
  price: '',
  categoryId: null,
  pic: [],
  isShow: 1
})
const products = ref<Array<{ id: number; merchantId: number; categoryId: number; pic: string[]; title: string; price: string; isShow: number; des: string }>>(
  Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    merchantId: Number(user.value?.id ?? 1),
    categoryId: (i % 4) + 1,
    pic: ['/carouseImg/' + (((i % 4) + 1)) + '.jpg'],
    title: `示例商品 ${i + 1}`,
    price: (Math.round((Math.random() * 90 + 10) * 100) / 100).toFixed(2),
    isShow: [1, 0, 2][i % 3],
    des: `这是示例商品 ${i + 1} 的描述信息`
  }))
)
const selected = ref<any>(null)
const getUserId = () => Number(user.value?.id ?? user.value?.userId ?? user.value?.uid ?? 0)
const profileForm = ref({ id: getUserId(), username: displayName.value, gender: 1, avatar: getAvatarPath(user.value) || '', des: user.value?.des || '' })
const defaultAvatar = '/vite.svg'
const profileAvatarUrl = computed(() => normalizeAvatar(profileForm.value.avatar) || defaultAvatar)
const pwdDialogVisible = ref(false)
const pwdForm = ref({ oldPWD: '', newPWD: '', newPWD2: '' })
const router = useRouter()

const fetchCategories = async () => {
  try {
    const res = await request.get('categories/list')
    const ok = res?.code === 200 || res?.success === true
    if (ok && Array.isArray(res?.data)) {
      categories.value = res.data.map((c: any) => ({ id: Number(c.id), name: String(c.name) }))
      return
    }
  } catch {}
  categories.value = [
    { id: 1, name: '手机' },
    { id: 2, name: '家电' },
    { id: 3, name: '服饰' },
    { id: 4, name: '美妆' }
  ]
}
onMounted(fetchCategories)

const onPublishPicChange = (file: any) => {
  if (!file?.raw) return
  const reader = new FileReader()
  reader.onload = () => {
    const url = reader.result as string
    publishForm.value.pic.push(url)
  }
  reader.readAsDataURL(file.raw)
}
const removePublishPic = (idx: number) => {
  publishForm.value.pic.splice(idx, 1)
}
const submitPublish = async () => {
  const payload = {
    merchantId: Number(user.value?.id ?? user.value?.userId ?? 0),
    categoryId: publishForm.value.categoryId,
    title: publishForm.value.title,
    price: publishForm.value.price,
    pic: publishForm.value.pic,
    isShow: publishForm.value.isShow,
    des: ''
  }
  try {
    const res = await request.post('goods/save', payload)
    const ok = res?.code === 200 || res?.success === true
    if (!ok) {
      ElMessage.error(res?.msg || '发布失败')
      return
    }
    ElMessage.success(res?.msg || '发布成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '发布失败')
  }
}
const selectProduct = (row: any) => {
  selected.value = { ...row }
}
const onEditImageChange = (file: any) => {
  if (!file?.raw) return
  const reader = new FileReader()
  reader.onload = () => {
    const url = reader.result as string
    if (selected.value) {
      selected.value.pic = Array.isArray(selected.value.pic) ? selected.value.pic : []
      selected.value.pic.push(url)
    }
  }
  reader.readAsDataURL(file.raw)
}
const removeEditPic = (idx: number) => {
  if (!selected.value?.pic) return
  selected.value.pic.splice(idx, 1)
}
const submitEdit = async () => {
  if (!selected.value) return
  const payload = {
    id: selected.value.id,
    merchantId: selected.value.merchantId ?? Number(user.value?.id ?? 0),
    categoryId: selected.value.categoryId,
    title: selected.value.title,
    price: selected.value.price,
    pic: selected.value.pic,
    isShow: selected.value.isShow,
    des: selected.value.des
  }
  try {
    const res = await request.post('goods/update', payload)
    const ok = res?.code === 200 || res?.success === true
    if (!ok) {
      ElMessage.error(res?.msg || '保存失败')
      return
    }
    const idx = products.value.findIndex(p => p.id === selected.value.id)
    if (idx >= 0) products.value[idx] = { ...selected.value }
    ElMessage.success(res?.msg || '保存成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}
const submitShelfRow = (row: any) => {
  ElMessage.success(`商品 ${row.title} 展示状态更新为 ${row.isShow}`)
}
const logout = () => {
  localStorage.removeItem('merchant_isLoggedIn')
  localStorage.removeItem('merchant_user')
  router.push('/login')
}
const onUserMenu = (cmd: string) => {
  if (cmd === 'password') {
    openPwdDialog()
  } else if (cmd === 'logout') {
    logout()
  }
}
const onAvatarChange = async (file: any) => {
  if (!file?.raw) return
  const uid = user.value?.id ?? user.value?.userId ?? user.value?.uid
  try {
    const form = new FormData()
    form.append('id', String(getUserId()))
    form.append('pic', file.raw)
    const res = await request.post('users/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    const ok = res?.code === 200 || res?.success === true
    if (!ok) {
      ElMessage.error(res?.msg || '上传失败')
      return
    }
    const url = typeof res?.data === 'string'
      ? res.data
      : res?.data?.url ?? res?.data?.path ?? res?.data?.avatar ?? ''
    if (url) {
      const finalUrl = (() => {
        const u = normalizeAvatar(url)
        const sep = u.includes('?') ? '&' : '?'
        return `${u}${sep}t=${Date.now()}`
      })()

      const testImg = new Image()
      testImg.onload = () => {
        profileForm.value.avatar = finalUrl
        const rawUser = localStorage.getItem('merchant_user')
        const u = rawUser ? JSON.parse(rawUser) : {}
        const merged = { ...u, id: getUserId(), icon: finalUrl }
        localStorage.setItem('merchant_user', JSON.stringify(merged))
        user.value = merged
        ElMessage.success(res?.msg || '头像上传成功')
      }
      testImg.onerror = () => {
        const reader = new FileReader()
        reader.onload = () => {
          profileForm.value.avatar = reader.result as string
          const rawUser2 = localStorage.getItem('merchant_user')
          const u2 = rawUser2 ? JSON.parse(rawUser2) : {}
          const merged2 = { ...u2, id: getUserId(), icon: finalUrl }
          localStorage.setItem('merchant_user', JSON.stringify(merged2))
          user.value = merged2
          ElMessage.warning('服务暂不可直接访问头像地址，已使用本地预览')
        }
        reader.readAsDataURL(file.raw)
      }
      testImg.src = finalUrl
      return
    }
    // 无返回地址则使用本地预览
    const reader = new FileReader()
    reader.onload = () => {
      profileForm.value.avatar = reader.result as string
      const rawUser2 = localStorage.getItem('merchant_user')
      const u2 = rawUser2 ? JSON.parse(rawUser2) : {}
      const merged2 = { ...u2, avatar: profileForm.value.avatar }
      localStorage.setItem('merchant_user', JSON.stringify(merged2))
      user.value = merged2
      ElMessage.success('头像已更新')
    }
    reader.readAsDataURL(file.raw)
  } catch (e: any) {
    // 失败则本地预览
    const reader = new FileReader()
    reader.onload = () => {
      profileForm.value.avatar = reader.result as string
      ElMessage.error(e?.message || '上传失败，已使用本地预览')
    }
    reader.readAsDataURL(file.raw)
  }
}
const submitProfile = async () => {
  const raw = localStorage.getItem('merchant_user')
  const u = raw ? JSON.parse(raw) : {}
  const merged = { ...u, username: profileForm.value.username, gender: profileForm.value.gender, icon: profileForm.value.avatar, des: profileForm.value.des }
  try {
    const payload = { id: Number(profileForm.value.id || getUserId()), username: merged.username, gender: merged.gender, icon: merged.icon, des: merged.des }
    const res = await request.put('users/modifyUser', payload)
    const ok = res?.code === 200 || res?.success === true
    if (!ok) {
      ElMessage.error(res?.msg || '保存失败')
      return
    }
    localStorage.setItem('merchant_user', JSON.stringify({ ...merged, id: payload.id }))
    user.value = { ...merged, id: payload.id }
    ElMessage.success(res?.msg || '保存成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}
const openPwdDialog = () => {
  pwdForm.value = { oldPWD: '', newPWD: '', newPWD2: '' }
  pwdDialogVisible.value = true
}
const submitPwd = async () => {
  if (!pwdForm.value.oldPWD || !pwdForm.value.newPWD || !pwdForm.value.newPWD2) {
    ElMessage.error('请完整填写密码信息')
    return
  }
  try {
    const params = {
      id: user.value?.id ?? user.value?.userId ?? 0,
      oldPWD: pwdForm.value.oldPWD,
      newPWD: pwdForm.value.newPWD,
      newPWD2: pwdForm.value.newPWD2
    }
    const res = await request.put('users/modifyPWD', null, { params })
    const ok = res?.code === 200 || res?.success === true
    const msg = res?.msg || (ok ? '密码更新成功' : '密码更新失败')
    if (!ok) {
      ElMessage.error(msg)
      return
    }
    ElMessage.success(msg)
    pwdDialogVisible.value = false
    localStorage.removeItem('merchant_isLoggedIn')
    localStorage.removeItem('merchant_user')
    router.push('/login')
  } catch (e: any) {
    ElMessage.error(e?.message || '密码更新失败')
  }
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
  cursor: pointer;
}
.name-and-caret {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
}
.name-and-caret:hover {
  background: #f5f7fa;
  border-color: #dcdfe6;
}
.caret {
  font-size: 12px;
  color: #909399;
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
.avatar-img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #dcdfe6;
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
.pic-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pic-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.pic-item img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 6px;
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
