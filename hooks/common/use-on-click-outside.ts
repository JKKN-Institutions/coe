import { useEffect, RefObject } from 'react'

/**
 * Custom hook for detecting clicks outside a referenced element
 *
 * @example
 * const ref = useRef<HTMLDivElement>(null)
 * useOnClickOutside(ref, () => {
 *   console.log('Clicked outside!')
 *   setIsOpen(false)
 * })
 *
 * return <div ref={ref}>Click outside me!</div>
 */
export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
	ref: RefObject<T>,
	handler: (event: MouseEvent | TouchEvent) => void,
	enabled = true
): void {
	useEffect(() => {
		if (!enabled) {
			return
		}

		const listener = (event: MouseEvent | TouchEvent) => {
			const el = ref?.current

			// Do nothing if clicking ref's element or descendent elements
			if (!el || el.contains(event.target as Node)) {
				return
			}

			handler(event)
		}

		document.addEventListener('mousedown', listener)
		document.addEventListener('touchstart', listener)

		return () => {
			document.removeEventListener('mousedown', listener)
			document.removeEventListener('touchstart', listener)
		}
	}, [ref, handler, enabled])
}
