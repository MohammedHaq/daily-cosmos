export function setCache(res, seconds) {
  res.setHeader(
    'Cache-Control',
    `public, s-maxage=${seconds}, stale-while-revalidate=${Math.floor(seconds / 2)}`,
  )
}
