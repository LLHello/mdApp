<template>
  <div ref="container" :style="{ width, height }" class="lottie-container">
    <div v-show="!loaded" class="lottie-fallback">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import lottie from 'lottie-web'

const props = defineProps({
  path: { type: String, required: true },
  width: { type: String, default: '100%' },
  height: { type: String, default: '100%' },
  loop: { type: Boolean, default: true },
  autoplay: { type: Boolean, default: true }
})

const container = ref<HTMLElement>()
const loaded = ref(false)
let anim: any = null

const init = () => {
  if (!container.value) return
  // Clear previous if any (though container usually empty)
  // container.value.innerHTML = '' // Don't clear slot content wrapper
  
  // Lottie appends SVG, so it won't overwrite the fallback div if we don't clear it.
  // But we want to keep fallback div in DOM but hidden? 
  // Lottie appends to container. So we will have [fallback_div, svg].
  // We control visibility via v-show on fallback.
  
  try {
    anim = lottie.loadAnimation({
      container: container.value,
      renderer: 'svg',
      loop: props.loop,
      autoplay: props.autoplay,
      path: props.path
    })
    
    anim.addEventListener('DOMLoaded', () => {
      loaded.value = true
    })
    
    anim.addEventListener('data_failed', () => {
      loaded.value = false
    })
  } catch (e) {
    console.warn('Lottie load failed', e)
    loaded.value = false
  }
}

onMounted(() => {
  init()
})

onBeforeUnmount(() => {
  anim?.destroy()
})

watch(() => props.path, () => {
  anim?.destroy()
  loaded.value = false
  init()
})
</script>

<style scoped>
.lottie-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lottie-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>