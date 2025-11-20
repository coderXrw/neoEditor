<template>
  <div class="editor-shell">
    <header class="top-bar">
      <div class="brand">NeoCanvas 编辑器</div>
      <div class="preset-group">
        <label>画布尺寸</label>
        <select v-model="selectedPreset" @change="applyPreset">
          <option v-for="preset in PRESETS" :key="preset.id" :value="preset.id">
            {{ preset.label }}
          </option>
        </select>
        <div class="size-inputs">
          <div>
            <span>W</span>
            <input type="number" :value="boardConfig.width" readonly disabled />
          </div>
          <div>
            <span>H</span>
            <input type="number" :value="boardConfig.height" readonly disabled />
          </div>
          <label class="lock muted">
            固定比例
          </label>
        </div>
      </div>
      <div class="top-actions">
        <div class="action-group">
          <label class="ghost upload-label">
            上传图片
            <input type="file" accept="image/*" @change="onUploadImage" />
          </label>
          <button class="ghost" @click="enableDrawMode" :disabled="isDrawingMask || !currentImage">画笔选区</button>
          <button class="ghost" @click="cropImage" :disabled="!maskPath || !currentImage">抠图</button>
        </div>
        <div class="action-group">
          <button class="ghost" :disabled="!canUndo" @click="undo">撤销</button>
          <button class="ghost" :disabled="!canRedo" @click="redo">重做</button>
          <button class="ghost" @click="addTextbox">添加文本</button>
          <button class="ghost" @click="clearCanvas">清空</button>
        </div>
      </div>
    </header>

    <section class="editor-content">
      <aside class="asset-panel">
        <div class="asset-search">
          <input v-model.trim="assetState.keyword" type="text" placeholder="搜索素材" />
        </div>
        <div class="asset-tabs">
          <button
            v-for="category in assetCategories"
            :key="category.id"
            :class="{ active: assetState.activeCategory === category.id }"
            @click="assetState.activeCategory = category.id"
          >
            {{ category.name }}
          </button>
        </div>
        <div class="asset-list">
          <div
            v-for="asset in filteredAssets"
            :key="asset.id"
            class="asset-card"
            :title="asset.description"
            @click="handleAssetClick(asset)"
          >
            <div class="asset-thumb">
              <img v-if="asset.preview" :src="asset.preview" :alt="asset.name" />
              <div v-else class="asset-placeholder">{{ asset.name.charAt(0) }}</div>
            </div>
            <div class="asset-name">{{ asset.name }}</div>
          </div>
        </div>
      </aside>

      <main class="canvas-stack">
        <div class="stage-toolbar">
          <label>
            <input type="checkbox" v-model="boardConfig.showGrid" /> 显示网格
          </label>
          <label>
            <input type="checkbox" v-model="snapEnabled" /> 吸附对齐
          </label>
          <div class="zoom-control">
            <span>缩放</span>
            <input type="range" min="5" max="800" v-model.number="zoomPercent" @input="applyZoom(zoomPercent)" />
            <span>{{ zoomPercent }}%</span>
          </div>
        </div>
        <div class="stage-wrapper" ref="stageWrapperRef">
          <div class="canvas-with-rulers">
            <div class="ruler-horizontal">
              <canvas ref="rulerTopRef"></canvas>
            </div>
            <div class="ruler-body">
              <div class="ruler-vertical">
                <canvas ref="rulerLeftRef"></canvas>
              </div>
              <div class="board-wrapper" :style="boardWrapperStyle">
                <div class="stage-board" :class="{ 'grid-on': boardConfig.showGrid }" :style="boardStyle">
                  <canvas ref="canvasRef"></canvas>
                  <div v-if="guideState.x !== null" class="guide-line guide-y" :style="{ left: guideState.x + 'px' }"></div>
                  <div v-if="guideState.y !== null" class="guide-line guide-x" :style="{ top: guideState.y + 'px' }"></div>
                  <div
                    v-if="activeObject"
                    class="fast-menu"
                    :style="fastMenuStyle"
                  >
                    <button @click="duplicateActiveObject">创建副本</button>
                    <button @click="deleteActiveObject">删除</button>
                    <button @click="toggleActiveLock">
                      {{ selectionState.locked ? '解锁' : '锁定' }}
                    </button>
                    <button @click="moveLayer('up')">上移</button>
                    <button @click="moveLayer('down')">下移</button>
                    <button @click="moveLayer('top')">置顶</button>
                    <button @click="moveLayer('bottom')">置底</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <aside class="property-panel">
        <div class="panel-section">
          <div class="section-title">通用属性</div>
          <div v-if="!activeObject" class="empty-tip">请选择画布中的对象</div>
          <div v-else class="form-grid">
            <label>X</label>
            <input type="number" :value="selectionState.x" @input="updateGeneral('x', $event.target.value)" />
            <label>Y</label>
            <input type="number" :value="selectionState.y" @input="updateGeneral('y', $event.target.value)" />
            <label>宽</label>
            <input type="number" :value="selectionState.width" @input="updateGeneral('width', $event.target.value)" />
            <label>高</label>
            <input type="number" :value="selectionState.height" @input="updateGeneral('height', $event.target.value)" />
            <label>透明度</label>
            <input type="number" min="0" max="100" :value="selectionState.opacity" @input="updateGeneral('opacity', $event.target.value)" />
            <label>旋转</label>
            <input type="number" :value="selectionState.angle" @input="updateGeneral('angle', $event.target.value)" />
            <label>层级</label>
            <div class="stack-buttons">
              <button @click="moveLayer('up')">上移</button>
              <button @click="moveLayer('down')">下移</button>
              <button @click="moveLayer('top')">置顶</button>
              <button @click="moveLayer('bottom')">置底</button>
            </div>
            <label>锁定</label>
            <input type="checkbox" :checked="selectionState.locked" @change="toggleLock($event.target.checked)" />
            <label>可见</label>
            <input type="checkbox" :checked="selectionState.visible" @change="toggleVisibility($event.target.checked)" />
          </div>
        </div>

        <div v-if="activeObject?.type === 'image'" class="panel-section">
          <div class="section-title">图片属性</div>
          <div class="form-grid">
            <label>替换图片</label>
            <input type="file" accept="image/*" @change="replaceImage" />
            <label>填充模式</label>
            <select :value="selectionState.imageFit" @change="applyImageFit($event.target.value)">
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
            </select>
            <label>圆角</label>
            <input type="number" min="0" :value="selectionState.cornerRadius" @input="applyCornerRadius($event.target.value)" />
            <label>阴影模糊</label>
            <input type="number" min="0" :value="selectionState.shadowBlur" @input="applyShadow('blur', $event.target.value)" />
            <label>阴影颜色</label>
            <input type="color" :value="selectionState.shadowColor" @input="applyShadow('color', $event.target.value)" />
            <label>裁剪 X</label>
            <input type="number" min="0" :value="selectionState.clipX" @input="applyCrop('x', $event.target.value)" />
            <label>裁剪 Y</label>
            <input type="number" min="0" :value="selectionState.clipY" @input="applyCrop('y', $event.target.value)" />
            <label>翻转</label>
            <div class="stack-buttons">
              <button @click="flipImage('x')">水平</button>
              <button @click="flipImage('y')">垂直</button>
            </div>
          </div>
        </div>

        <div v-if="activeObject?.type === 'textbox'" class="panel-section">
          <div class="section-title">文本属性</div>
          <div class="form-grid">
            <label>内容</label>
            <textarea rows="3" :value="selectionState.textContent" @input="updateText('text', $event.target.value)"></textarea>
            <label>字体</label>
            <input type="text" :value="selectionState.fontFamily" @input="updateText('fontFamily', $event.target.value)" />
            <label>字号</label>
            <input type="number" min="8" :value="selectionState.fontSize" @input="updateText('fontSize', $event.target.value)" />
            <label>文本颜色</label>
            <input type="color" :value="selectionState.textColor" @input="updateText('fill', $event.target.value)" />
            <label>行高</label>
            <input type="number" step="0.1" :value="selectionState.lineHeight" @input="updateText('lineHeight', $event.target.value)" />
            <label>字间距</label>
            <input type="number" :value="selectionState.charSpacing" @input="updateText('charSpacing', $event.target.value)" />
            <label>对齐</label>
            <select :value="selectionState.textAlign" @change="updateText('textAlign', $event.target.value)">
              <option value="left">左对齐</option>
              <option value="center">居中</option>
              <option value="right">右对齐</option>
              <option value="justify">两端对齐</option>
            </select>
            <label>样式</label>
            <div class="stack-buttons">
              <button @click="toggleTextStyle('bold')" :class="{ active: selectionState.fontWeight === 'bold' }">B</button>
              <button @click="toggleTextStyle('italic')" :class="{ active: selectionState.fontStyle === 'italic' }">I</button>
              <button @click="toggleTextStyle('underline')" :class="{ active: selectionState.underline }">U</button>
            </div>
            <label>背景色</label>
            <input type="color" :value="selectionState.textBackground" @input="updateText('backgroundColor', $event.target.value)" />
            <label>自动换行</label>
            <input type="checkbox" :checked="selectionState.autoWrap" @change="toggleAutoWrap($event.target.checked)" />
            <label>锁定尺寸</label>
            <input type="checkbox" :checked="selectionState.lockTextboxSize" @change="toggleTextboxSize($event.target.checked)" />
          </div>
        </div>

        <div v-if="isShape" class="panel-section">
          <div class="section-title">图形属性</div>
          <div class="form-grid">
            <label>填充色</label>
            <input type="color" :value="selectionState.fill" @input="updateShape('fill', $event.target.value)" />
            <label>边框色</label>
            <input type="color" :value="selectionState.stroke" @input="updateShape('stroke', $event.target.value)" />
            <label>边框宽度</label>
            <input type="number" min="0" :value="selectionState.strokeWidth" @input="updateShape('strokeWidth', $event.target.value)" />
            <label>圆角</label>
            <input type="number" min="0" :value="selectionState.cornerRadius" @input="updateShape('radius', $event.target.value)" />
            <label>阴影模糊</label>
            <input type="number" min="0" :value="selectionState.shadowBlur" @input="applyShadow('blur', $event.target.value)" />
            <label>阴影颜色</label>
            <input type="color" :value="selectionState.shadowColor" @input="applyShadow('color', $event.target.value)" />
            <label>边框样式</label>
            <select @change="updateShape('dash', $event.target.value)">
              <option value="solid">实线</option>
              <option value="dashed">虚线</option>
            </select>
          </div>
        </div>
      </aside>
    </section>

    <footer class="layer-panel">
      <div class="layer-header">
        <div class="title">图层</div>
        <div class="layer-tools">
          <button :disabled="!canGroup" @click="groupSelection">组合</button>
          <button :disabled="!canUngroup" @click="ungroupSelection">拆分</button>
        </div>
      </div>
      <div class="layer-list" @dragover.prevent>
        <div
          v-for="layer in layers"
          :key="layer.id"
          class="layer-row"
          :class="{ active: layer.id === selectionState.id }"
          draggable="true"
          @dragstart="handleLayerDragStart(layer.id)"
          @dragover.prevent
          @drop="handleLayerDrop(layer.id)"
          @dragend="handleLayerDragEnd"
        >
          <div class="layer-info" @click="selectLayer(layer.id)">
            <div class="layer-name">{{ layer.name }}</div>
            <small>{{ layer.type }}</small>
          </div>
          <div class="layer-actions">
            <button @click.stop="toggleLayerVisibility(layer.id)">
              {{ layer.visible ? '👁' : '🚫' }}
            </button>
            <button @click.stop="toggleLayerLock(layer.id)">
              {{ layer.locked ? '🔒' : '🔓' }}
            </button>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import * as fabric from 'fabric';
