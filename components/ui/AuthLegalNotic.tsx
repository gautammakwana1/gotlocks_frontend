"use client";

import Link from "next/link";
import { APP_LLC_NAME } from "@/lib/constants";

const TERMS_HREF = "/terms-and-conditions";
const PRIVACY_HREF = "/privacy-policy";

export const AuthLegalNotice = () => {
    return (
        <p className="text-left text-xs leading-6 text-gray-400">
            By continuing you agree to {APP_LLC_NAME.toUpperCase()}&apos;s{" "}
            <Link
                href={TERMS_HREF}
                className="ui-accent-link font-medium text-white underline decoration-white/30 underline-offset-4"
            >
                Terms and Conditions
            </Link>{" "}
            and{" "}
            <Link
                href={PRIVACY_HREF}
                className="ui-accent-link font-medium text-white underline decoration-white/30 underline-offset-4"
            >
                Privacy Policy
            </Link>
            .
        </p>
    );
};

export default AuthLegalNotice;
