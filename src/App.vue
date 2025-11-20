<template>
  <div class="app-shell">
    <CanvasEditor />
  </div>
</template>

<script setup>
import CanvasEditor from './components/CanvasEditor.vue';
</script>

<style>
:root {
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
  color: #1f2937;
  background: #f5f6fa;
}

* {
  box-sizing: border-box;
}

body, #app {
  margin: 0;
  min-height: 100vh;
  background: #f5f6fa;
}

.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>