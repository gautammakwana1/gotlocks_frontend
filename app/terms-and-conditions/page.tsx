"use client";

import BackButton from "@/components/ui/BackButton";
import { useEffect } from "react";

export default function TermsPage() {
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
            script.src = "https://app.termly.io/embed-policy.min.js";
            script.async = true;

            document.body.appendChild(script);
        };

        loadTermly();
    }, []);

    return (
        <div className="max-w-4xl mx-auto">

            <BackButton />

            {/* Termly Embed */}
            <div
                {...{
                    name: "termly-embed",
                    "data-id": "46eb47db-4d42-43d9-be58-b7f8149ecbb9",
                }}
            />

        </div>
    );
}