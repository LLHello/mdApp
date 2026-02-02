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
          @click="switchTab('profile')"
        />
        <div v-else class="avatar" @click="switchTab('profile')">
          {{ initial }}
        </div>
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
          @click="switchTab(a.key)"
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
                <el-select
                  v-model="publishForm.categoryId"
                  placeholder="请选择分类"
                  style="width: 200px"
                >
                  <el-option
                    v-for="c in categories"
                    :key="c.id"
                    :label="c.name"
                    :value="c.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="图片">
                <el-upload
                  action="#"
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="onPublishPicChange"
                  accept="image/*"
                  list-type="picture-card"
                >
                  <el-button type="primary">选择图片</el-button>
                </el-upload>
                <div class="pic-list">
                  <div
                    v-for="(p, i) in publishForm.pic"
                    :key="i"
                    class="pic-item"
                  >
                    <img :src="p" />
                    <el-button
                      type="danger"
                      text
                      size="small"
                      @click="removePublishPic(i)"
                      >移除</el-button
                    >
                  </div>
                </div>
              </el-form-item>
              <el-form-item label="展示状态">
                <el-select
                  v-model="publishForm.isShow"
                  placeholder="选择状态"
                  style="width: 140px"
                >
                  <el-option label="不展示" :value="0" />
                  <el-option label="展示" :value="1" />
                  <el-option label="售空" :value="2" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="success" @click="submitPublish"
                  >发布</el-button
                >
              </el-form-item>
            </el-form>
          </div>
          <div v-else-if="active === 'edit'" class="pane edit-layout">
            <aside class="edit-list">
              <el-table
                :data="products"
                height="360"
                @row-click="selectProduct"
              >
                <el-table-column prop="title" label="名称" />
                <el-table-column prop="price" label="价格" width="120" />
              </el-table>
            </aside>
            <section class="edit-detail">
              <div v-if="selected">
                <div
                  class="image-preview"
                  v-if="selected.pic && selected.pic.length > 0"
                >
                  <div class="slideshow-container" @click="nextPreviewImage">
                    <img
                      :src="selected.pic[currentPreviewIndex]"
                      class="slide-img"
                      alt="商品图片"
                    />
                    <div class="slide-indicator">
                      {{ currentPreviewIndex + 1 }} / {{ selected.pic.length }}
                      <span class="next-hint" v-if="selected.pic.length > 1"
                        >(点击切换)</span
                      >
                    </div>
                  </div>
                </div>
                <el-form :model="selected" label-width="90px">
                  <el-form-item label="名称">
                    <el-input v-model="selected.title" />
                  </el-form-item>
                  <el-form-item label="价格">
                    <el-input v-model="selected.price" />
                  </el-form-item>
                  <el-form-item label="分类">
                    <el-select
                      v-model="selected.categoryId"
                      placeholder="请选择分类"
                      style="width: 200px"
                      @click="fetchCategories"
                    >
                      <el-option
                        v-for="c in categories"
                        :key="c.id"
                        :label="c.name"
                        :value="c.id"
                      />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="描述">
                    <el-input v-model="selected.des" type="textarea" rows="3" />
                  </el-form-item>
                  <el-form-item label="商品图片">
                    <el-upload
                      action="#"
                      :auto-upload="false"
                      :show-file-list="false"
                      :on-change="onEditImageChange"
                      accept="image/*"
                      list-type="picture-card"
                      multiple
                    >
                      <el-button type="primary">添加图片</el-button>
                    </el-upload>
                    <div class="pic-list">
                      <div
                        v-for="(p, i) in selected.pic"
                        :key="i"
                        class="pic-item"
                      >
                        <img :src="p" />
                        <el-button
                          type="danger"
                          text
                          size="small"
                          @click="removeEditPic(i)"
                          >移除</el-button
                        >
                      </div>
                    </div>
                  </el-form-item>
                  <el-form-item label="展示状态">
                    <el-select
                      v-model="selected.isShow"
                      placeholder="选择状态"
                      style="width: 140px"
                    >
                      <el-option label="不展示" :value="0" />
                      <el-option label="展示" :value="1" />
                      <el-option label="售空" :value="2" />
                    </el-select>
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" @click="submitEdit"
                      >保存修改</el-button
                    >
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
                  <el-select
                    v-model="row.isShow"
                    placeholder="选择状态"
                    size="small"
                    style="width: 140px"
                  >
                    <el-option label="不展示" :value="0" />
                    <el-option label="展示" :value="1" />
                    <el-option label="售空" :value="2" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-button
                    type="primary"
                    size="small"
                    @click="submitShelfRow(row)"
                    >提交</el-button
                  >
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div v-else-if="active === 'profile'" class="pane">
            <el-form :model="profileForm" label-width="90px">
              <el-form-item label="头像">
                <el-upload
                  action="#"
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="onAvatarChange"
                  accept="image/*"
                >
                  <img
                    :src="profileAvatarUrl"
                    class="avatar-large"
                    alt="头像"
                  />
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
                <el-button type="primary" @click="submitProfile"
                  >保存</el-button
                >
                <el-button
                  type="warning"
                  style="margin-left: 8px"
                  @click="openPwdDialog"
                  >修改密码</el-button
                >
              </el-form-item>
            </el-form>
            <el-dialog
              v-model="pwdDialogVisible"
              title="修改密码"
              width="420px"
            >
              <el-form :model="pwdForm" label-width="90px">
                <el-form-item label="旧密码">
                  <el-input
                    v-model="pwdForm.oldPWD"
                    type="password"
                    show-password
                  />
                </el-form-item>
                <el-form-item label="新密码">
                  <el-input
                    v-model="pwdForm.newPWD"
                    type="password"
                    show-password
                  />
                </el-form-item>
                <el-form-item label="确认新密码">
                  <el-input
                    v-model="pwdForm.newPWD2"
                    type="password"
                    show-password
                  />
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
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import request from "@/utils/request";
import { useRouter } from "vue-router";

