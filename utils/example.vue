<template>
  <div class="product-analysis">
    <div class="product-card">
      <div class="product-list">
        <div class="product-item">
          <div class="product-info">
            <div class="product-header">
              <img :src="require('@assets/icon-image-15.svg')" alt="商品图标" class="product-icon" />
              <div class="product-content">
                <div class="product-title">
                  <div class="product-name">{{ productData.name }}</div>
                  <div class="product-level">{{ productData.level }}</div>
                </div>
                <div class="product-attributes">
                  <div class="attribute-row">
                    <div class="attribute-item">{{ productData.growth }}</div>
                    <div class="attribute-item">{{ productData.skills }}</div>
                  </div>
                </div>
                <div class="product-tags">
                  <div class="tag-item" v-for="(tag, index) in productData.tags" :key="index">
                    {{ tag }}
                  </div>
                </div>
              </div>
            </div>
            <div class="product-meta">
              <div class="server-info">{{ productData.server }}</div>
              <div class="price">{{ productData.price }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="analysis-summary">
        <div class="summary-item">
          <div class="summary-card">
            <div class="summary-title">{{ summaryData.equipment.title }}</div>
            <div class="summary-content">
              <div class="summary-value">{{ summaryData.equipment.value }}</div>
              <div class="summary-trend">
                <div class="trend-text">{{ summaryData.equipment.trendText }}</div>
                <div class="trend-percent">{{ summaryData.equipment.trendPercent }}</div>
                <img :src="require('@assets/icon-polygon-28.svg')" alt="趋势图标" class="trend-icon" />
              </div>
            </div>
          </div>
          <div class="divider-vertical"></div>
          <div class="summary-card">
            <div class="summary-title">{{ summaryData.artifact.title }}</div>
            <div class="summary-content">
              <div class="summary-value">{{ summaryData.artifact.value }}</div>
              <div class="summary-trend">
                <div class="trend-text">{{ summaryData.artifact.trendText }}</div>
                <div class="trend-percent">{{ summaryData.artifact.trendPercent }}</div>
                <img :src="require('@assets/icon-polygon-28-1.svg')" alt="趋势图标" class="trend-icon" />
              </div>
            </div>
          </div>
          <div class="divider-vertical"></div>
          <div class="summary-card">
            <div class="summary-title">{{ summaryData.pet.title }}</div>
            <div class="summary-content">
              <div class="summary-value">{{ summaryData.pet.value }}</div>
              <div class="summary-trend">
                <div class="trend-text">{{ summaryData.pet.trendText }}</div>
                <div class="trend-percent">{{ summaryData.pet.trendPercent }}</div>
                <img :src="require('@assets/icon-polygon-28-2.svg')" alt="趋势图标" class="trend-icon" />
              </div>
            </div>
          </div>
        </div>
        <div class="analysis-desc">{{ summaryData.desc }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
const productData = {
  name: '月影仙',
  level: '| 120级',
  growth: '成长:1.225',
  skills: '6技能',
  tags: ['灵性110', '出其遗忘须弥'],
  server: '全国1区-盛夏光年',
  price: '￥6846'
}

const summaryData = {
  equipment: {
    title: '装备',
    value: '99',
    trendText: '相似前',
    trendPercent: '10%'
  },
  artifact: {
    title: '器灵',
    value: '14',
    trendText: '相似前',
    trendPercent: '10%'
  },
  pet: {
    title: '召唤灵',
    value: '30',
    trendText: '相似前',
    trendPercent: '30%'
  },
  desc: '当前角色整号热度相对较低，比相似低10%；访问量逐步下降, 角色内包含X件装备、X件灵饰，其中双防一血镯近期较...'
}
</script>

<style scoped>
.product-analysis {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  align-self: stretch;
  padding: 4px 8px 12px 8px;
  border-radius: 4px;
  background: #FFF;
  margin-bottom: 8px;
}

.product-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  align-self: stretch;
}

.product-list {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  align-self: stretch;
  padding: 8px 0px;
  background: #FFF;
  margin-bottom: 4px;
}

.product-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  align-self: stretch;
  background: #FFF;
}

.product-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.product-header {
  display: flex;
  align-items: flex-start;
}

.product-icon {
  width: 40px;
  height: 40px;
  aspect-ratio: 1/1;
  background: lightgray 50% / cover no-repeat;
  margin-right: 10px;
}

.product-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 8px;
}

.product-title {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 8px;
}

.product-name {
  color: #1A1A1A;
  font-size: 14px;
  line-height: 1;
  margin-right: 4px;
  font-weight: bold;
}

.product-level {
  color: #555;
  font-size: 12px;
  line-height: 1;
}

.product-attributes {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
}

.attribute-row {
  display: flex;
  align-items: flex-start;
}

.attribute-item {
  color: #555;
  font-size: 12px;
  line-height: 1;
  margin-right: 6px;
}

.product-tags {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.tag-item {
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  border: 0.50px solid #F7C9C9;
  margin-right: 4px;
  color: #FF3A36;
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
}

.product-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.server-info {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
  color: #555;
  text-align: right;
  font-size: 12px;
  line-height: 1;
}

.price {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  color: #FF3A36;
  text-align: right;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.13;
}

.analysis-summary {
  display: flex;
  justify-content: center;
  align-items: center;
  align-self: stretch;
  padding: 8px;
  border-radius: 4px;
  background: rgba(85, 97, 245, 0.05);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 4px;
  background: #FFF;
  margin-bottom: 8px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  flex-shrink: 0;
  border-radius: 4px;
  margin-right: 16px;
}

.summary-title {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  color: #555;
  font-size: 12px;
  line-height: 1;
}

.summary-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.summary-value {
  color: #1A1A1A;
  font-size: 18px;
  line-height: 1;
  margin-bottom: 4px;
}

.summary-trend {
  display: flex;
  align-items: center;
}

.trend-text {
  color: #555;
  font-size: 12px;
  line-height: 1;
  margin-right: 2px;
}

.trend-percent {
  color: #1A1A1A;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  margin-right: 2px;
}

.trend-icon {
  width: 10px;
  height: 6px;
}

.divider-vertical {
  width: 1px;
  height: 100%;
  background: #EFEFEF;
  margin: 0 10px;
}

.analysis-desc {
  color: #555;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.50;
}
</style>