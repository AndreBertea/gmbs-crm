import '@testing-library/jest-dom'

// Mock ResizeObserver pour les tests de virtualisation
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  root = null
  rootMargin = ''
  thresholds = []
  takeRecords() { return [] }
}
