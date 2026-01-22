// Skill module entry point

export {
  startSkillConnection,
  stopSkillConnection,
  isSkillConnected,
  activateSkill,
  skillSelfId,
  skillActiveId,
  skillCount
} from './connection'
export type { SkillAction, SkillError } from './types'