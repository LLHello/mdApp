import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { ElMessage } from 'element-plus'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('../views/Home.vue'),
        meta: { roles: [0] }
      },
      {
        path: 'about',
        name: 'About',
        component: () => import('../views/About.vue'),
        meta: { roles: [0] }
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/product/:id',
    name: 'ProductDetail',
    component: () => import('../views/ProductDetail.vue'),
    meta: { roles: [0] }
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('../views/Search.vue'),
    meta: { roles: [0] }
  },
  {
    path: '/cart',
    name: 'Cart',
    component: () => import('../views/Cart.vue'),
    meta: { requiresAuth: true, roles: [0] }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue'),
    meta: { requiresAuth: true, roles: [0] }
  },
  {
    path: '/service',
    name: 'Service',
    component: () => import('../views/Service.vue'),
    meta: { requiresAuth: true, roles: [0] }
  },
  {
    path: '/feedback',
    name: 'Feedback',
    component: () => import('../views/Feedback.vue'),
    meta: { requiresAuth: true, roles: [0] }
  },
  {
    path: '/music',
    name: 'Music',
    component: () => import('../views/Music.vue'),
    meta: { roles: [0] }
  },
  {
    path: '/merchant',
    name: 'Merchant',
    component: () => import('../views/Merchant.vue'),
    meta: { requiresAuth: true, roles: [1] }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/Admin.vue'),
    meta: { requiresAuth: true, roles: [2] }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const metaAny = to.matched.find(r => r.meta)?.meta as any
  const requiredRoles: number[] | undefined = metaAny?.roles
  const requiresAuth: boolean = to.matched.some(r => r.meta && (r.meta as any).requiresAuth)
  const rolePrefix = (role: number) => (role === 1 ? 'merchant' : role === 2 ? 'admin' : 'user')
  if (requiresAuth || requiredRoles) {
    // Determine expected role for this route; default user when not specified
    const expectedRole = requiredRoles && requiredRoles.length ? requiredRoles[0] : 0
    const prefix = rolePrefix(expectedRole)
    const isLoggedForRole = sessionStorage.getItem(`${prefix}_isLoggedIn`) === '1'
    if (!isLoggedForRole) {
      ElMessage.warning('请先登录')
      next({ path: '/login' })
      return
    }
    // Verify stored user role matches expected role
    try {
      const raw = sessionStorage.getItem(`${prefix}_user`)
      const u = raw ? JSON.parse(raw) : null
      const currentRole: number | undefined = u?.role
      if (currentRole !== expectedRole) {
        ElMessage.warning('无权限访问')
        next({ path: '/login' })
        return
      }
    } catch {
      next({ path: '/login' })
      return
    }
  }
  next()
})

export default router
