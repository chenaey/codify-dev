/// <reference types="vite/client" />

declare module '*.vue' {
  import Vue from 'vue'
  export default Vue
}

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}
