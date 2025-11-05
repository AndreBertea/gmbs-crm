// Ensure both default and named export `clsx` are available,
// even if a resolver picks a CJS build downstream.
import clsxLib from 'clsx'

// Avoid circular reference during SSR bundling
const clsxFn = clsxLib

export const clsx = clsxFn
export default clsxFn

