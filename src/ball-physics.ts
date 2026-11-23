export type Body = {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  squash: number
  squashVel: number
  squashTarget: number
  squashAngle: number
  phase: number
  invMass: number
}

const RESTITUTION = 0.4
const SLOP = 1.2
const RADIUS_RATIO = 0.5

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function syncMass(body: Body) {
  const mass = Math.max(1, body.w * body.h)
  body.invMass = 1 / mass
}

export function radiusOf(body: Body) {
  return body.w * RADIUS_RATIO
}

export function createBody(
  x: number,
  y: number,
  w: number,
  h: number,
  phase: number,
): Body {
  const heading = Math.random() * Math.PI * 2
  const speed = 6 + Math.random() * 5
  const body: Body = {
    x,
    y,
    vx: Math.cos(heading) * speed,
    vy: Math.sin(heading) * speed,
    w,
    h,
    squash: 0,
    squashVel: 0,
    squashTarget: 0,
    squashAngle: 0,
    phase,
    invMass: 1,
  }
  syncMass(body)
  return body
}

function center(body: Body) {
  return { x: body.x + body.w / 2, y: body.y + body.h / 2 }
}

function limitSpeed(body: Body) {
  const speed = Math.hypot(body.vx, body.vy)
  const maxSpeed = 12
  if (speed > maxSpeed) {
    body.vx *= maxSpeed / speed
    body.vy *= maxSpeed / speed
  }
}

function press(body: Body, amount: number, dentAngle: number) {
  const target = clamp(amount, 0, 0.72)
  if (target < 0.05) return
  body.squashAngle = dentAngle
  body.squashTarget = Math.max(body.squashTarget, target)
}

function collidePair(a: Body, b: Body, bounce: boolean) {
  const aCenter = center(a)
  const bCenter = center(b)
  let dx = bCenter.x - aCenter.x
  let dy = bCenter.y - aCenter.y
  let dist = Math.hypot(dx, dy)
  const minDist = radiusOf(a) + radiusOf(b)
  const pen = minDist - dist
  if (pen <= 0) return

  if (dist < 1e-4) {
    dx = 1
    dy = 0
    dist = 1
  }

  const nx = dx / dist
  const ny = dy / dist
  const share = (Math.max(0, pen - SLOP) * 0.16) / (a.invMass + b.invMass)
  const maxNudge = 0.35
  const nudgeA = Math.min(maxNudge, share * a.invMass)
  const nudgeB = Math.min(maxNudge, share * b.invMass)
  a.x -= nx * nudgeA
  a.y -= ny * nudgeA
  b.x += nx * nudgeB
  b.y += ny * nudgeB

  const compression = pen / ((radiusOf(a) + radiusOf(b)) * 0.5)
  press(a, compression * 1.7, Math.atan2(ny, nx))
  press(b, compression * 1.7, Math.atan2(-ny, -nx))

  if (!bounce) return

  const rvx = b.vx - a.vx
  const rvy = b.vy - a.vy
  const relN = rvx * nx + rvy * ny
  if (relN >= 0) return

  const impulse = (-(1 + RESTITUTION) * relN) / (a.invMass + b.invMass)
  a.vx -= impulse * nx * a.invMass
  a.vy -= impulse * ny * a.invMass
  b.vx += impulse * nx * b.invMass
  b.vy += impulse * ny * b.invMass
  limitSpeed(a)
  limitSpeed(b)

  const impact = -relN
  press(a, impact / 36, Math.atan2(ny, nx))
  press(b, impact / 36, Math.atan2(-ny, -nx))
}

function contain(body: Body, width: number, height: number) {
  const radius = radiusOf(body)
  const pad = 8
  const walls = [
    { nx: 1, ny: 0, dent: Math.PI, get: () => center(body).x - radius - pad },
    { nx: -1, ny: 0, dent: 0, get: () => width - pad - (center(body).x + radius) },
    { nx: 0, ny: 1, dent: -Math.PI / 2, get: () => center(body).y - radius - pad },
    { nx: 0, ny: -1, dent: Math.PI / 2, get: () => height - pad - (center(body).y + radius) },
  ]

  for (const wall of walls) {
    const gap = wall.get()
    if (gap >= 0) continue
    const push = Math.min(0.45, -gap)
    body.x += wall.nx * push
    body.y += wall.ny * push
    const vn = body.vx * wall.nx + body.vy * wall.ny
    if (vn < 0) {
      body.vx -= (1 + RESTITUTION) * vn * wall.nx
      body.vy -= (1 + RESTITUTION) * vn * wall.ny
      limitSpeed(body)
      press(body, Math.min(0.5, -vn / 80 + 0.16), wall.dent)
    }
  }
}

function drift(body: Body, time: number, dt: number) {
  body.vx += Math.sin(time * 0.22 + body.phase) * 2.2 * dt
  body.vy += Math.cos(time * 0.18 + body.phase * 1.4) * 2.2 * dt
  const drag = Math.exp(-0.35 * dt)
  body.vx *= drag
  body.vy *= drag

  const speed = Math.hypot(body.vx, body.vy)
  if (speed < 8) {
    const heading = speed > 1 ? Math.atan2(body.vy, body.vx) : body.phase
    body.vx += Math.cos(heading) * (8 - speed) * 0.12
    body.vy += Math.sin(heading) * (8 - speed) * 0.12
  }
  limitSpeed(body)

  body.squashTarget *= Math.exp(-0.38 * dt)
  const easing = body.squash < body.squashTarget ? 0.75 : 0.32
  body.squash += (body.squashTarget - body.squash) * (1 - Math.exp(-easing * dt))
  body.squash = clamp(body.squash, 0, 0.72)
  body.x += body.vx * dt
  body.y += body.vy * dt
}

export function separateBodies(bodies: Body[], width: number, height: number) {
  for (let pass = 0; pass < 30; pass += 1) {
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        collidePair(bodies[i], bodies[j], false)
      }
    }
    for (const body of bodies) contain(body, width, height)
  }
  for (const body of bodies) {
    body.squash = 0
    body.squashVel = 0
    body.squashTarget = 0
  }
}

export function stepBodies(
  bodies: Body[],
  width: number,
  height: number,
  dt: number,
  time: number,
) {
  const frameDt = Math.min(Math.max(dt, 0), 0.033)
  const steps = 3
  const stepDt = frameDt / steps
  const starts = bodies.map((body) => ({ x: body.x, y: body.y }))
  for (let step = 0; step < steps; step += 1) {
    const stepTime = time + stepDt * step
    for (const body of bodies) drift(body, stepTime, stepDt)
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        collidePair(bodies[i], bodies[j], true)
      }
    }
    for (const body of bodies) contain(body, width, height)
  }

  const maxTravel = 12 * frameDt
  for (let index = 0; index < bodies.length; index += 1) {
    const body = bodies[index]
    const start = starts[index]
    const dx = body.x - start.x
    const dy = body.y - start.y
    const traveled = Math.hypot(dx, dy)
    if (traveled > maxTravel && traveled > 0) {
      const scale = maxTravel / traveled
      body.x = start.x + dx * scale
      body.y = start.y + dy * scale
    }
    limitSpeed(body)
  }
}

export function squishTransform(squash: number, angle: number) {
  const compress = Math.max(0.74, 1 - squash * 0.4)
  const stretch = 1 / Math.sqrt(compress)
  return `rotate(${angle}rad) scale(${compress}, ${stretch}) rotate(${-angle}rad)`
}