const raw = sessionStorage.getItem("merchant_user");
const user = ref<any>(raw ? JSON.parse(raw) : null);
const displayName = computed(
  () => user.value?.username || user.value?.account || "商家"
);
const initial = computed(() => (displayName.value || "商").slice(0, 1));

const baseURL = request?.defaults?.baseURL || "";
const normalizeAvatar = (p: string) => {
  if (!p) return "";
  let s = String(p).trim().replace(/\\/g, "/");
  if (s.startsWith("http") || s.startsWith("data:")) return s;
  const uploadIdx = s.toLowerCase().lastIndexOf("/upload/");
  if (uploadIdx >= 0) {
    s = s.slice(uploadIdx); // 以 /upload/ 开头
  }
  if (!/\/upload\//i.test(s)) {
    const parts = s.split("/");
    const filename = parts[parts.length - 1];
    s = "/upload/" + filename;
  }
  const b = baseURL?.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
  s = s.startsWith("/") ? s : "/" + s;
  const url = b + s;
  return url.replace(/([^:])\/{2,}/g, "$1/");
};
const getAvatarPath = (u: any) =>
  u?.icon ?? u?.avatar ?? u?.pic ?? u?.photo ?? u?.image ?? u?.headUrl ?? "";
const avatarUrl = computed(() => normalizeAvatar(getAvatarPath(user.value)));

const actions = [
  { key: "publish", title: "商品发布" },
  { key: "edit", title: "商品管理" },
  { key: "profile", title: "个人信息修改" },
];
const active = ref<string>("publish");
const paneTitle = computed(
  () => actions.find((a) => a.key === active.value)?.title || ""
);

const isDirty = ref(false);
const isLoading = ref(false);

const switchTab = async (key: string) => {
  if (active.value === key) return;

  if (active.value === "edit" && isDirty.value) {
    try {
      await ElMessageBox.confirm("当前有未保存的修改，是否保存？", "提示", {
        confirmButtonText: "保存",
        cancelButtonText: "不保存",
        type: "warning",
        distinguishCancelAndClose: true,
      });
      // 用户点击保存
      const success = await submitEdit();
      if (success) {
        active.value = key;
      }
    } catch (action) {
      // 用户点击不保存 (cancel) 或 关闭 (close)
      if (action === "cancel") {
        isDirty.value = false;
        active.value = key;
      }
      // 如果是 close，则留在当前页面
    }
  } else {
    active.value = key;
  }
};

