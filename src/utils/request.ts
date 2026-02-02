import axios from 'axios'

const request = axios.create({
  baseURL: 'http://localhost:8080/',
  timeout: 5000
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    // 在发送请求之前做些什么
    let token = null
    const path = window.location.pathname

    // 根据当前路径优先获取对应角色的token
    if (path.startsWith('/merchant')) {
      token = sessionStorage.getItem('merchant_token')
    } else if (path.startsWith('/admin')) {
      token = sessionStorage.getItem('admin_token')
    } else {
      // 默认用户或其他公共页面，优先尝试获取用户token
      token = sessionStorage.getItem('user_token')
    }

    // 如果没有找到特定角色的token，尝试获取全局token
    if (!token) {
      token = sessionStorage.getItem('token')
    }

    if (token) {
      config.headers = config.headers || {}
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => {
    // 对请求错误做些什么
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    // 对响应数据做点什么
    return response.data
  },
  error => {
    // 对响应错误做点什么
    const res = error.response
    const isTokenError = res && (
      res.status === 401 ||
      (res.status === 500 && JSON.stringify(res.data || {}).includes('未携带 Token')) ||
      (res.status === 500 && JSON.stringify(res.data || {}).includes('Token invalid'))
    )

    if (isTokenError) {
      // Token 过期或无效
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user_token')
      sessionStorage.removeItem('merchant_token')
      sessionStorage.removeItem('admin_token')

      sessionStorage.removeItem('user_isLoggedIn')
      sessionStorage.removeItem('user_user')
      sessionStorage.removeItem('merchant_isLoggedIn')
      sessionStorage.removeItem('merchant_user')
      sessionStorage.removeItem('admin_isLoggedIn')
      sessionStorage.removeItem('admin_user')

      // 可以选择跳转到登录页，这里简单做清除处理，前端路由守卫会拦截
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default request