import assetCategories from '../data/assetLibrary';

const canvasRef = ref(null);
const rulerTopRef = ref(null);
const rulerLeftRef = ref(null);
const stageWrapperRef = ref(null);
const canvas = ref(null);
const assetState = reactive({
  keyword: '',
  activeCategory: assetCategories[0]?.id ?? '',
  previews: {}
});
const snapEnabled = ref(true);
const zoomPercent = ref(100);
const guideState = reactive({ x: null, y: null });
const activeObject = ref(null);
const layers = ref([]);
const dragLayerId = ref(null);
const lastImageObject = ref(null);
const maskPath = ref(null);
const isDrawingMask = ref(false);
const keydownHandler = (event) => handleKeydown(event);
const viewportSize = reactive({ width: 0, height: 0 });
const autoFitScale = ref(1);
let resizeObserver = null;

const PRESETS = [
  { id: 'fixed-1080-720', label: '固定 1080×720', width: 1080, height: 720 }
];
const selectedPreset = ref(PRESETS[0].id);
const boardConfig = reactive({
  width: PRESETS[0].width,
  height: PRESETS[0].height,
  backgroundColor: '#ffffff',
  lockRatio: true,
  showGrid: true
});
const boardVisualBackground = ref('#ffffff');

const SERIALIZE_FIELDS = ['customId', 'layerName', 'libType'];
const history = reactive({ list: [], pointer: -1, locked: false });
let snapshotTimer = null;
let elementSeed = 1;

const selectionState = reactive({
  id: '',
  type: '',
  name: '',
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  opacity: 100,
  angle: 0,
  visible: true,
  locked: false,
  fill: '#ffffff',
  stroke: '#111111',
  strokeWidth: 1,
  cornerRadius: 0,
  shadowBlur: 0,
  shadowColor: '#00000033',
  fontFamily: 'Arial',
  fontSize: 48,
  lineHeight: 1.3,
  charSpacing: 0,
  textAlign: 'left',
  fontWeight: 'normal',
  fontStyle: 'normal',
  underline: false,
  textColor: '#111111',
  textBackground: '#ffffff00',
  autoWrap: true,
  lockTextboxSize: false,
  imageFit: 'contain',
  clipX: 0,
  clipY: 0,
  textContent: ''
});

const filteredAssets = computed(() => {
  const category = assetCategories.find(item => item.id === assetState.activeCategory);
  if (!category) return [];
  const keyword = assetState.keyword.toLowerCase();
  return category.assets
    .filter(asset => {
      if (!keyword) return true;
      const value = `${asset.name}${asset.description || ''}`.toLowerCase();
      return value.includes(keyword);
    })
    .map(asset => ({
      ...asset,
      categoryType: category.type,
      preview: assetState.previews[asset.id] || (asset.url && asset.url.startsWith('http') ? asset.url : '')
    }));
});

const isShape = computed(() => {
  if (!activeObject.value) return false;
  return ['rect', 'circle', 'ellipse', 'triangle', 'line'].includes(activeObject.value.type);
});

const canUndo = computed(() => history.pointer > 0);
const canRedo = computed(() => history.pointer >= 0 && history.pointer < history.list.length - 1);
const canGroup = computed(() => {
  const active = canvas.value?.getActiveObject();
  return active?.type === 'activeSelection';
});
const canUngroup = computed(() => {
  const active = canvas.value?.getActiveObject();
  return active?.type === 'group';
});

