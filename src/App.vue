<script setup lang="ts" name="App">
import { onMounted } from 'vue';

onMounted(() => {
  // 自动同步当前登录状态到 localStorage，确保新开标签页时不丢失登录态
  const syncLoginState = () => {
    const roles = ['user', 'merchant', 'admin'];
    let synced = false;
    
    roles.forEach(role => {
      const keyIsLoggedIn = `${role}_isLoggedIn`;
      if (sessionStorage.getItem(keyIsLoggedIn) === '1') {
        // 同步登录标志
        if (localStorage.getItem(keyIsLoggedIn) !== '1') {
          localStorage.setItem(keyIsLoggedIn, '1');
          synced = true;
        }
        
        // 同步用户信息
        const keyUser = `${role}_user`;
        const user = sessionStorage.getItem(keyUser);
        if (user && !localStorage.getItem(keyUser)) {
          localStorage.setItem(keyUser, user);
        }

        // 同步 Token
        const keyToken = `${role}_token`;
        const token = sessionStorage.getItem(keyToken);
        if (token && !localStorage.getItem(keyToken)) {
          localStorage.setItem(keyToken, token);
        }
      }
    });

    // 全局 Token 同步
    const globalToken = sessionStorage.getItem('token');
    if (globalToken && !localStorage.getItem('token')) {
      localStorage.setItem('token', globalToken);
      synced = true;
    }

    if (synced) {
      console.log('Login state synced to localStorage for multi-tab support.');
    }
  };

  syncLoginState();
  // 监听 storage 变化，支持多标签页登出同步
  window.addEventListener('storage', (e) => {
    // 处理 Token 变化
    if (e.key === 'token' && !e.newValue) {
      // 其他标签页退出了，这里也退出
      sessionStorage.clear();
      window.location.reload();
    }
  });
});
</script>

<template>
  <router-view />
</template>

<style scoped>
</style>
