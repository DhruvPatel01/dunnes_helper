<template>
  <div class="view-root overflow-y-auto bg-primary-50">
    <ListsHeader />
    <div class="flex-1 pb-2">
      <ListCard
        v-for="list in store.lists"
        :key="list.id"
        :list="list"
      />
    </div>
  </div>
</template>

<script setup>
import { useListsStore } from '../stores/listsStore.js'
import ListsHeader from '../components/lists/ListsHeader.vue'
import ListCard from '../components/lists/ListCard.vue'

const store = useListsStore()
</script>
