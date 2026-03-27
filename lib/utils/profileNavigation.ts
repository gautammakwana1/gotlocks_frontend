export const getProfilePath = (targetUserId: string, currentUserId?: string | null) =>
    currentUserId && targetUserId === currentUserId ? "/profile" : `/user/${targetUserId}`;
