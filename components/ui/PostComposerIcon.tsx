type PostComposerIconProps = {
    className?: string;
};

export const PostComposerIcon = ({ className = "h-9 w-9" }: PostComposerIconProps) => (
    <svg
        aria-hidden="true"
        data-icon="post-composer"
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path
            data-icon-part="frame"
            d="M7 5h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-6l-5 3v-3.2A3 3 0 0 1 4 15V8a3 3 0 0 1 3-3Z"
        />
        <path data-icon-part="plus" d="M10.5 11.5h3M12 10v3" />
    </svg>
);

export default PostComposerIcon;
