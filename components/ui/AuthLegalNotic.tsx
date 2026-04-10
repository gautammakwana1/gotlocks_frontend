"use client";

import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

const TERMS_HREF = "/terms-and-conditions";
const PRIVACY_HREF = "/privacy-policy";

export const AuthLegalNotice = () => {
    return (
        <p className="text-left text-xs leading-6 text-gray-400">
            By continuing you agree to {APP_NAME}&apos;s{" "}
            <Link
                href={TERMS_HREF}
                className="font-medium text-white underline decoration-white/30 underline-offset-4 transition hover:text-emerald-200 hover:decoration-emerald-200"
            >
                Terms and Conditions
            </Link>{" "}
            and{" "}
            <Link
                href={PRIVACY_HREF}
                className="font-medium text-white underline decoration-white/30 underline-offset-4 transition hover:text-emerald-200 hover:decoration-emerald-200"
            >
                Privacy Policy
            </Link>
            .
        </p>
    );
};

export default AuthLegalNotice;
