import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'dunnes-session'

export const useSessionStore = defineStore('session', () => {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')

  const target = ref(stored.target ?? 25)
  const currentView = ref(stored.currentView ?? 'shopping')
  const voucher = ref(stored.voucher ?? 5)

  function setTarget(val) {
    target.value = val
  }

  function setView(val) {
    currentView.value = val
  }

  function setVoucher(val) {
    voucher.value = val
  }

  watch([target, currentView, voucher], () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      target: target.value,
      currentView: currentView.value,
      voucher: voucher.value
    }))
  })

  return { target, currentView, voucher, setTarget, setView, setVoucher }
})
