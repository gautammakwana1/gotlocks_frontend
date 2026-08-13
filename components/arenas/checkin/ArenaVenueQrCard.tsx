"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

/* ----------------------------------------------------------------------------
 * The printable venue QR, ported from the MVP's ArenaVenueQrCard.
 *
 * ONE difference, and it matters: the MVP builds the check-in URL client-side
 * from `window.location.origin` + the token. Here the URL is the SERVER's —
 * `buildVenueCheckInUrl` composes it from FRONTEND_URL and
 * `VENUE_CHECK_IN_PATH`, and `/detail` hands it back as `staff.check_in_url`.
 * That keeps the printed poster pointing at the deployment the backend believes
 * in rather than at whatever host the owner happened to open the settings on —
 * a staging tab would otherwise print a staging QR onto a real wall.
 *
 * The pixels are still generated locally: the value is the server's, the image
 * is not, so nothing about the token has to travel anywhere new to be drawn.
 * -------------------------------------------------------------------------- */

export type ArenaVenueQrCardProps = {
    /** `staff.check_in_url` — already url-encoded and origin-qualified. */
    checkInUrl: string;
    /** `staff.public_check_in_token`, for the in-app customer-flow preview. */
    token: string;
    arenaName: string;
    venueName: string;
};

export const ArenaVenueQrCard = ({
    checkInUrl,
    token,
    arenaName,
    venueName,
}: ArenaVenueQrCardProps) => {
    const [preview, setPreview] = useState<{ url: string; dataUrl: string } | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    // Keyed on the URL, so a token rotation cannot leave the previous QR on
    // screen for a frame — which would be a poster pointing at a dead code.
    const dataUrl = preview?.url === checkInUrl ? preview.dataUrl : "";

    useEffect(() => {
        setMessage(null);
        if (!checkInUrl) {
            setPreview(null);
            return;
        }
        let active = true;
        setPreview(null);
        void QRCode.toDataURL(checkInUrl, {
            errorCorrectionLevel: "M",
            margin: 3,
            width: 720,
            color: { dark: "#050505", light: "#ffffff" },
        })
            .then((nextDataUrl) => {
                if (active) setPreview({ url: checkInUrl, dataUrl: nextDataUrl });
            })
            .catch(() => {
                if (active) setMessage("The QR preview could not be generated.");
            });
        return () => {
            active = false;
        };
    }, [checkInUrl]);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(checkInUrl);
            setMessage("Check-In link copied.");
        } catch {
            setMessage("Copy failed. Select the link below instead.");
        }
    };

    const download = () => {
        if (!dataUrl) return;
        const anchor = document.createElement("a");
        anchor.href = dataUrl;
        anchor.download = `${arenaName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || "arena"}-venue-check-in.png`;
        anchor.click();
    };

    const print = () => {
        if (!dataUrl) return;
        const printWindow = window.open("", "_blank", "width=760,height=900");
        if (!printWindow) {
            setMessage("Printing was blocked. Allow pop-ups and try again.");
            return;
        }
        printWindow.opener = null;
        const { document: printDocument } = printWindow;
        printDocument.title = `${arenaName} Venue Check-In`;
        const style = printDocument.createElement("style");
        style.textContent =
            "body{font-family:system-ui,sans-serif;text-align:center;margin:48px;color:#111}img{width:min(78vw,620px);height:auto}h1{font-size:30px;margin:0 0 6px}p{font-size:18px;margin:6px 0 22px}.legal{font-size:12px;color:#555;margin-top:24px}";
        const heading = printDocument.createElement("h1");
        heading.textContent = "CHECK IN & COMPETE";
        const venue = printDocument.createElement("p");
        venue.textContent = `Scan to check in to ${arenaName}`;
        const image = printDocument.createElement("img");
        image.alt = `${arenaName} venue check-in QR code`;
        image.src = dataUrl;
        const instructions = printDocument.createElement("p");
        instructions.className = "legal";
        instructions.textContent =
            "1. Scan   2. Confirm your venue visit   3. Enter today’s contests";
        printDocument.head.append(style);
        printDocument.body.append(heading, venue, image, instructions);
        image.addEventListener("load", () => {
            printWindow.focus();
            printWindow.print();
        });
    };

    return (
        <div className="grid gap-5 py-5 sm:grid-cols-[160px_1fr]">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white p-2">
                {dataUrl ? (
                    // A generated data URL has no useful Next image optimization path.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={dataUrl}
                        alt={`${arenaName} check-in QR code for ${venueName}`}
                        className="h-full w-full object-contain"
                    />
                ) : (
                    <span className="text-xs font-semibold text-gray-500">
                        Generating QR…
                    </span>
                )}
            </div>
            <div className="min-w-0">
                <p className="text-xs leading-5 text-gray-400">
                    Reuse this QR at the venue. Regenerating it immediately invalidates
                    the old one.
                </p>
                <input
                    readOnly
                    aria-label="Venue Check-In link"
                    value={checkInUrl}
                    className="mt-4 w-full truncate rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-gray-300"
                />
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => void copyLink()}
                        className="min-h-10 rounded-lg border border-white/15 px-3 text-xs font-semibold text-gray-200 transition hover:bg-white/5"
                    >
                        Copy link
                    </button>
                    <button
                        type="button"
                        onClick={download}
                        disabled={!dataUrl}
                        className="min-h-10 rounded-lg border border-white/15 px-3 text-xs font-semibold text-gray-200 transition hover:bg-white/5 disabled:opacity-50"
                    >
                        Download QR
                    </button>
                    <button
                        type="button"
                        onClick={print}
                        disabled={!dataUrl}
                        className="min-h-10 rounded-lg border border-white/15 px-3 text-xs font-semibold text-gray-200 transition hover:bg-white/5 disabled:opacity-50"
                    >
                        Print QR
                    </button>
                    {/* Opens the real landing page in its preview mode, which
                        renders nothing live — no join, no location prompt, no
                        check-in — so an owner can see the customer's screen
                        without consuming their own session. */}
                    <Link
                        href={`/check-in/${encodeURIComponent(token)}?preview=customer`}
                        className="inline-flex min-h-10 items-center rounded-lg border border-white/15 px-3 text-xs font-semibold text-gray-200 transition hover:bg-white/[0.05]"
                    >
                        Preview customer flow
                    </Link>
                </div>
                {message ? (
                    <p role="status" className="mt-3 text-xs text-gray-400">
                        {message}
                    </p>
                ) : null}
            </div>
        </div>
    );
};

export default ArenaVenueQrCard;
