export const BaseVersion = {
  V2: 'v2',
}

export const ProjectRoles = {
  OWNER: 'owner',
  CREATOR: 'creator',
  EDITOR: 'editor',
  COMMENTER: 'commenter',
  VIEWER: 'viewer',
  GUEST: 'guest',
  INHERIT: 'inherit',
  NO_ACCESS: 'no-access',
}

export const OrderedProjectRoles = [
  ProjectRoles.OWNER,
  ProjectRoles.CREATOR,
  ProjectRoles.EDITOR,
  ProjectRoles.COMMENTER,
  ProjectRoles.VIEWER,
  ProjectRoles.GUEST,
  ProjectRoles.INHERIT,
  ProjectRoles.NO_ACCESS,
]
