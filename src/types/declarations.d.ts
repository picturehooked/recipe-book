// Module declarations for packages without bundled TypeScript types

declare module 'pdfjs-dist' {
  const pdfjsLib: any
  export = pdfjsLib
}

declare module 'pdfjs-dist/build/pdf.worker.entry' {
  const workerEntry: any
  export default workerEntry
}
