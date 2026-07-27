import { useId, isValidElement, cloneElement } from "react";
import type { ReactNode, ReactElement } from "react";

type Props = {
  label?: string;
  htmlFor?: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  rightLabel?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Field wraps a form input with its label, optional hint, and error message.
 * Use it around <Input>, <Select>, etc. to keep all forms visually consistent.
 *
 * It auto-generates an id (via useId) and wires it onto the single child
 * element as `id`/`name` (unless the child already sets one) and onto the
 * label's `htmlFor`, so callers don't need to hand-thread ids to get
 * accessible, properly-associated form fields. Pass `htmlFor` explicitly to
 * override the generated id.
 */
export function Field({
  label,
  htmlFor,
  hint,
  optional,
  error,
  rightLabel,
  children,
  className = "",
}: Props) {
  const generatedId = useId();
  const fieldId = htmlFor ?? generatedId;

  const child =
    isValidElement(children) && !(children.props as { id?: string }).id
      ? cloneElement(children as ReactElement<{ id?: string; name?: string }>, {
          id: fieldId,
          name: (children.props as { name?: string }).name ?? fieldId,
        })
      : children;

  return (
    <div className={className}>
      {(label || rightLabel) && (
        <div className="flex items-baseline justify-between mb-1.5">
          {label && (
            <label htmlFor={fieldId} className="block text-xs sm:text-[13px] font-semibold text-ink">
              {label}
              {optional && (
                <span className="ml-1.5 text-muted font-medium">optional</span>
              )}
            </label>
          )}
          {rightLabel}
        </div>
      )}
      {child}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}