const categories = ref<Array<{ id: number; name: string }>>([]);
const publishForm = ref<{
  title: string;
  price: string;
  categoryId: number | null;
  pic: string[];
  isShow: number;
}>({
  title: "",
  price: "",
  categoryId: null,
  pic: [],
  isShow: 1,
});
const products = ref<
  Array<{
    id: number;
    merchantId: number;
    categoryId: number;
    pic: string[];
    title: string;
    price: string;
    isShow: number;
    des: string;
    status: number;
  }>
>(
  Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    merchantId: Number(user.value?.id ?? 1),
    categoryId: (i % 4) + 1,
    pic: ["/carouseImg/" + ((i % 4) + 1) + ".jpg"],
    title: `示例商品 ${i + 1}`,
    price: (Math.round((Math.random() * 90 + 10) * 100) / 100).toFixed(2),
    isShow: [1, 0, 2][i % 3],
    des: `这是示例商品 ${i + 1} 的描述信息`,
    status: 1,
  }))
);
const fetchMerchantGoods = async () => {
  const mid = Number(
    user.value?.id ?? user.value?.userId ?? user.value?.uid ?? 0
  );
  if (!mid) return;
  try {
    const res: any = await request.get(`goods/merchantGoods/${mid}`);
    const ok = res?.code === 200 || res?.success === true;
    if (ok && Array.isArray(res?.data)) {
      products.value = res.data.map((p: any) => {
        let picList: string[] = [];
        if (typeof p.pic === "string") {
          // 如果后端直接返回逗号分隔的字符串
          picList = p.pic.split(",").filter(Boolean);
        } else if (Array.isArray(p.pic)) {
          // 兼容后端返回数组的情况（虽然要求是String，但做防御性编程）
          picList = p.pic.filter(Boolean);
        }

        // 确保每个图片路径都是完整的URL
        picList = picList.map((url) => normalizeAvatar(url));

        return {
          id: Number(p.id),
          merchantId: Number(p.merchantId),
          categoryId: Number(p.categoryId),
          pic: picList,
          title: String(p.title),
          price: Number(p.price).toFixed(2),
          isShow: Number(p.isShow),
          des: String(p.des || ""),
        };
      });
    }
  } catch (e) {
    console.error("Fetch merchant goods failed", e);
  }
};

watch(active, (val) => {
  if (val === "edit" || val === "shelf") {
    fetchMerchantGoods();
  }
});
const selected = ref<any>(null);
const deletedPics = ref<string[]>([]);
const getUserId = () =>
  Number(user.value?.id ?? user.value?.userId ?? user.value?.uid ?? 0);
const profileForm = ref({
  id: getUserId(),
  username: displayName.value,
  gender: 1,
  avatar: getAvatarPath(user.value) || "",
  des: user.value?.des || "",
});
const defaultAvatar = "/vite.svg";
const profileAvatarUrl = computed(
  () => normalizeAvatar(profileForm.value.avatar) || defaultAvatar
);
const pwdDialogVisible = ref(false);
const pwdForm = ref({ oldPWD: "", newPWD: "", newPWD2: "" });
const router = useRouter();

const fetchCategories = async () => {
  try {
    const res = await request.get("goods/categoryList");
    const ok = res?.code === 200 || res?.success === true;
    if (ok && Array.isArray(res?.data)) {
      categories.value = res.data.map((c: any) => ({
        id: Number(c.id),
        name: String(c.name),
      }));
      return;
    }
  } catch {}
  categories.value = [
    { id: 1, name: "手机" },
    { id: 2, name: "家电" },
    { id: 3, name: "服饰" },
    { id: 4, name: "美妆" },
  ];
};
onMounted(fetchCategories);

