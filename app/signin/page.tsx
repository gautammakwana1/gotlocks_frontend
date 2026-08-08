import SignInPage from "@/components/auth/SignInPage";

type SignInRouteProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInRoute({ searchParams }: SignInRouteProps) {
    const params = await searchParams;

    if (params.from === "pricing") {
        return <SignInPage backHref="/pricing" />;
    }

    return <SignInPage />;
}

