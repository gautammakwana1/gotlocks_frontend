import { GroupType } from "../interfaces/interfaces";

export const getProfilePath = (targetUserId: string, currentUserId?: string | null) =>
    currentUserId && targetUserId === currentUserId ? "/profile" : `/user/${targetUserId}`;

export const getGroupPath = (groupType: GroupType, groupId: string) => 
    groupType === "arena" ? `/arena/${groupId}` : `/league/${groupId}`