const onPublishPicChange = async (file: any) => {
  if (!file?.raw) return;

  // 文件大小限制 (例如 5MB)
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error("图片大小不能超过 5MB");
    return;
  }

  const form = new FormData();
  form.append("id", String(getUserId()));
  form.append("pic", file.raw);

  try {
    const res = await request.post("users/upload", form);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error(res?.msg || "上传失败");
      return;
    }

    // 获取后端返回的图片URL
    let url =
      typeof res?.data === "string"
        ? res.data
        : res?.data?.url ?? res?.data?.path ?? "";

    if (url) {
      url = normalizeAvatar(url);
      publishForm.value.pic.push(url);
      ElMessage.success("图片上传成功");
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "上传出错");
  }
};
const removePublishPic = (idx: number) => {
  publishForm.value.pic.splice(idx, 1);
};
const getRelativePath = (url: string) => {
  if (!url) return "";
  const idx = url.indexOf("/upload/");
  if (idx >= 0) {
    return url.slice(idx); // 保留 /upload/...
  }
  return url;
};

const submitPublish = async () => {
  const payload = {
    merchantId: Number(user.value?.id ?? user.value?.userId ?? 0),
    categoryId: publishForm.value.categoryId,
    title: publishForm.value.title,
    price: publishForm.value.price,
    pic: publishForm.value.pic.map((p) => getRelativePath(p)), // 转换为相对路径数组
    isShow: publishForm.value.isShow,
    des: "",
  };
  try {
    const res = await request.post("goods/save", payload);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error(res?.msg || "发布失败");
      return;
    }
    ElMessage.success(res?.msg || "发布成功");
  } catch (e: any) {
    ElMessage.error(e?.message || "发布失败");
  }
};

const currentPreviewIndex = ref(0);
const nextPreviewImage = () => {
  if (!selected.value?.pic || selected.value.pic.length <= 1) return;
  currentPreviewIndex.value =
    (currentPreviewIndex.value + 1) % selected.value.pic.length;
};

const selectProduct = async (row: any) => {
  if (!row?.id) return;
  // 重置删除列表和上传文件列表
  deletedPics.value = [];
  uploadFiles.value = [];
  isLoading.value = true;
  isDirty.value = false;

  try {
    const res: any = await request.get(`goods/good/${row.id}`);
    const ok = res?.code === 200 || res?.success === true;
    if (ok && res.data) {
      const item = { ...res.data };

      // 确保 pic 是数组
      if (typeof item.pic === "string") {
        item.pic = (item.pic as string).split(",").filter(Boolean);
      } else if (!Array.isArray(item.pic)) {
        item.pic = [];
      }

      // 修复bug：如果详情接口返回的图片为空，但列表中有图片，则使用列表中的图片
      // 避免出现"原本有图，点进来变没图，再上传新图看起来像旧图被丢弃"的错觉
      if (item.pic.length === 0 && row.pic && row.pic.length > 0) {
        // row.pic 已经是完整的URL数组，需要拷贝一份，避免引用修改
        item.pic = [...row.pic];
      } else {
        // 只有当不是从 row 拷贝来的时候，才需要规范化路径（row.pic 已经是规范化的）
        // 不过为了保险，再次规范化也无妨，normalizeAvatar 是幂等的
        item.pic = item.pic.map((url: string) => normalizeAvatar(url));
      }
      // 再次确保规范化 (防止 row.pic 未规范化的情况)
      item.pic = item.pic.map((url: string) => normalizeAvatar(url));

      selected.value = item;
    } else {
      // 如果接口失败，回退到使用列表中的数据（兜底）
      const item = { ...row };
      if (typeof item.pic === "string") {
        item.pic = (item.pic as string).split(",").filter(Boolean);
      } else if (!Array.isArray(item.pic)) {
        item.pic = [];
      }
      item.pic = item.pic.map((url: string) => normalizeAvatar(url));
      selected.value = item;
    }
  } catch (e) {
    console.error("Fetch product detail failed", e);
    // 出错也回退到使用列表数据
    const item = { ...row };
    if (typeof item.pic === "string") {
      item.pic = (item.pic as string).split(",").filter(Boolean);
    } else if (!Array.isArray(item.pic)) {
      item.pic = [];
    }
    item.pic = item.pic.map((url: string) => normalizeAvatar(url));
    selected.value = item;
  } finally {
    nextTick(() => {
      isLoading.value = false;
    });
  }
};

