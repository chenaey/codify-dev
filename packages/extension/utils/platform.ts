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

  if (hostname.includes('mastergo')) {
    return Platform.MasterGo
  }

  return Platform.Unknown
}

export function isMasterGo(): boolean {
  return getCurrentPlatform() === Platform.MasterGo
}
