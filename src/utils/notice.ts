import request from "@/utils/request"

type Role = "user" | "merchant"

const keyFor = (role: Role, uid: number | string) => `notices_${role}_${uid}`

export const listNotices = (role: Role, uid: number | string) => {
  try {
    const raw = localStorage.getItem(keyFor(role, uid))
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export const saveNotices = (role: Role, uid: number | string, arr: any[]) => {
  localStorage.setItem(keyFor(role, uid), JSON.stringify(arr))
}

const wsBaseFromHttp = (http: string) => {
  try {
    const u = new URL(http)
    const protocol = u.protocol === "https:" ? "wss:" : "ws:"
    return `${protocol}//${u.host}`
  } catch {
    if (/^https?:\/\//i.test(http)) {
      const host = http.replace(/^https?:\/\//i, "")
      return `ws://${host}`
    }
    return "ws://localhost:8080"
  }
}

const connect = (uid: number | string, role: Role) => {
  if (!uid) return
  const httpBase = request?.defaults?.baseURL || "http://localhost:8080/"
  const wsBase = wsBaseFromHttp(httpBase)
  const url = `${wsBase}/ws/${uid}`
  let socket: WebSocket | null = null
  try {
    socket = new WebSocket(url)
  } catch {
    return
  }
  socket.onopen = () => {}
  socket.onmessage = (ev) => {
    const text = typeof ev.data === "string" ? ev.data : ""
    const trimmed = text.trim()
    // 忽略连接成功等握手提示
    if (!trimmed || trimmed === "连接成功") return
    // 去除“离线公告”前缀
    const sanitized = trimmed.replace(/^\s*离线公告[:：\-\s]*/i, "")
    const now = Date.now()
    const id = `${now}-${Math.random().toString(36).slice(2, 8)}`
    const item = {
      id,
      type: "notice",
      title: "系统公告",
      content: sanitized,
      time: now,
      read: false,
    }
    const list = listNotices(role, uid)
    list.unshift(item)
    saveNotices(role, uid, list)
    window.dispatchEvent(
      new CustomEvent("notice:new", { detail: { role, uid, item } })
    )
  }
  socket.onerror = () => {}
  socket.onclose = () => {}
  return socket
}

export const initNoticeSocketForUser = () => {
  try {
    const raw = sessionStorage.getItem("user_user")
    const u = raw ? JSON.parse(raw) : null
    const id = u?.id ?? u?.userId ?? u?.uid
    if (id != null) return connect(id, "user")
  } catch {}
}

export const initNoticeSocketForMerchant = () => {
  try {
    const raw = sessionStorage.getItem("merchant_user")
    const u = raw ? JSON.parse(raw) : null
    const id = u?.id ?? u?.userId ?? u?.uid
    if (id != null) return connect(id, "merchant")
  } catch {}
}

export const unreadCount = (role: Role, uid: number | string) =>
  listNotices(role, uid).filter((n: any) => !n?.read && n?.type === "notice").length

export const markAllRead = (role: Role, uid: number | string) => {
  const list = listNotices(role, uid).map((n: any) =>
    n?.type === "notice" ? { ...n, read: true } : n
  )
  saveNotices(role, uid, list)
  window.dispatchEvent(new CustomEvent("notice:readall", { detail: { role, uid } }))
}

export const listUnread = (role: Role, uid: number | string) =>
  listNotices(role, uid).filter((n: any) => n?.type === "notice" && !n?.read)

export const markRead = (role: Role, uid: number | string, id: string) => {
  const list = listNotices(role, uid)
  const idx = list.findIndex((n: any) => n?.id === id)
  if (idx >= 0) {
    list[idx] = { ...list[idx], read: true }
    saveNotices(role, uid, list)
    window.dispatchEvent(new CustomEvent("notice:read", { detail: { role, uid, id } }))
  }
}

export const syncNotices = async (role: Role, uid: number | string) => {
  try {
    // 1. 获取所有系统公告
    const p1 = (async () => {
      try {
        let res: any = await request.get("notice/getALl")
        if (!(res?.code === 200 || res?.success === true) || !Array.isArray(res?.data)) {
          res = await request.get("notice/getAll")
        }
        return (res?.code === 200 || res?.success === true) && Array.isArray(res?.data)
          ? res.data.map((item: any) => ({ ...item, _isGlobal: true }))
          : Array.isArray(res) ? res.map((item: any) => ({ ...item, _isGlobal: true })) : []
      } catch { return [] }
    })()

    // 2. 获取发给当前用户的系统消息
    const p2 = (async () => {
      try {
        const res: any = await request.get(`notice/getAllSystemToUser/${uid}`)
        return (res?.code === 200 || res?.success === true) && Array.isArray(res?.data)
          ? res.data.map((item: any) => ({ ...item, _isGlobal: false }))
          : Array.isArray(res) ? res.map((item: any) => ({ ...item, _isGlobal: false })) : []
      } catch { return [] }
    })()

    const [list1, list2] = await Promise.all([p1, p2])
    const remoteList = [...list1, ...list2]

    // 按时间倒序
    remoteList.sort((a, b) => {
      const t1 = new Date(a.createTime || a.time || 0).getTime()
      const t2 = new Date(b.createTime || b.time || 0).getTime()
      return t2 - t1
    })

    const localList = listNotices(role, uid)
    const merged: any[] = []
    const usedLocalIndices = new Set<number>()

    for (const remote of remoteList) {
      const remoteTime = new Date(remote.createTime || remote.time || 0).getTime()
      const remoteContent = (remote.content || remote.msg || "").trim()
      // 如果是全局公告，ID前缀 sys_；如果是个人消息，ID前缀 user_
      // 防止 ID 冲突 (假设后端两张表ID可能重复)
      const idPrefix = remote._isGlobal ? "sys_" : "user_"
      const uniqueId = `${idPrefix}${remote.id}`
      
      let matchIdx = -1
      // 1. 尝试通过 ID 匹配 (新逻辑带前缀)
      matchIdx = localList.findIndex((n: any, idx: number) => !usedLocalIndices.has(idx) && String(n.id) === uniqueId)
      
      // 2. 尝试通过旧 ID 匹配 (兼容旧数据: 旧数据可能直接存的数字ID)
      if (matchIdx === -1) {
        matchIdx = localList.findIndex((n: any, idx: number) => !usedLocalIndices.has(idx) && String(n.id) === String(remote.id))
      }

      // 3. 尝试通过内容匹配 (兼容 WebSocket 推送的无ID消息)
      if (matchIdx === -1) {
        matchIdx = localList.findIndex((n: any, idx: number) => !usedLocalIndices.has(idx) && (n.content || "").trim() === remoteContent)
      }

      let isRead = false
      if (matchIdx !== -1) {
        usedLocalIndices.add(matchIdx)
        isRead = !!localList[matchIdx].read
      }

      merged.push({
        id: uniqueId,
        type: "notice",
        title: remote.title || (remote._isGlobal ? "系统公告" : "消息通知"),
        content: remoteContent,
        time: remoteTime,
        createTime: remote.createTime,
        read: isRead
      })
    }

    // 保留非系统公告类型的消息（如果有）
    const otherTypes = localList.filter((n: any) => n.type !== "notice")
    const final = [...merged, ...otherTypes]
    final.sort((a: any, b: any) => (b.time || 0) - (a.time || 0))
    
    saveNotices(role, uid, final)
    // 触发更新事件，更新红点等
    window.dispatchEvent(new CustomEvent("notice:new", { detail: { role, uid } }))
    return final
  } catch (e) {
    console.error("Sync notices failed", e)
    return listNotices(role, uid)
  }
}