watch(
  selected,
  () => {
    if (!isLoading.value && active.value === "edit") {
      isDirty.value = true;
    }
    currentPreviewIndex.value = 0;
  },
  { deep: true }
);

const uploadFiles = ref<File[]>([]);

const onEditImageChange = (file: any) => {
  if (!file?.raw) return;
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error("图片大小不能超过 5MB");
    return;
  }

  // 1. 生成本地预览URL
  const reader = new FileReader();
  reader.readAsDataURL(file.raw);
  reader.onload = (e) => {
    const base64Url = e.target?.result as string;
    if (selected.value) {
      // 确保 pic 是数组，如果是 undefined/null 则初始化为空数组
      if (!Array.isArray(selected.value.pic)) {
        selected.value.pic = [];
      }
      selected.value.pic.push(base64Url);
    }

    // 2. 将文件对象与预览URL关联，存入 uploadFiles
    // 我们需要一种方式将 selected.pic 中的 base64Url 与 uploadFiles 中的 File 对象对应起来
    // 简单的做法是并行数组，或者将 uploadFiles 存储为 { file: File, url: string } 的结构
    // 这里为了最小改动，我们假设 uploadFiles 的顺序与 selected.pic 中 base64 图片的顺序一致（新添加的在后面）
    uploadFiles.value.push(file.raw);
  };
};

const removeEditPic = (idx: number) => {
  if (!selected.value?.pic) return;

  // 判断移除的是否是新上传的图片
  const urlToRemove = selected.value.pic[idx];

  if (urlToRemove.startsWith("data:")) {
    // 移除新上传的图片（base64）
    // 需要同步从 uploadFiles 中移除对应的文件
    // 由于我们简单地假设 uploadFiles 中的顺序与 selected.pic 中的 base64 图片顺序一致
    // 我们先计算出这是第几个 base64 图片
    let base64Count = 0;
    for (let i = 0; i < idx; i++) {
      if (selected.value.pic[i].startsWith("data:")) {
        base64Count++;
      }
    }
    // 从 uploadFiles 中移除对应索引的文件
    if (base64Count < uploadFiles.value.length) {
      uploadFiles.value.splice(base64Count, 1);
    }
  } else {
    // 移除原有图片
    // 加入到删除列表
    deletedPics.value.push(getRelativePath(urlToRemove));
  }

  // 从视图中移除
  selected.value.pic.splice(idx, 1);
};

