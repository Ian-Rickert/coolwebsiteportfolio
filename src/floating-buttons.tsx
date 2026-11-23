import { useLayoutEffect, useRef } from "react"

import {
  createBody,
  separateBodies,
  squishTransform,
  stepBodies,
  syncMass,
  type Body,
} from "@/ball-physics"
import { LiquidButton } from "@/components/ui/liquid-glass-button"

type Website = {
  label: string
  href: string
}

type FloatingButtonsProps = {
  websites: readonly Website[]
}

export function FloatingButtons({ websites }: FloatingButtonsProps) {
  const arenaRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const bodiesRef = useRef<Body[]>([])

  useLayoutEffect(() => {
    const arena = arenaRef.current
    if (!arena) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return

    const measure = () => {
      const width = arena.clientWidth
      const height = arena.clientHeight
      if (width < 2 || height < 2) return null
      return itemRefs.current.map((item, index) => {
        const previous = bodiesRef.current[index]
        const w = item?.offsetWidth ?? 160
        const h = item?.offsetHeight ?? 56
        if (!previous) return { w, h, body: null }
        const cx = previous.x + previous.w / 2
        const cy = previous.y + previous.h / 2
        previous.w = w
        previous.h = h
        previous.x = cx - w / 2
        previous.y = cy - h / 2
        syncMass(previous)
        return { w, h, body: previous }
      })
    }

    const place = () => {
      const sizes = measure()
      if (!sizes) return false
      const width = arena.clientWidth
      const height = arena.clientHeight
      const pad = 12
      const placed: Array<{ x: number; y: number; w: number; h: number }> = []
      bodiesRef.current = sizes.map((size, index) => {
        const maxX = Math.max(pad, width - size.w - pad)
        const maxY = Math.max(pad, height - size.h - pad)
        let x = pad
        let y = pad
        for (let attempt = 0; attempt < 48; attempt += 1) {
          const nextX = pad + Math.random() * Math.max(0, maxX - pad)
          const nextY = pad + Math.random() * Math.max(0, maxY - pad)
          const blocked = placed.some((other) => {
            const dx = nextX + size.w / 2 - (other.x + other.w / 2)
            const dy = nextY + size.h / 2 - (other.y + other.h / 2)
            const min = size.w / 2 + other.w / 2 + 10
            return dx * dx + dy * dy < min * min
          })
          x = nextX
          y = nextY
          if (!blocked) break
        }
        placed.push({ x, y, w: size.w, h: size.h })
        return createBody(x, y, size.w, size.h, index + Math.random() * Math.PI * 2)
      })
      separateBodies(bodiesRef.current, width, height)
      return true
    }

    if (!place()) return

    let frame = 0
    let last = performance.now()
    let elapsed = 0

    const draw = () => {
      const bodies = bodiesRef.current
      for (let index = 0; index < bodies.length; index += 1) {
        const item = itemRefs.current[index]
        const body = bodies[index]
        if (!item) continue
        item.style.left = `${body.x}px`
        item.style.top = `${body.y}px`
        item.style.transformOrigin = "center center"
        item.style.transform = squishTransform(body.squash, body.squashAngle)
      }
    }

    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000)
      last = now
      elapsed += dt
      measure()
      stepBodies(
        bodiesRef.current,
        arena.clientWidth,
        arena.clientHeight,
        dt,
        elapsed,
      )
      draw()
      frame = requestAnimationFrame(tick)
    }

    draw()
    frame = requestAnimationFrame(tick)

    const observer = new ResizeObserver(() => {
      measure()
    })
    observer.observe(arena)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [websites])

  return (
    <main
      ref={arenaRef}
      className="fixed inset-0 z-10 overflow-hidden"
      aria-label="Websites"
    >
      {websites.map((site, index) => (
        <div
          key={site.href}
          ref={(node) => {
            itemRefs.current[index] = node
          }}
          className="absolute top-0 left-0 size-[clamp(7.75rem,20vw,9.5rem)]"
        >
          <LiquidButton
            type="button"
            className="h-full w-full min-h-0 max-w-none overflow-hidden rounded-full px-3.5 text-center text-[0.7rem] leading-tight font-medium whitespace-normal text-white hover:scale-100 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]"
            onClick={() => {
              window.open(site.href, "_blank", "noopener,noreferrer")
            }}
          >
            {site.label}
          </LiquidButton>
        </div>
      ))}
    </main>
  )
}
