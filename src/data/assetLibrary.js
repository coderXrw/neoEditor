export default [
  {
    id: 'images',
    name: '图片',
    type: 'image',
    assets: [
      {
        id: 'img-1',
        name: '山川清晨',
        description: '清晨薄雾中的山峰照片',
        url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=60'
      },
      {
        id: 'img-2',
        name: '城市夜色',
        description: '霓虹都市夜景',
        url: 'https://images.unsplash.com/photo-1470790376778-a9fbc86d70e2?auto=format&fit=crop&w=1200&q=60'
      }
    ]
  },
  {
    id: 'backgrounds',
    name: '背景',
    type: 'background',
    assets: [
      {
        id: 'bg-1',
        name: '渐变蓝',
        description: '线性渐变背景',
        url: 'linear-gradient(135deg, #7f7fd5, #86a8e7, #91eae4)'
      },
      {
        id: 'bg-2',
        name: '灰白纹理',
        description: '轻质纸纹背景',
        url: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=1200&q=60'
      }
    ]
  },
  {
    id: 'shapes',
    name: '形状',
    type: 'shape',
    assets: [
      {
        id: 'shape-rect',
        name: '圆角矩形',
        description: '带圆角的高亮矩形',
        shape: 'rect',
        options: { width: 300, height: 160, fill: '#4c6ef5', rx: 24, ry: 24 }
      },
      {
        id: 'shape-circle',
        name: '圆形',
        description: '柔和渐变圆',
        shape: 'circle',
        options: { radius: 120, fill: 'linear-gradient(180deg, #ff9a9e 0%, #fad0c4 100%)' }
      },
      {
        id: 'shape-triangle',
        name: '三角形',
        description: '简洁三角',
        shape: 'triangle',
        options: { width: 220, height: 200, fill: '#f59f00' }
      }
    ]
  },
  {
    id: 'textTemplates',
    name: '文本模板',
    type: 'text',
    assets: [
      {
        id: 'text-hero',
        name: '标题+副标题',
        description: '大号标题搭配副标题',
        template: {
          title: '创意无界',
          subtitle: 'DESIGN YOUR STORY',
          fontFamily: 'Source Han Sans',
          colors: ['#111', '#666']
        }
      },
      {
        id: 'text-quote',
        name: '引用文案',
        description: '引用样式文本',
        template: {
          title: 'Keep it simple',
          subtitle: 'LESS IS MORE',
          fontFamily: 'Georgia',
          colors: ['#2c3e50', '#95a5a6']
        }
      }
    ]
  },
  {
    id: 'stickers',
    name: '贴纸',
    type: 'sticker',
    assets: [
      {
        id: 'sticker-1',
        name: '笑脸',
        description: '简洁笑脸贴纸',
        url: 'https://assets.vercel.com/image/upload/v1693210407/illustrations/emoji-smile.png'
      },
      {
        id: 'sticker-2',
        name: 'OK 手势',
        description: '扁平手势贴纸',
        url: 'https://assets.vercel.com/image/upload/v1693210407/illustrations/emoji-ok.png'
      }
    ]
  },
  {
    id: 'components',
    name: '组件',
    type: 'component',
    assets: [
      {
        id: 'component-card',
        name: '信息卡片',
        description: '标题+按钮组件',
        structure: 'card'
      }
    ]
  }
];