const submitEdit = async () => {
  if (!selected.value) return false;

  const goods = {
    id: selected.value.id,
    merchantId: selected.value.merchantId ?? Number(user.value?.id ?? 0),
    categoryId: selected.value.categoryId,
    title: selected.value.title,
    price: selected.value.price,
    isShow: selected.value.isShow,
    des: selected.value.des,
    status: selected.value.status ?? 1,
  };

  const formData = new FormData();
  // 添加 goods
  formData.append(
    "goods",
    new Blob([JSON.stringify(goods)], { type: "application/json" })
  );

  // 添加 deleteImagePaths
  if (deletedPics.value.length > 0) {
    formData.append(
      "deleteImagePaths",
      new Blob([JSON.stringify(deletedPics.value)], {
        type: "application/json",
      })
    );
  }

  // 添加 newImages
  uploadFiles.value.forEach((file) => {
    formData.append("newImages", file);
  });

  // 添加 oldImagePath
  // 过滤掉 base64 预览图，只保留原有的服务器图片路径（剩余的）
  const existingPics = Array.isArray(selected.value.pic)
    ? selected.value.pic.filter((p: string) => !p.startsWith("data:"))
    : [];
  const oldImagePath = existingPics
    .map((p: string) => getRelativePath(p))
    .join(",");
  formData.append("oldImagePath", oldImagePath);

  try {
    const res = await request.put("goods/update", formData);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error(res?.msg || "保存失败");
      return false;
    }

    ElMessage.success(res?.msg || "保存成功");
    uploadFiles.value = []; // 清空已上传文件队列
    deletedPics.value = []; // 清空删除列表
    isDirty.value = false; // 重置修改状态
    fetchMerchantGoods(); // 刷新列表
    // 刷新当前选中项（重新获取详情或重置状态）
    selectProduct(selected.value);
    return true;
  } catch (e: any) {
    ElMessage.error(e?.message || "保存失败");
    return false;
  }
};
const submitShelfRow = async (row: any) => {
  const goods = {
    id: row.id,
    merchantId: row.merchantId,
    categoryId: row.categoryId,
    title: row.title,
    price: row.price,
    isShow: row.isShow,
    des: row.des,
    status: row.status ?? 1,
  };

  const formData = new FormData();
  formData.append(
    "goods",
    new Blob([JSON.stringify(goods)], { type: "application/json" })
  );

  // 对于上架状态修改，不需要删除图片，也不需要上传新图片
  // 但 oldImagePath 需要传当前的图片列表
  const oldImagePath = Array.isArray(row.pic)
    ? row.pic.map((p: string) => getRelativePath(p)).join(",")
    : "";
  formData.append("oldImagePath", oldImagePath);

  try {
    const res = await request.put("goods/update", formData);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error(res?.msg || "状态更新失败");
      // 回滚状态
      row.isShow = row.isShow === 1 ? 0 : 1;
      return;
    }
    ElMessage.success(`商品 ${row.title} 状态已更新`);
  } catch (e: any) {
    ElMessage.error(e?.message || "状态更新失败");
    // 回滚状态
    row.isShow = row.isShow === 1 ? 0 : 1;
  }
};
const logout = async () => {
  if (active.value === "edit" && isDirty.value) {
    try {
      await ElMessageBox.confirm("当前有未保存的修改，是否保存？", "提示", {
        confirmButtonText: "保存",
        cancelButtonText: "不保存",
        type: "warning",
        distinguishCancelAndClose: true,
      });
      // 用户点击保存
      const success = await submitEdit();
      if (!success) return; // 保存失败则暂停退出
    } catch (action) {
      if (action !== "cancel") return; // 如果不是点击"不保存"（即点击了关闭），则暂停退出
      // 点击"不保存"，继续退出
    }
  }

  sessionStorage.removeItem("merchant_isLoggedIn");
  sessionStorage.removeItem("merchant_user");
  sessionStorage.removeItem("merchant_token");
  sessionStorage.removeItem("token");
  router.push("/login");
};
const onUserMenu = async (cmd: string) => {
  if (cmd === "password") {
    openPwdDialog();
  } else if (cmd === "logout") {
    await logout();
  }
};
const onAvatarChange = async (file: any) => {
  if (!file?.raw) return;
  const uid = user.value?.id ?? user.value?.userId ?? user.value?.uid;
  try {
    // 上传文件大小限制
    if (file.size > 10 * 1024 * 1024) {
      ElMessage.error("图片大小不能超过 10MB");
      return;
    }

    const form = new FormData();
    form.append("id", String(getUserId()));
    form.append("pic", file.raw);

    // 使用 request 发送请求，不再手动设置 Content-Type，让浏览器自动设置 boundary
    const res = await request.post("users/upload", form);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error(res?.msg || "上传失败");
      return;
    }
    const url =
      typeof res?.data === "string"
        ? res.data
        : res?.data?.url ?? res?.data?.path ?? res?.data?.avatar ?? "";
    if (url) {
      const finalUrl = (() => {
        const u = normalizeAvatar(url);
        const sep = u.includes("?") ? "&" : "?";
        return `${u}${sep}t=${Date.now()}`;
      })();

      const testImg = new Image();
      testImg.onload = () => {
        profileForm.value.avatar = finalUrl;
        const rawUser = sessionStorage.getItem("merchant_user");
        const u = rawUser ? JSON.parse(rawUser) : {};
        const merged = { ...u, id: getUserId(), icon: finalUrl };
        sessionStorage.setItem("merchant_user", JSON.stringify(merged));
        user.value = merged;
        ElMessage.success(res?.msg || "头像上传成功");
      };
      testImg.onerror = () => {
        const reader = new FileReader();
        reader.onload = () => {
          profileForm.value.avatar = reader.result as string;
          const rawUser2 = sessionStorage.getItem("merchant_user");
          const u2 = rawUser2 ? JSON.parse(rawUser2) : {};
          const merged2 = { ...u2, id: getUserId(), icon: finalUrl };
          sessionStorage.setItem("merchant_user", JSON.stringify(merged2));
          user.value = merged2;
          ElMessage.warning("服务暂不可直接访问头像地址，已使用本地预览");
        };
        reader.readAsDataURL(file.raw);
      };
      testImg.src = finalUrl;
      return;
    }
    // 无返回地址则使用本地预览
    const reader = new FileReader();
    reader.onload = () => {
      profileForm.value.avatar = reader.result as string;
      const rawUser2 = localStorage.getItem("merchant_user");
      const u2 = rawUser2 ? JSON.parse(rawUser2) : {};
      const merged2 = { ...u2, avatar: profileForm.value.avatar };
      localStorage.setItem("merchant_user", JSON.stringify(merged2));
      user.value = merged2;
      ElMessage.success("头像已更新");
    };
    reader.readAsDataURL(file.raw);
  } catch (e: any) {
    // 失败则本地预览
    const reader = new FileReader();
    reader.onload = () => {
      profileForm.value.avatar = reader.result as string;
      ElMessage.error(e?.message || "上传失败，已使用本地预览");
    };
    reader.readAsDataURL(file.raw);
  }
};
const submitProfile = async () => {
  const raw = localStorage.getItem("merchant_user");
  const u = raw ? JSON.parse(raw) : {};
  const merged = {
    ...u,
    username: profileForm.value.username,
    gender: profileForm.value.gender,
    icon: profileForm.value.avatar,
    des: profileForm.value.des,
  };
  try {
    const payload = {
      id: Number(profileForm.value.id || getUserId()),
      username: merged.username,
      gender: merged.gender,
      icon: merged.icon,
      des: merged.des,
    };
    const res = await request.put("users/modifyUser", payload);
    const ok = res?.code === 200 || res?.success === true;
    if (!ok) {
      ElMessage.error(res?.msg || "保存失败");
      return;
    }
    localStorage.setItem(
      "merchant_user",
      JSON.stringify({ ...merged, id: payload.id })
    );
    user.value = { ...merged, id: payload.id };
    ElMessage.success(res?.msg || "保存成功");
  } catch (e: any) {
    ElMessage.error(e?.message || "保存失败");
  }
};
const openPwdDialog = () => {
  pwdForm.value = { oldPWD: "", newPWD: "", newPWD2: "" };
  pwdDialogVisible.value = true;
};
const submitPwd = async () => {
  if (
    !pwdForm.value.oldPWD ||
    !pwdForm.value.newPWD ||
    !pwdForm.value.newPWD2
  ) {
    ElMessage.error("请完整填写密码信息");
    return;
  }
  try {
    const params = {
      id: user.value?.id ?? user.value?.userId ?? 0,
      oldPWD: pwdForm.value.oldPWD,
      newPWD: pwdForm.value.newPWD,
      newPWD2: pwdForm.value.newPWD2,
    };
    const res = await request.put("users/modifyPWD", null, { params });
    const ok = res?.code === 200 || res?.success === true;
    const msg = res?.msg || (ok ? "密码更新成功" : "密码更新失败");
    if (!ok) {
      ElMessage.error(msg);
      return;
    }
    ElMessage.success(msg);
    pwdDialogVisible.value = false;
    sessionStorage.removeItem("merchant_isLoggedIn");
    sessionStorage.removeItem("merchant_user");
    sessionStorage.removeItem("token");
    router.push("/login");
  } catch (e: any) {
    ElMessage.error(e?.message || "密码更新失败");
  }
};
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
.image-preview {
  width: 100%;
  height: 240px; /* 固定高度 */
  margin-bottom: 12px;
  background-color: #f5f7fa;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.slideshow-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
}

.slide-img {
  width: 100%;
  height: 100%;
  object-fit: contain; /* 保持比例 */
}

.slide-indicator {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  pointer-events: none;
}

.next-hint {
  margin-left: 4px;
  font-size: 10px;
  opacity: 0.8;
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
