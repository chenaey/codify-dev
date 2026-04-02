// Skill module entry point

export {
  startSkillConnection,
  stopSkillConnection,
  isSkillConnected,
  activateSkill,
  sendPreload,
  skillSelfId,
  skillActiveId,
  skillCount,
  skillWindows
} from './connection'
export type { SkillAction, SkillError, WindowInfo } from './types'
