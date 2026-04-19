<template>
  <div class="flex flex-col h-full">
    <div class="flex-shrink-0">
      <TargetSelector />
      <GapHero />
    </div>
    <div class="flex-1 min-h-0">
      <ProductList />
    </div>
    <CartPanel />
  </div>
</template>

<script setup>
import TargetSelector from '../components/shopping/TargetSelector.vue'
import GapHero from '../components/shopping/GapHero.vue'
import ProductList from '../components/shopping/ProductList.vue'
import CartPanel from '../components/shopping/CartPanel.vue'
</script>
