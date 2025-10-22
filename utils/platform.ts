export enum Platform {
  Figma,
  MasterGo,
  Unknown
}

export function getCurrentPlatform(): Platform {
  const hostname = window.location?.hostname || ''

  if (hostname.includes('figma.com')) {
    return Platform.Figma
  }

  if (hostname.includes('mastergo.netease.com')) {
    return Platform.MasterGo
  }

  return Platform.Unknown
}

export function isMasterGo(): Boolean {
  return getCurrentPlatform() === Platform.MasterGo
}
