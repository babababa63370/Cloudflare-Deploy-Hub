## Packages
date-fns | Formatting deployment timestamps
react-hook-form | Form state management
@hookform/resolvers | Zod validation for forms

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  sans: ["var(--font-sans)"],
  display: ["var(--font-display)"],
  mono: ["var(--font-mono)"],
}
Cloudflare verification requires hitting /api/cloudflare/verify before allowing saving.
Logs should auto-refresh if deployment is in a pending or running state.
