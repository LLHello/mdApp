<template>
  <div class="login-container">
    <div class="flip-card" :class="{ 'flipped': isFlipped }">
      <div class="flip-card-inner">
        <!-- 登录面 -->
        <div class="flip-card-front">
          <div class="login-box">
            <div class="login-header">
              <el-icon class="logo-icon"><Platform /></el-icon>
              <h2>MD App 登录</h2>
            </div>
            <el-form :model="loginForm" class="login-form">
              <el-form-item>
                <el-input
                  v-model="loginForm.username"
                  placeholder="请输入用户名"
                  :prefix-icon="User"
                  size="large"
                />
              </el-form-item>
              <el-form-item>
                <el-input
                  v-model="loginForm.password"
                  type="password"
                  placeholder="请输入密码"
                  :prefix-icon="Lock"
                  show-password
                  size="large"
                />
              </el-form-item>
              <el-form-item>
                <el-radio-group v-model="loginForm.role" class="role-group">
                  <el-radio value="user">用户</el-radio>
                  <el-radio value="merchant">商家</el-radio>
                  <el-radio value="admin">管理员</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" class="login-btn" size="large" @click="handleLogin">
                  登录
                </el-button>
              </el-form-item>
              <div class="toggle-link">
                还没有账号？<span @click="toggleFlip">去注册</span>
              </div>
            </el-form>
          </div>
        </div>

        <!-- 注册面 -->
        <div class="flip-card-back">
          <div class="login-box">
            <div class="login-header">
              <el-icon class="logo-icon"><Platform /></el-icon>
              <h2>MD App 注册</h2>
            </div>
            <el-form :model="registerForm" class="login-form">
              <el-form-item>
                <el-input
                  v-model="registerForm.username"
                  placeholder="请输入用户名"
                  :prefix-icon="User"
                  size="large"
                />
              </el-form-item>
              <el-form-item>
                <el-input
                  v-model="registerForm.password"
                  type="password"
                  placeholder="请输入密码"
                  :prefix-icon="Lock"
                  show-password
                  size="large"
                />
              </el-form-item>
              <el-form-item>
                <el-input
                  v-model="registerForm.confirmPassword"
                  type="password"
                  placeholder="请确认密码"
                  :prefix-icon="Lock"
                  show-password
                  size="large"
                />
              </el-form-item>
              <el-form-item>
                <el-radio-group v-model="registerForm.role" class="role-group">
                  <el-radio value="user">用户</el-radio>
                  <el-radio value="merchant">商家</el-radio>
                  <el-radio value="admin">管理员</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item v-if="registerForm.role === 'admin'">
                <el-input
                  v-model="registerForm.inviteCode"
                  placeholder="请输入管理员邀请码"
                  :prefix-icon="Key"
                  size="large"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="success" class="login-btn" size="large" @click="handleRegister">
                  注册
                </el-button>
              </el-form-item>
              <div class="toggle-link">
                已有账号？<span @click="toggleFlip">去登录</span>
              </div>
            </el-form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="Login">
import { reactive, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { User, Lock, Platform, Key } from '@element-plus/icons-vue'

const isFlipped = ref(false)
const route = useRoute()

const loginForm = reactive({
  username: '',
  password: '',
  role: 'user'
})

const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  role: 'user',
  inviteCode: ''
})

const toggleFlip = () => {
  isFlipped.value = !isFlipped.value
}

const handleLogin = () => {
  console.log('Login with:', loginForm)
}

const handleRegister = () => {
  console.log('Register with:', registerForm)
}

onMounted(() => {
  if (route.query.mode === 'register') {
    isFlipped.value = true
  }
})
</script>

 

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: cover;
  perspective: 1000px; /* 为3D变换设置透视 */
}

.flip-card {
  width: 400px;
  height: 550px; /* 固定高度以确保翻转效果平滑，根据内容调整 */
  position: relative;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.flip-card.flipped .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-card-front, .flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.flip-card-front {
  background: rgba(255, 255, 255, 0.95);
}

.flip-card-back {
  background: rgba(255, 255, 255, 0.95);
  transform: rotateY(180deg);
}

.login-box {
  padding: 40px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-header {
  text-align: center;
  margin-bottom: 20px;
}

.logo-icon {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 10px;
}

h2 {
  color: #303133;
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.login-form {
  margin-top: 20px;
}

.login-btn {
  width: 100%;
  font-weight: bold;
  letter-spacing: 1px;
}

.toggle-link {
  margin-top: 15px;
  font-size: 14px;
  color: #606266;
}

.toggle-link span {
  color: #409eff;
  cursor: pointer;
  margin-left: 5px;
}

.toggle-link span:hover {
  text-decoration: underline;
}

.role-group {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  width: 100%;
}
</style>
