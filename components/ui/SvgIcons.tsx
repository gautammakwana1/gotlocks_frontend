type IconProps = React.SVGProps<SVGSVGElement>;

type BellIconProps = IconProps & {
    alertsEnabled?: boolean;
};

export const LeaderboardIcon = (props: IconProps) => (
    <svg viewBox="0 0 24 24" {...props}>
        <path d="M4 9h4v11H4zM10 4h4v16h-4zM16 12h4v8h-4z" strokeLinecap="round" />
    </svg>
);

export const SlipIcon = (props: IconProps) => (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
        <path d="M7 5h10a2 2 0 0 1 2 2v12l-3-2-3 2-3-2-3 2V7a2 2 0 0 1 2-2Z" />
        <path d="M9 9h6m-6 4h4" strokeLinecap="round" />
    </svg>
);

export const FeedIcon = (props: IconProps) => (
    <svg viewBox="0 0 24 24" {...props}>
        <path d="M5 6h14M5 12h10M5 18h7" strokeLinecap="round" />
    </svg>
);

export const ChatIcon = (props: IconProps) => (
    <svg viewBox="0 0 24 24" {...props}>
        <path
            d="M5.5 17.5 4 21l3.75-1.5h8.5A3.75 3.75 0 0 0 20 15.75V8.25A3.75 3.75 0 0 0 16.25 4.5h-8.5A3.75 3.75 0 0 0 4 8.25v7.5a1.75 1.75 0 0 0 1.5 1.75Z"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path d="M9 9.75h6m-6 3h3.75" strokeLinecap="round" />
    </svg>
);

export const SettingIcon = (props: IconProps) => (
    <svg viewBox="0 0 24 24" {...props}>
        <circle cx="12" cy="12" r="2.75" />
        <path
            d="M4 12.75V11.5l2.1-.44a6 6 0 0 1 .65-1.56L5.8 7.7l.88-.88 1.8.95a6 6 0 0 1 1.56-.65L10.5 4h1.25l.44 2.1a6 6 0 0 1 1.56.65l1.36-1.96.88.88-.95 1.8a6 6 0 0 1 .65 1.56L20 10.5v1.25l-2.1.44a6 6 0 0 1-.65 1.56l1.96 1.36-.88.88-1.8-.95a6 6 0 0 1-1.56.65L13.5 20h-1.25l-.44-2.1a6 6 0 0 1-1.56-.65l-1.36 1.96-.88-.88.95-1.8a6 6 0 0 1-.65-1.56Z"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const MembersIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 overflow-visible"
        fill="currentColor"
        aria-hidden
        {...props}
    >
        <circle
            cx="3.4"
            cy="5.4"
            r="3.1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
        />
        <circle
            cx="20.6"
            cy="5.4"
            r="3.1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
        />
        <circle
            cx="12"
            cy="10"
            r="3.1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
        />
        <ellipse cx="3.4" cy="15" rx="5.4" ry="4" />
        <ellipse cx="20.6" cy="15" rx="5.4" ry="4" />
        <ellipse cx="12" cy="19.6" rx="5.4" ry="4" />
    </svg>
);

export const ChevronIcon = (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" {...props} >
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
);

export const LeftChevronIcon = (props: IconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-4 w-4"
        {...props}
    >
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const ChevronUpDownIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        {...props}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
);

export const CopyIcon = () => (
    <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
    >
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
);

export const PlusIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M12 5v14M5 12h14" />
    </svg>
);

export const CheckIcon = (props: IconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-3 w-3 text-emerald-200"
        {...props}
    >
        <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const EditPencilIcon = (props: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.5"
        {...props}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L8.818 18.896a4.5 4.5 0 0 1-1.591.999l-2.911.97.97-2.91a4.5 4.5 0 0 1 .999-1.592z"
        />
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 7.125-2.625-2.625"
        />
    </svg>
);

export const EditIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
    >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
);

export const ShareIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        {...props}
    >
        <path d="M15 4h5v5" />
        <path d="M10 14 20 4" />
        <path d="M20 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5" />
    </svg>
);

export const SearchIcon = (props: IconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        {...props}
    >
        <circle cx="11" cy="11" r="6.5" />
        <path strokeLinecap="round" d="m16 16 4.5 4.5" />
    </svg>
);

export const TrashIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
);

export const RightArrowIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
        {...props}
    >
        <path d="M5 12h14" strokeLinecap="round" />
        <path d="m13 5 6 7-6 7" strokeLinecap="round" />
    </svg>
);

export const SparkIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
        {...props}
    >
        <path
            d="M12 3.5 9.7 8.4l-5.2 1.9 5.2 1.7 2.3 5 2.2-5 5.2-1.9-5.2-1.7-2.3-5Z"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const InfoIcon = (props: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 7h.01" />
    </svg>
);

export const HomeIcon = (props: IconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        {...props}
    >
        <path
            d="M4 10.5 12 4 20 10.5M6 9.5v9a1 1 0 0 0 1 1h3m8-10v9a1 1 0 0 1-1 1h-3m-6 0h6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const PeopleIcon = (props: IconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
    >
        <circle cx="3.4" cy="5.4" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="20.6" cy="5.4" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="10" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <ellipse cx="3.4" cy="15" rx="5.4" ry="4" />
        <ellipse cx="20.6" cy="15" rx="5.4" ry="4" />
        <ellipse cx="12" cy="19.6" rx="5.4" ry="4" />
    </svg>
);

export const GlobeIcon = (props: IconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        {...props}
    >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17" strokeLinecap="round" />
        <path d="M12 3.5c3 3.2 3 14 0 17" strokeLinecap="round" />
        <path d="M12 3.5c-3 3.2-3 14 0 17" strokeLinecap="round" />
    </svg>
);

export const UserIcon = (props: IconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
    >
        <circle cx="12" cy="6.6" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <ellipse cx="12" cy="16.2" rx="5.4" ry="4" />
    </svg>
);

export const StartIcon = (props: IconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="h-[18px] w-[18px]"
        {...props}
    >
        <path
            d="M12 4.5 14.2 9l4.8.7-3.5 3.4.9 4.8L12 15.9 7.6 17.9l.9-4.8L5 9.7 9.8 9 12 4.5Z"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const ThreeDotIcon = (props: IconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-4 w-4"
        {...props}
    >
        <circle cx="5" cy="12" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="19" cy="12" r="1.8" />
    </svg>
);

export const BellIcon = ({ alertsEnabled = false, ...props }: BellIconProps) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-4 w-4"
        {...props}
    >
        <path
            d="M14.5 18a2.5 2.5 0 0 1-5 0"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M6.5 16.5h11c-1.1-1.1-2-2.5-2-5.5a3.5 3.5 0 1 0-7 0c0 3-.9 4.4-2 5.5Z"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {alertsEnabled && (
            <circle cx="18" cy="6" r="2.2" fill="currentColor" stroke="none" />
        )}
    </svg>
);