const currentImage = computed(() => {
  if (activeObject.value?.type === 'image') {
    return activeObject.value;
  }
  return lastImageObject.value;
});

const displayWidth = computed(() => boardConfig.width);
const displayHeight = computed(() => boardConfig.height);
const boardWrapperStyle = computed(() => ({
  width: `${boardConfig.width}px`,
  height: `${boardConfig.height}px`
}));

const boardStyle = computed(() => ({
  width: `${boardConfig.width}px`,
  height: `${boardConfig.height}px`,
  background: boardVisualBackground.value
}));

const fastMenuStyle = computed(() => {
  if (!activeObject.value || !canvas.value) return { display: 'none' };
  // 依赖 zoomPercent 以在缩放时重新计算
  void zoomPercent.value;

  const padding = 8;
  const rect = activeObject.value.getBoundingRect(true, true);
  const vpt = canvas.value.viewportTransform ?? [1, 0, 0, 1, 0, 0];

  const topLeft = fabric.util.transformPoint(new fabric.Point(rect.left, rect.top), vpt);
  const bottomRight = fabric.util.transformPoint(
    new fabric.Point(rect.left + rect.width, rect.top + rect.height),
    vpt
  );

  const menuTop = Math.max(padding, Math.min(topLeft.y, bottomRight.y) - 56);
  const centerX = (topLeft.x + bottomRight.x) / 2;
  const clampedLeft = Math.min(
    boardConfig.width - padding,
    Math.max(padding, centerX)
  );
  return {
    top: `${menuTop}px`,
    left: `${clampedLeft}px`
  };
});

onMounted(() => {
  initCanvas();
  preloadAssets();
  setupStageResizeObserver();
  updateAutoFitScale();
  window.addEventListener('keydown', keydownHandler);
});

onBeforeUnmount(() => {
  canvas.value?.dispose();
  clearTimeout(snapshotTimer);
  window.removeEventListener('keydown', keydownHandler);
  if (resizeObserver && stageWrapperRef.value) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

watch(
  () => [boardConfig.width, boardConfig.height],
  () => {
    updateAutoFitScale();
  }
);

function initCanvas() {
  canvas.value = new fabric.Canvas(canvasRef.value, {
    width: boardConfig.width,
    height: boardConfig.height,
    backgroundColor: boardConfig.backgroundColor,
    preserveObjectStacking: true,
    selection: true
  });

  fabric.Object.prototype.set({
    transparentCorners: false,
    cornerColor: '#2563eb',
    cornerStyle: 'circle',
    borderColor: '#2563eb',
    cornerSize: 12,
    hasControls: true,
    hasBorders: true,
    perPixelTargetFind: true
  });
  fabric.Object.prototype.setControlsVisibility({
    mt: true,
    mb: true,
    ml: true,
    mr: true,
    tl: true,
    tr: true,
    bl: true,
    br: true,
    mtr: true
  });
  canvas.value.selectionColor = 'rgba(37,99,235,0.08)';
  canvas.value.selectionBorderColor = '#2563eb';
  canvas.value.selectionLineWidth = 1.5;
  canvas.value.selectionDashArray = [6, 4];

  ['object:added', 'object:modified', 'object:removed'].forEach((eventName) => {
    canvas.value.on(eventName, (evt) => handleCanvasMutated(eventName, evt));
  });
  canvas.value.on('object:scaling', updateSelectionFromActive);
  canvas.value.on('object:rotating', updateSelectionFromActive);
  canvas.value.on('selection:created', handleSelectionChange);
  canvas.value.on('selection:updated', handleSelectionChange);
  canvas.value.on('selection:cleared', () => {
    activeObject.value = null;
    syncSelectionState(null);
  });
  canvas.value.on('object:moving', handleObjectMoving);
  canvas.value.on('mouse:wheel', handleWheel);
  canvas.value.on('mouse:dblclick', handleDoubleClick);
  canvas.value.on('text:changed', handleTextChanged);

  snapshotHistory();
}

function setupStageResizeObserver() {
  viewportSize.width = boardConfig.width;
  viewportSize.height = boardConfig.height;
  autoFitScale.value = 1;
}

function updateAutoFitScale() {
  autoFitScale.value = 1;
  updateCanvasZoom();
}

function updateCanvasZoom(point) {
  if (!canvas.value) return;
  const manualZoom = Math.min(800, Math.max(5, zoomPercent.value));
  const zoom = manualZoom / 100;
  const target = point || new fabric.Point(canvas.value.getWidth() / 2, canvas.value.getHeight() / 2);
  canvas.value.zoomToPoint(target, zoom);
  canvas.value.requestRenderAll();
  drawRulers();
}

function drawRulers() {
  drawHorizontalRuler();
  drawVerticalRuler();
}

function drawHorizontalRuler() {
  const canvasEl = rulerTopRef.value;
  if (!canvasEl) return;
  const width = Math.floor(displayWidth.value);
  canvasEl.width = width;
  canvasEl.height = 24;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, width, 24);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, 24);
  ctx.strokeStyle = '#cbd5f5';
  ctx.beginPath();
  const zoom = canvas.value?.getZoom() ?? 1;
  const step = Math.max(20, 50 * zoom);
  for (let x = 0; x <= width; x += step) {
    const longTick = (x / step) % 2 === 0;
    ctx.moveTo(x + 0.5, 24);
    ctx.lineTo(x + 0.5, longTick ? 0 : 12);
  }
  ctx.stroke();
  ctx.fillStyle = '#64748b';
  ctx.font = '10px Inter, sans-serif';
  const labelStep = step * 2;
  for (let x = 0; x <= width; x += labelStep) {
    const value = Math.round(x / zoom);
    ctx.fillText(value.toString(), x + 4, 16);
  }
}

