<template>
  <div>
    <Header />
    <Body />
    <Footer />
    <RightSidebar />
    <el-dialog v-model="dialogVisible" title="系统公告" width="520px" @close="onDialogClose">
      <v-md-editor :model-value="dialogContent" mode="preview"></v-md-editor>
      <template #footer>
        <el-button @click="onDialogClose">取消</el-button>
        <el-button type="primary" @click="onDialogConfirm">我知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="Home">
import Header from '@/components/Header.vue'
import Body from '@/components/Body.vue'
import Footer from '@/components/Footer.vue'
import RightSidebar from '@/components/RightSidebar.vue'
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { initNoticeSocketForUser, listUnread, markRead } from '@/utils/notice'
onMounted(() => {
  initNoticeSocketForUser()
  showIfUnread()
  window.addEventListener('notice:new', onNew as any)
})
onBeforeUnmount(() => {
  window.removeEventListener('notice:new', onNew as any)
})
const dialogVisible = ref(false)
const dialogContent = ref('')
const currentId = ref<string | null>(null)
const getUid = () => {
  try {
    const raw = sessionStorage.getItem('user_user')
    const u = raw ? JSON.parse(raw) : null
    return u?.id ?? u?.userId ?? u?.uid ?? null
  } catch { return null }
}
const showIfUnread = () => {
  const uid = getUid()
  if (uid == null) return
  const unread = listUnread('user', uid)
  if (unread.length > 0) {
    currentId.value = unread[0].id
    dialogContent.value = unread[0].content || ''
    dialogVisible.value = true
  }
}
const onNew = () => showIfUnread()
const onDialogConfirm = () => {
  const uid = getUid()
  if (uid != null && currentId.value) {
    markRead('user', uid, currentId.value)
  }
  // 显示下一条未读公告（如果有）
  if (uid != null) {
    const unread = listUnread('user', uid)
    if (unread.length > 0) {
      currentId.value = unread[0].id
      dialogContent.value = unread[0].content || ''
      dialogVisible.value = true
      return
    }
  }
  dialogVisible.value = false
}
const onDialogClose = () => {
  dialogVisible.value = false
}
</script>

<style scoped>
</style>
