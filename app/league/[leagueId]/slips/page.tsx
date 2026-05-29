"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { GroupSelector } from "@/lib/interfaces/interfaces";
import { fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";


const SlipsPage = () => {
    const dispatch = useDispatch();
    const params = useParams<{ leagueId: string }>();
    const router = useRouter();
    const currentUser = useCurrentUser();

    const { group: league } = useSelector((state: GroupSelector) => state.group);

    useEffect(() => {
        if (!params.leagueId || !currentUser) return;
        dispatch(fetchGroupByIdRequest({ groupId: params.leagueId }));
    }, [params.leagueId, currentUser, dispatch]);

    useEffect(() => {
        if (!league || !currentUser) return;
        router.replace(`/league/${league.id}`);
    }, [currentUser, league, router]);

    if (!league || !currentUser) {
        router.replace("/home");
        return null;
    }

    return null;
};

export default SlipsPage;