function drawVerticalRuler() {
  const canvasEl = rulerLeftRef.value;
  if (!canvasEl) return;
  const height = Math.floor(displayHeight.value);
  canvasEl.width = 24;
  canvasEl.height = height;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, 24, height);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 24, height);
  ctx.strokeStyle = '#cbd5f5';
  ctx.beginPath();
  const zoom = canvas.value?.getZoom() ?? 1;
  const step = Math.max(20, 50 * zoom);
  for (let y = 0; y <= height; y += step) {
    const longTick = (y / step) % 2 === 0;
    ctx.moveTo(24, y + 0.5);
    ctx.lineTo(longTick ? 0 : 12, y + 0.5);
  }
  ctx.stroke();
  ctx.save();
  ctx.fillStyle = '#64748b';
  ctx.font = '10px Inter, sans-serif';
  const labelStep = step * 2;
  for (let y = 0; y <= height; y += labelStep) {
    const value = Math.round(y / zoom);
    ctx.save();
    ctx.translate(12, y + 12);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(value.toString(), 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function preloadAssets() {
  assetCategories.forEach(category => {
    category.assets.forEach(asset => {
      if (!asset.url || !asset.url.startsWith('http')) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        assetState.previews[asset.id] = asset.url;
      };
      img.onerror = () => {
        assetState.previews[asset.id] = '';
      };
      img.src = asset.url;
    });
  });
}

function handleAssetClick(asset) {
  switch (asset.categoryType) {
    case 'image':
    case 'sticker':
      addImageAsset(asset.url, asset.categoryType === 'sticker');
      break;
    case 'background':
      applyBackground(asset);
      break;
    case 'shape':
      addShapeAsset(asset);
      break;
    case 'text':
      addTextTemplate(asset);
      break;
    case 'component':
      addComponent(asset);
      break;
    default:
      break;
  }
}

async function addImageAsset(url, isSticker = false) {
  if (!canvas.value) return;
  try {
    const img = await fabric.Image.fromURL(url, { crossOrigin: 'anonymous' });
    placeImageOnCanvas(img, isSticker ? '贴纸' : '图片');
  } catch (error) {
    console.error('素材加载失败', error);
  }
}

async function applyBackground(asset) {
  if (!canvas.value) return;
  if (asset.url?.startsWith('http')) {
    try {
      const img = await fabric.Image.fromURL(asset.url, { crossOrigin: 'anonymous' });
      const scale = Math.max(
        boardConfig.width / (img.width || 1),
        boardConfig.height / (img.height || 1)
      );
      canvas.value.setBackgroundImage(img, canvas.value.renderAll.bind(canvas.value), {
        scaleX: scale,
        scaleY: scale
      });
      boardVisualBackground.value = '#ffffff';
      scheduleSnapshot();
    } catch (error) {
      console.error('背景加载失败', error);
    }
    return;
  }
  if (asset.url?.startsWith('linear-gradient')) {
    const gradient = resolveFill(asset.url, boardConfig.width, boardConfig.height);
    boardVisualBackground.value = asset.url;
    canvas.value.setBackgroundImage(null, canvas.value.renderAll.bind(canvas.value));
    canvas.value.setBackgroundColor(gradient, canvas.value.renderAll.bind(canvas.value));
    scheduleSnapshot();
    return;
  }
  boardConfig.backgroundColor = asset.url;
  boardVisualBackground.value = asset.url;
  canvas.value.setBackgroundColor(asset.url, canvas.value.renderAll.bind(canvas.value));
  scheduleSnapshot();
}

function addShapeAsset(asset) {
  if (!canvas.value) return;
  const options = { ...asset.options };
  let obj = null;
  switch (asset.shape) {
    case 'rect':
      obj = new fabric.Rect({
        width: options.width || 200,
        height: options.height || 120,
        fill: resolveFill(options.fill, options.width || 200, options.height || 120),
        rx: options.rx || 0,
        ry: options.ry || 0
      });
      break;
    case 'circle':
      obj = new fabric.Circle({
        radius: options.radius || 100,
        fill: resolveFill(options.fill, (options.radius || 100) * 2, (options.radius || 100) * 2)
      });
      break;
    case 'triangle':
      obj = new fabric.Triangle({
        width: options.width || 160,
        height: options.height || 160,
        fill: resolveFill(options.fill, options.width || 160, options.height || 160)
      });
      break;
    default:
      obj = new fabric.Rect({ width: 200, height: 200, fill: '#d9e3ff' });
  }
  if (!obj) return;
  obj.set({
    left: (boardConfig.width - (obj.width || 0)) / 2,
    top: (boardConfig.height - (obj.height || 0)) / 2
  });
  assignMetadata(obj, '图形');
  canvas.value.add(obj);
  canvas.value.setActiveObject(obj);
  canvas.value.requestRenderAll();
  scheduleSnapshot();
}

function resolveFill(value, width = 200, height = 200) {
  if (!value) return '#d1d5db';
  if (typeof value === 'string' && value.startsWith('linear-gradient')) {
    const colors = value.match(/#[0-9a-fA-F]{6}/g);
    if (!colors) return '#d1d5db';
    return new fabric.Gradient({
      type: 'linear',
      coords: { x1: 0, y1: 0, x2: width, y2: height },
      colorStops: colors.map((color, index) => ({ offset: colors.length === 1 ? 0 : index / (colors.length - 1), color }))
    });
  }
  return value;
}

function addTextTemplate(asset) {
  if (!canvas.value) return;
  const title = new fabric.Textbox(asset.template.title, {
    fontSize: 72,
    fontWeight: '700',
    fill: asset.template.colors?.[0] || '#111',
    fontFamily: asset.template.fontFamily || 'Arial',
    width: 600,
    textAlign: 'left'
  });
  const subtitle = new fabric.Textbox(asset.template.subtitle, {
    fontSize: 32,
    fill: asset.template.colors?.[1] || '#666',
    fontFamily: asset.template.fontFamily || 'Arial',
    top: title.height + 24,
    width: 600
  });
  const group = new fabric.Group([title, subtitle], {
    left: (boardConfig.width - 600) / 2,
    top: boardConfig.height / 3
  });
  assignMetadata(group, '文本模板');
  canvas.value.add(group);
  canvas.value.setActiveObject(group);
  canvas.value.requestRenderAll();
  scheduleSnapshot();
}

function addComponent(asset) {
  if (!canvas.value) return;
  if (asset.structure === 'card') {
    const card = new fabric.Rect({
      width: 620,
      height: 360,
      fill: '#ffffff',
      rx: 32,
      ry: 32,
      shadow: { color: 'rgba(15,23,42,0.15)', blur: 40, offsetX: 0, offsetY: 24 }
    });
    const title = new fabric.Textbox('新品发布', { fontSize: 48, fontWeight: '600', width: 520, left: -220, top: -120, textAlign: 'left', fill: '#111827' });
    const desc = new fabric.Textbox('立即体验全新模板与素材库。', { fontSize: 24, width: 520, left: -220, top: -50, fill: '#6b7280' });
    const button = new fabric.Rect({ width: 220, height: 64, fill: '#2563eb', rx: 14, ry: 14, left: -220, top: 40 });
    const btnText = new fabric.Textbox('开始创作', { fontSize: 28, fill: '#fff', width: 200, left: -210, top: 52, textAlign: 'center' });
    const group = new fabric.Group([card, title, desc, button, btnText], {
      left: (boardConfig.width - 620) / 2,
      top: (boardConfig.height - 360) / 2
    });
    assignMetadata(group, '组件');
    canvas.value.add(group);
    canvas.value.setActiveObject(group);
    canvas.value.requestRenderAll();
    scheduleSnapshot();
  }
}

function addTextbox() {
  if (!canvas.value) return;
  const textbox = new fabric.Textbox('双击编辑文本', {
    left: boardConfig.width / 2 - 150,
    top: boardConfig.height / 2,
    fontSize: 48,
    fill: '#111',
    width: 300
  });
  assignMetadata(textbox, '文本');
  canvas.value.add(textbox);
  canvas.value.setActiveObject(textbox);
  canvas.value.requestRenderAll();
  scheduleSnapshot();
}

function placeImageOnCanvas(img, prefix) {
  if (!canvas.value) return;
  const width = img.width || 1;
  const height = img.height || 1;
  const availableWidth = Math.max(boardConfig.width - 80, 200);
  const availableHeight = Math.max(boardConfig.height - 80, 200);
  const scale = Math.min(availableWidth / width, availableHeight / height, 1);
  img.set({
    left: (boardConfig.width - width * scale) / 2,
    top: (boardConfig.height - height * scale) / 2,
    scaleX: scale,
    scaleY: scale,
    selectable: true,
    crossOrigin: img.crossOrigin ?? 'anonymous'
  });
  assignMetadata(img, prefix);
  canvas.value.add(img);
  canvas.value.setActiveObject(img);
  canvas.value.requestRenderAll();
  lastImageObject.value = img;
  clearMaskPath();
  scheduleSnapshot();
}

function clearMaskPath() {
  if (maskPath.value && canvas.value) {
    canvas.value.remove(maskPath.value);
    maskPath.value = null;
  }
}

function onUploadImage(event) {
  const file = event.target?.files?.[0];
  if (!file || !canvas.value) return;
  const reader = new FileReader();
  reader.onload = async (loadEvent) => {
    try {
      const img = await fabric.Image.fromURL(loadEvent.target?.result, { crossOrigin: 'anonymous' });
      placeImageOnCanvas(img, '上传图片');
    } catch (error) {
      console.error('上传图片加载失败', error);
      window.alert('图片加载失败，请重试');
    }
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function enableDrawMode() {
  if (!canvas.value) return;
  if (!currentImage.value) {
    window.alert('请先添加并选中需要抠图的图片');
    return;
  }
  if (isDrawingMask.value) return;
  clearMaskPath();
  canvas.value.discardActiveObject();
  canvas.value.selection = false;
  canvas.value.isDrawingMode = true;
  isDrawingMask.value = true;
  const brush = canvas.value.freeDrawingBrush || new fabric.PencilBrush(canvas.value);
  canvas.value.freeDrawingBrush = brush;
  brush.width = 3;
  brush.color = '#f97316';
  const handlePathCreated = (opt) => {
    canvas.value.isDrawingMode = false;
    canvas.value.selection = true;
    isDrawingMask.value = false;
    maskPath.value = opt.path;
    maskPath.value.excludeFromHistory = true;
    maskPath.value.excludeFromLayerPanel = true;
    maskPath.value.selectable = false;
    maskPath.value.evented = false;
    maskPath.value.stroke = '#f97316';
    maskPath.value.strokeWidth = 2;
    maskPath.value.fill = 'rgba(249,115,22,0.15)';
    canvas.value.off('path:created', handlePathCreated);
  };
  canvas.value.on('path:created', handlePathCreated);
}

function cropImage() {
  if (!canvas.value) return;
  const img = currentImage.value;
  if (!img) {
    window.alert('请先选中需要抠图的图片');
    return;
  }
  if (!maskPath.value) {
    window.alert('请先使用画笔圈选抠图区域');
    return;
  }
  const scaledWidth = (img.width || 0) * (img.scaleX || 1);
  const scaledHeight = (img.height || 0) * (img.scaleY || 1);
  if (!scaledWidth || !scaledHeight) return;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = scaledWidth;
  tempCanvas.height = scaledHeight;
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) return;

  const pathObj = maskPath.value;
  const rawPath = pathObj.path?.map((seg) => seg.join(' ')).join(' ') || '';
  if (!rawPath) return;
  const closedPath = /Z$/i.test(rawPath.trim()) ? rawPath : `${rawPath} Z`;
  const transform = `translate(${-(img.left || 0)},${-(img.top || 0)}) scale(${pathObj.scaleX || 1},${pathObj.scaleY || 1})`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${scaledWidth}' height='${scaledHeight}'><path d='${closedPath}' fill='white' stroke='none' transform='${transform}'/></svg>`;
  const maskImage = new window.Image();
  maskImage.onload = () => {
    ctx.clearRect(0, 0, scaledWidth, scaledHeight);
    ctx.drawImage(maskImage, 0, 0, scaledWidth, scaledHeight);
    ctx.globalCompositeOperation = 'source-in';
    const element = img.getElement ? img.getElement() : img._element;
    ctx.drawImage(
      element,
      0,
      0,
      img.width || scaledWidth,
      img.height || scaledHeight,
      0,
      0,
      scaledWidth,
      scaledHeight
    );
    const resultUrl = tempCanvas.toDataURL('image/png');
    const previewImage = new window.Image();
    previewImage.onload = () => {
      const croppedImg = new fabric.Image(previewImage, {
        left: img.left,
        top: img.top,
        angle: img.angle,
        opacity: img.opacity
      });
      const index = canvas.value.getObjects().indexOf(img);
      canvas.value.remove(img);
      croppedImg.customId = img.customId || croppedImg.customId;
      croppedImg.layerName = img.layerName || croppedImg.layerName;
      croppedImg.libType = img.libType || '图片';
      canvas.value.insertAt(croppedImg, Math.max(index, 0));
      canvas.value.setActiveObject(croppedImg);
      canvas.value.requestRenderAll();
      lastImageObject.value = croppedImg;
      clearMaskPath();
      scheduleSnapshot();
    };
    previewImage.onerror = () => window.alert('生成抠图结果失败，请重试');
    previewImage.src = resultUrl;
  };
  maskImage.onerror = () => window.alert('遮罩生成失败，请重新圈选');
  maskImage.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function handleCanvasMutated(eventName, event) {
  const target = event?.target;
  if (target?.excludeFromHistory) {
    if (eventName === 'object:removed' && target === maskPath.value) {
      maskPath.value = null;
    }
    return;
  }
  if (target?.type === 'image' && eventName !== 'object:removed') {
    lastImageObject.value = target;
  }
  if (eventName === 'object:removed' && target === lastImageObject.value) {
    lastImageObject.value = null;
  }
  refreshLayers();
  scheduleSnapshot();
}

function scheduleSnapshot() {
  if (history.locked) return;
  clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => snapshotHistory(), 200);
}

function snapshotHistory() {
  if (!canvas.value) return;
  const json = canvas.value.toJSON(SERIALIZE_FIELDS);
  history.list = history.list.slice(0, history.pointer + 1);
  history.list.push(json);
  if (history.list.length > 60) {
    history.list.shift();
  }
  history.pointer = history.list.length - 1;
}

function undo() {
  if (!canUndo.value) return;
  history.locked = true;
  history.pointer -= 1;
  loadHistory(history.list[history.pointer]);
}

function redo() {
  if (!canRedo.value) return;
  history.locked = true;
  history.pointer += 1;
  loadHistory(history.list[history.pointer]);
}

function loadHistory(snapshot) {
  if (!canvas.value) return;
  canvas.value.loadFromJSON(snapshot, () => {
    canvas.value.renderAll();
    history.locked = false;
    refreshLayers();
    const active = canvas.value.getActiveObject();
    syncSelectionState(active || null);
  });
}

function handleSelectionChange(event) {
  activeObject.value = event.selected?.[0] || event.target || null;
  syncSelectionState(activeObject.value);
  if (activeObject.value?.type === 'image') {
    lastImageObject.value = activeObject.value;
  }
}

function syncSelectionState(obj) {
  if (!obj) {
    Object.assign(selectionState, {
      id: '',
      type: '',
      name: '',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      opacity: 100,
      angle: 0,
      visible: true,
      locked: false,
      textContent: ''
    });
    return;
  }
  selectionState.id = obj.customId || '';
  selectionState.type = obj.type;
  selectionState.name = obj.layerName || obj.type;
  selectionState.x = Math.round(obj.left || 0);
  selectionState.y = Math.round(obj.top || 0);
  selectionState.width = Math.round(obj.getScaledWidth());
  selectionState.height = Math.round(obj.getScaledHeight());
  selectionState.opacity = Math.round((obj.opacity ?? 1) * 100);
  selectionState.angle = Math.round(obj.angle || 0);
  selectionState.visible = obj.visible !== false;
  selectionState.locked = !!obj.lockMovementX;
  selectionState.cornerRadius = obj.rx || 0;
  selectionState.shadowBlur = obj.shadow?.blur || 0;
  selectionState.shadowColor = obj.shadow?.color || '#00000033';
  selectionState.clipX = obj.cropX || 0;
  selectionState.clipY = obj.cropY || 0;
  if (obj.type === 'textbox') {
    selectionState.fontFamily = obj.fontFamily || 'Arial';
    selectionState.fontSize = obj.fontSize || 48;
    selectionState.textColor = obj.fill || '#111';
    selectionState.lineHeight = obj.lineHeight || 1.2;
    selectionState.charSpacing = obj.charSpacing || 0;
    selectionState.textAlign = obj.textAlign || 'left';
    selectionState.fontWeight = obj.fontWeight || 'normal';
    selectionState.fontStyle = obj.fontStyle || 'normal';
    selectionState.underline = !!obj.underline;
    selectionState.textBackground = obj.textBackgroundColor || '#ffffff00';
    selectionState.autoWrap = obj.width < 150 ? false : true;
    selectionState.lockTextboxSize = !!(obj.lockScalingX && obj.lockScalingY);
    selectionState.textContent = obj.text || '';
  }
  if (['rect', 'circle', 'ellipse', 'triangle', 'line'].includes(obj.type)) {
    selectionState.fill = typeof obj.fill === 'string' ? obj.fill : '#d1d5db';
    selectionState.stroke = obj.stroke || '#111';
    selectionState.strokeWidth = obj.strokeWidth || 1;
  }
}

function assignMetadata(obj, prefix) {
  if (!obj.customId) {
    obj.customId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  obj.layerName = `${prefix} ${elementSeed++}`;
  obj.libType = prefix;
}

function updateSelectionFromActive() {
  if (activeObject.value) {
    syncSelectionState(activeObject.value);
  }
}

function handleObjectMoving(event) {
  if (!snapEnabled.value) return;
  const obj = event.target;
  if (!obj) return;
  const threshold = 5;
  const width = boardConfig.width;
  const height = boardConfig.height;
  const center = obj.getCenterPoint();
  let verticalSnap = false;
  let horizontalSnap = false;

  if (Math.abs(center.x - width / 2) <= threshold) {
    obj.left = width / 2 - obj.getScaledWidth() / 2;
    guideState.x = width / 2;
    verticalSnap = true;
  }
  if (Math.abs(center.y - height / 2) <= threshold) {
    obj.top = height / 2 - obj.getScaledHeight() / 2;
    guideState.y = height / 2;
    horizontalSnap = true;
  }
  if (Math.abs(obj.left || 0) <= threshold) {
    obj.left = 0;
    guideState.x = 0;
    verticalSnap = true;
  }
  const right = (obj.left || 0) + obj.getScaledWidth();
  if (Math.abs(right - width) <= threshold) {
    obj.left = width - obj.getScaledWidth();
    guideState.x = width;
    verticalSnap = true;
  }
  if (Math.abs(obj.top || 0) <= threshold) {
    obj.top = 0;
    guideState.y = 0;
    horizontalSnap = true;
  }
  const bottom = (obj.top || 0) + obj.getScaledHeight();
  if (Math.abs(bottom - height) <= threshold) {
    obj.top = height - obj.getScaledHeight();
    guideState.y = height;
    horizontalSnap = true;
  }
  if (!verticalSnap) guideState.x = null;
  if (!horizontalSnap) guideState.y = null;
}

function handleDoubleClick(event) {
  const target = event.target;
  if (target && target.type === 'textbox' && !target.isEditing) {
    target.enterEditing();
    target.selectAll();
    canvas.value.requestRenderAll();
  }
}

function handleTextChanged(event) {
  const target = event.target;
  if (target && target === activeObject.value && target.type === 'textbox') {
    selectionState.textContent = target.text || '';
  }
}

function handleKeydown(e) {
  const target = e.target;
  const isInput = target && (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
  if (isInput) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && canvas.value) {
    const active = canvas.value.getActiveObject();
    if (active && !active.excludeFromHistory) {
      canvas.value.remove(active);
      canvas.value.discardActiveObject();
      canvas.value.requestRenderAll();
      scheduleSnapshot();
    }
  }
}

function handleWheel(opt) {
  if (!opt.e.ctrlKey) return;
  opt.e.preventDefault();
  const delta = opt.e.deltaY;
  const next = Math.min(800, Math.max(5, zoomPercent.value + (delta > 0 ? -5 : 5)));
  const point = new fabric.Point(opt.pointer.x, opt.pointer.y);
  setManualZoom(next, point);
}

function applyZoom(percent) {
  setManualZoom(percent);
}

function setManualZoom(percent, point) {
  if (!canvas.value) return;
  const bounded = Math.min(800, Math.max(5, percent));
  zoomPercent.value = bounded;
  updateCanvasZoom(point);
}

function deleteActiveObject() {
  const obj = activeObject.value;
  if (!canvas.value || !obj) return;
  canvas.value.remove(obj);
  canvas.value.discardActiveObject();
  canvas.value.requestRenderAll();
  activeObject.value = null;
  refreshLayers();
  scheduleSnapshot();
}

function duplicateActiveObject() {
  const obj = activeObject.value;
  if (!canvas.value || !obj) return;
  obj.clone((cloned) => {
    cloned.set({
      left: (obj.left || 0) + 20,
      top: (obj.top || 0) + 20,
      evented: true
    });
    if (cloned.type === 'activeSelection') {
      cloned.canvas = canvas.value;
      cloned.forEachObject((child) => canvas.value.add(child));
      cloned.setCoords();
    } else {
      canvas.value.add(cloned);
    }
    assignMetadata(cloned, obj.layerName || obj.type);
    canvas.value.setActiveObject(cloned);
    canvas.value.requestRenderAll();
    refreshLayers();
    scheduleSnapshot();
  });
}

function toggleActiveLock() {
  const obj = activeObject.value;
  if (!obj) return;
  const nextLocked = !selectionState.locked;
  toggleLock(nextLocked);
}

function updateCanvasSize(key, value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric <= 0) return;
  if (boardConfig.lockRatio) {
    const ratio = boardConfig.width / boardConfig.height;
    if (key === 'width') {
      boardConfig.height = Math.round(numeric / ratio);
    } else {
      boardConfig.width = Math.round(numeric * ratio);
    }
  }
  boardConfig[key] = numeric;
  canvas.value?.setDimensions({
    width: boardConfig.width,
    height: boardConfig.height
  });
  updateAutoFitScale();
  scheduleSnapshot();
}

function applyPreset() {
  const preset = PRESETS.find(item => item.id === selectedPreset.value);
  if (!preset) return;
  boardConfig.width = preset.width;
  boardConfig.height = preset.height;
  canvas.value?.setDimensions({
    width: boardConfig.width,
    height: boardConfig.height
  });
  updateAutoFitScale();
  scheduleSnapshot();
}

function updateGeneral(key, value) {
  const obj = activeObject.value;
  if (!obj) return;
  const num = Number(value);
  if (key === 'width' && num > 0) {
    obj.scaleToWidth(num);
  } else if (key === 'height' && num > 0) {
    obj.scaleToHeight(num);
  } else if (!Number.isNaN(num)) {
    const mapping = {
      x: 'left',
      y: 'top',
      opacity: 'opacity',
      angle: 'angle'
    };
    if (mapping[key]) {
      if (key === 'opacity') {
        obj.set(mapping[key], num / 100);
      } else {
        obj.set(mapping[key], num);
      }
    }
  }
  obj.setCoords();
  canvas.value.requestRenderAll();
  syncSelectionState(obj);
  scheduleSnapshot();
}

function toggleLock(locked) {
  const obj = activeObject.value;
  if (!obj) return;
  obj.lockMovementX = locked;
  obj.lockMovementY = locked;
  obj.lockScalingX = locked;
  obj.lockScalingY = locked;
  obj.hasControls = !locked;
  obj.selectable = !locked;
  selectionState.locked = locked;
  canvas.value.requestRenderAll();
  scheduleSnapshot();
}

function toggleVisibility(visible) {
  const obj = activeObject.value;
  if (!obj) return;
  obj.visible = visible;
  selectionState.visible = visible;
  canvas.value.requestRenderAll();
  scheduleSnapshot();
}

function moveLayer(direction) {
  const obj = activeObject.value;
  if (!obj) return;
  switch (direction) {
    case 'up':
      canvas.value.bringForward(obj);
      break;
    case 'down':
      canvas.value.sendBackwards(obj);
      break;
    case 'top':
      canvas.value.bringToFront(obj);
      break;
    case 'bottom':
      canvas.value.sendToBack(obj);
      break;
    default:
      break;
  }
  canvas.value.requestRenderAll();
  refreshLayers();
  syncSelectionState(obj);
  scheduleSnapshot();
}

function replaceImage(event) {
  const file = event.target.files[0];
  if (!file || activeObject.value?.type !== 'image') return;
  const reader = new FileReader();
  reader.onload = () => {
    activeObject.value.setSrc(reader.result, { crossOrigin: 'anonymous' })
      .then(() => {
        canvas.value.requestRenderAll();
        syncSelectionState(activeObject.value);
        scheduleSnapshot();
      })
      .catch(() => window.alert('替换图片失败，请重试'));
  };
  reader.readAsDataURL(file);
}

function applyImageFit(mode) {
  const obj = activeObject.value;
  if (!obj || obj.type !== 'image') return;
  const scaleX = boardConfig.width / obj.width;
  const scaleY = boardConfig.height / obj.height;
  const scale = mode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  obj.set({
    scaleX: scale,
    scaleY: scale,
    left: (boardConfig.width - obj.width * scale) / 2,
    top: (boardConfig.height - obj.height * scale) / 2
  });
  obj.setCoords();
  selectionState.imageFit = mode;
  canvas.value.requestRenderAll();
  scheduleSnapshot();
}

function applyCornerRadius(value) {
  const obj = activeObject.value;
  if (!obj) return;
  const radius = Math.max(0, Number(value) || 0);
  obj.set({ rx: radius, ry: radius });
  obj.setCoords();
  selectionState.cornerRadius = radius;
  canvas.value.requestRenderAll();
  scheduleSnapshot();
}

function applyShadow(key, value) {
  const obj = activeObject.value;
  if (!obj) return;
  const current = typeof obj.shadow === 'object' && obj.shadow
    ? { ...obj.shadow }
    : { color: selectionState.shadowColor, blur: selectionState.shadowBlur, offsetX: 0, offsetY: 6 };
  if (key === 'blur') {
    current.blur = Math.max(0, Number(value) || 0);
    selectionState.shadowBlur = current.blur;
  } else {
    current.color = value;
    selectionState.shadowColor = value;
  }
  obj.set('shadow', current);
  canvas.value.requestRenderAll();
  scheduleSnapshot();
}

function applyCrop(axis, value) {
  const obj = activeObject.value;
  if (!obj || obj.type !== 'image') return;
  if (axis === 'x') {
    obj.cropX = Math.max(0, Number(value) || 0);
    selectionState.clipX = obj.cropX;
  } else {
    obj.cropY = Math.max(0, Number(value) || 0);
    selectionState.clipY = obj.cropY;
  }
  obj.setCoords();
  canvas.value.requestRenderAll();
  scheduleSnapshot();
}

function flipImage(axis) {
  const obj = activeObject.value;
  if (!obj || obj.type !== 'image') return;
  if (axis === 'x') {
    obj.set('flipX', !obj.flipX);
  } else {
    obj.set('flipY', !obj.flipY);
  }
  canvas.value.requestRenderAll();
  scheduleSnapshot();
}

function updateText(key, value) {
  const obj = activeObject.value;
  if (!obj || obj.type !== 'textbox') return;
  switch (key) {
    case 'text':
      obj.text = value;
      selectionState.textContent = value;
      break;
    case 'fontFamily':
      obj.fontFamily = value;
      selectionState.fontFamily = value;
      break;
    case 'fontSize':
      obj.fontSize = Number(value) || obj.fontSize;
      selectionState.fontSize = obj.fontSize;
      break;
    case 'fill':
      obj.set('fill', value);
      selectionState.textColor = value;
      break;
    case 'lineHeight':
      obj.lineHeight = Number(value) || obj.lineHeight;
      selectionState.lineHeight = obj.lineHeight;
      break;
    case 'charSpacing':
      obj.charSpacing = Number(value) || obj.charSpacing;
      selectionState.charSpacing = obj.charSpacing;
      break;
    case 'textAlign':
      obj.textAlign = value;
      selectionState.textAlign = value;
      break;
    case 'backgroundColor':
      obj.textBackgroundColor = value;
      selectionState.textBackground = value;
      break;
    default:
      break;
  }
  canvas.value.requestRenderAll();
  scheduleSnapshot();
}

function toggleTextStyle(type) {
  const obj = activeObject.value;
  if (!obj || obj.type !== 'textbox') return;
  if (type === 'bold') {
    obj.fontWeight = obj.fontWeight === 'bold' ? 'normal' : 'bold';
    selectionState.fontWeight = obj.fontWeight;
  }
  if (type === 'italic') {
    obj.fontStyle = obj.fontStyle === 'italic' ? 'normal' : 'italic';
    selectionState.fontStyle = obj.fontStyle;
  }
  if (type === 'underline') {
    obj.underline = !obj.underline;
    selectionState.underline = obj.underline;
  }
  canvas.value.requestRenderAll();
  scheduleSnapshot();
}

function toggleAutoWrap(checked) {
  const obj = activeObject.value;
  if (!obj || obj.type !== 'textbox') return;
  selectionState.autoWrap = checked;
  obj.set({ width: checked ? 400 : obj.text?.length * (obj.fontSize / 2) });
  obj.setCoords();
  canvas.value.requestRenderAll();
  scheduleSnapshot();
}

function toggleTextboxSize(locked) {
  const obj = activeObject.value;
  if (!obj || obj.type !== 'textbox') return;
  obj.lockScalingX = locked;
  obj.lockScalingY = locked;
  selectionState.lockTextboxSize = locked;
  scheduleSnapshot();
}

function updateShape(key, value) {
  const obj = activeObject.value;
  if (!obj || !isShape.value) return;
  switch (key) {
    case 'fill':
      obj.set('fill', value);
      selectionState.fill = value;
      break;
    case 'stroke':
      obj.set('stroke', value);
      selectionState.stroke = value;
      break;
    case 'strokeWidth':
      obj.set('strokeWidth', Math.max(0, Number(value) || 0));
      selectionState.strokeWidth = obj.strokeWidth;
      break;
    case 'radius':
      obj.set({ rx: Number(value) || 0, ry: Number(value) || 0 });
      selectionState.cornerRadius = Number(value) || 0;
      break;
    case 'dash':
      obj.set('strokeDashArray', value === 'dashed' ? [10, 6] : null);
      break;
    default:
      break;
  }
  obj.setCoords();
  canvas.value.requestRenderAll();
  scheduleSnapshot();
}

function refreshLayers() {
  if (!canvas.value) return;
  const objects = canvas.value.getObjects().filter(obj => !obj.excludeFromLayerPanel && obj !== canvas.value.backgroundImage);
  layers.value = objects
    .map((obj, index) => ({
      id: obj.customId,
      name: obj.layerName || obj.type,
      type: obj.type,
      visible: obj.visible !== false,
      locked: !!obj.lockMovementX,
      stackIndex: index
    }))
    .reverse();
}

function handleLayerDragStart(id) {
  dragLayerId.value = id;
}

function handleLayerDragEnd() {
  dragLayerId.value = null;
}

function handleLayerDrop(targetId) {
  if (!dragLayerId.value || dragLayerId.value === targetId) return;
  const displayOrder = layers.value.map(layer => layer.id);
  const from = displayOrder.indexOf(dragLayerId.value);
  const to = displayOrder.indexOf(targetId);
  if (from === -1 || to === -1) return;
  const updatedOrder = [...displayOrder];
  const [moved] = updatedOrder.splice(from, 1);
  updatedOrder.splice(to, 0, moved);
  applyLayerOrder(updatedOrder);
  canvas.value.requestRenderAll();
  refreshLayers();
  dragLayerId.value = null;
  scheduleSnapshot();
}

function applyLayerOrder(orderTopToBottom) {
  const idsBottomToTop = [...orderTopToBottom].reverse();
  idsBottomToTop.forEach((id, index) => {
    const obj = canvas.value.getObjects().find(item => item.customId === id);
    if (obj) {
      canvas.value.moveTo(obj, index);
    }
  });
}

function toggleLayerVisibility(id) {
  const obj = canvas.value.getObjects().find(item => item.customId === id);
  if (!obj) return;
  obj.visible = !obj.visible;
  canvas.value.requestRenderAll();
  refreshLayers();
  scheduleSnapshot();
}

function toggleLayerLock(id) {
  const obj = canvas.value.getObjects().find(item => item.customId === id);
  if (!obj) return;
  const locked = !obj.lockMovementX;
  obj.lockMovementX = locked;
  obj.lockMovementY = locked;
  obj.hasControls = !locked;
  obj.selectable = !locked;
  canvas.value.requestRenderAll();
  refreshLayers();
  scheduleSnapshot();
}

function selectLayer(id) {
  const obj = canvas.value.getObjects().find(item => item.customId === id);
  if (!obj) return;
  canvas.value.setActiveObject(obj);
  canvas.value.requestRenderAll();
  syncSelectionState(obj);
}

function groupSelection() {
  const active = canvas.value.getActiveObject();
  if (active?.type === 'activeSelection') {
    const group = active.toGroup();
    assignMetadata(group, '组合');
    canvas.value.requestRenderAll();
    syncSelectionState(group);
    scheduleSnapshot();
  }
}

function ungroupSelection() {
  const active = canvas.value.getActiveObject();
  if (active?.type === 'group') {
    active.toActiveSelection();
    canvas.value.requestRenderAll();
    scheduleSnapshot();
  }
}

function clearCanvas() {
  if (!canvas.value) return;
  if (!window.confirm('确认清空画布？此操作不可撤销。')) return;
  const objects = canvas.value.getObjects().slice();
  objects.forEach(obj => canvas.value.remove(obj));
  canvas.value.setBackgroundImage(null, canvas.value.renderAll.bind(canvas.value));
  canvas.value.setBackgroundColor('#ffffff', canvas.value.renderAll.bind(canvas.value));
  boardVisualBackground.value = '#ffffff';
  lastImageObject.value = null;
  clearMaskPath();
  canvas.value.renderAll();
  layers.value = [];
  snapshotHistory();
}
</script>

<style scoped>
.editor-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: #111827;
  color: #fff;
}
.brand {
  font-weight: 600;
  font-size: 20px;
}
.preset-group {
  display: flex;
  align-items: center;
  gap: 12px;
}
.preset-group select,
.preset-group input {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 6px 10px;
}
.size-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}
.size-inputs div {
  display: flex;
  align-items: center;
  gap: 4px;
}
.lock {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}
.lock.muted {
  color: #94a3b8;
  font-weight: 500;
}
.top-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}
.action-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.top-actions button,
.top-actions label.ghost {
  border: none;
  background: #2563eb;
  color: #fff;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.top-actions button.ghost,
.top-actions label.ghost {
  background: rgba(255, 255, 255, 0.08);
}
.top-actions button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.upload-label {
  position: relative;
  overflow: hidden;
}
.upload-label input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.editor-content {
  flex: 1;
  display: grid;
  grid-template-columns: 260px 1fr 320px;
  gap: 16px;
  padding: 16px 24px;
  overflow: hidden;
}
.asset-panel,
.property-panel {
  background: #fff;
  border-radius: 18px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);
}
.asset-search input {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px 12px;
}
.asset-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 12px 0;
}
.asset-tabs button {
  border: none;
  border-radius: 10px;
  padding: 6px 8px;
  background: #f3f4f6;
  cursor: pointer;
}
.asset-tabs button.active {
  background: #111827;
  color: #fff;
}
.asset-list {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.asset-card {
  background: #f9fafb;
  border-radius: 12px;
  padding: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid transparent;
}
.asset-card:hover {
  border-color: #2563eb;
}
.asset-thumb {
  background: #fff;
  border-radius: 10px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.asset-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.asset-placeholder {
  font-size: 32px;
  color: #9ca3af;
}
.canvas-stack {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.05);
  max-height: calc(100vh - 220px);
}
.stage-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}
.stage-wrapper {
  flex: 1;
  overflow: auto;
  padding: 24px;
}
.canvas-with-rulers {
  display: inline-flex;
  flex-direction: column;
  background: #e2e8f0;
  border-radius: 16px;
  padding: 0 0 0 0;
}
.ruler-horizontal {
  height: 24px;
  margin-left: 24px;
}
.ruler-horizontal canvas,
.ruler-vertical canvas {
  display: block;
}
.ruler-body {
  display: flex;
  flex-direction: row;
}
.ruler-vertical {
  width: 24px;
}
.board-wrapper {
  position: relative;
  display: inline-block;
  overflow: hidden;
}
.stage-board {
  margin: 0;
  position: relative;
  border-radius: 24px;
  border: 1px solid #e5e7eb;
  background: #fff;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.05);
  transform-origin: top left;
}
.stage-board.grid-on::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}
.stage-board canvas {
  display: block;
  border-radius: 24px;
  width: 100%;
  height: 100%;
}
.guide-line {
  position: absolute;
  background: #2563eb;
  pointer-events: none;
}
.guide-x {
  left: 0;
  right: 0;
  height: 1px;
}
.guide-y {
  top: 0;
  bottom: 0;
  width: 1px;
}
.fast-menu {
  position: absolute;
  transform: translate(-50%, -100%);
  display: flex;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  border-radius: 999px;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.2);
  z-index: 5;
}
.fast-menu button {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s;
}
.fast-menu button:hover {
  background: rgba(255, 255, 255, 0.15);
}
.property-panel {
  overflow-y: auto;
}
.panel-section + .panel-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}
.section-title {
  font-weight: 600;
  margin-bottom: 12px;
}
.form-grid {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 8px 12px;
  align-items: center;
}
.form-grid input,
.form-grid select,
.form-grid textarea {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 6px 8px;
  font: inherit;
}
.form-grid textarea {
  grid-column: span 1;
}
.stack-buttons {
  display: flex;
  gap: 6px;
}
.stack-buttons button {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 4px 8px;
  background: #fff;
  cursor: pointer;
}
.stack-buttons button.active {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
.layer-panel {
  background: #fff;
  padding: 12px 24px 24px;
  border-top: 1px solid #e5e7eb;
  box-shadow: 0 -8px 20px rgba(15, 23, 42, 0.05);
}
.layer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.layer-list {
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.layer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
  cursor: grab;
}
.layer-row.active {
  border-color: #2563eb;
  background: #e0ebff;
}
.layer-actions button {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
}
.layer-info {
  display: flex;
  flex-direction: column;
}
.layer-name {
  font-weight: 600;
}
.zoom-control {
  display: flex;
  align-items: center;
  gap: 8px;
}
.zoom-control input {
  width: 160px;
}
.empty-tip {
  padding: 16px;
  background: #f3f4f6;
  border-radius: 12px;
  color: #6b7280;
  text-align: center;
}

@media (max-height: 900px) {
  .canvas-stack {
    max-height: calc(100vh - 160px);
  }
}
</style>
