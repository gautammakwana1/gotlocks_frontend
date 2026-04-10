"use client";

import BackButton from "@/components/ui/BackButton";
import { useEffect } from "react";

export default function PrivacyPolicyPage() {
    useEffect(() => {
        const loadTermly = () => {
            const existingScript =
                document.getElementById("termly-jssdk");

            // Remove old script if exists
            if (existingScript) {
                existingScript.remove();
            }

            // Create new script
            const script = document.createElement("script");
            script.id = "termly-jssdk";
            script.src =
                "https://app.termly.io/embed-policy.min.js";
            script.async = true;

            document.body.appendChild(script);
        };

        loadTermly();
    }, []);

    return (
        <div className="min-h-[500px] max-w-4xl mx-auto">

            <BackButton />

            {/* Termly Embed */}
            <div
                {...{
                    name: "termly-embed",
                    "data-id": "34bf893f-72f3-484f-87ab-67dc46651e3f",
                }}
            />

        </div>
    );
}