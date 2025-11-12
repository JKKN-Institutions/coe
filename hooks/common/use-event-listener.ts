import { useEffect, useRef, RefObject } from 'react'

/**
 * Custom hook for managing event listeners
 *
 * @example
 * // Listen to window event
 * useEventListener('resize', handleResize)
 *
 * // Listen to element event
 * const ref = useRef<HTMLDivElement>(null)
 * useEventListener('click', handleClick, ref)
 */
export function useEventListener<K extends keyof WindowEventMap>(
	eventName: K,
	handler: (event: WindowEventMap[K]) => void,
	element?: RefObject<HTMLElement> | null,
	options?: boolean | AddEventListenerOptions
): void {
	const savedHandler = useRef(handler)

	// Update ref.current value if handler changes
	useEffect(() => {
		savedHandler.current = handler
	}, [handler])

	useEffect(() => {
		// Define the listening target
		const targetElement = element?.current || window

		if (!targetElement?.addEventListener) {
			return
		}

		// Create event listener that calls handler function stored in ref
		const eventListener = (event: Event) => {
			savedHandler.current(event as WindowEventMap[K])
		}

		targetElement.addEventListener(eventName, eventListener, options)

		// Remove event listener on cleanup
		return () => {
			targetElement.removeEventListener(eventName, eventListener, options)
		}
	}, [eventName, element, options])
}
