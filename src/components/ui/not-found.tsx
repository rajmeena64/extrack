import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/utils/cx";
import { Button } from "@/components/ui/button";

export interface NotFoundProps extends Omit<ComponentProps<"section">, "title"> {
  code?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  search?: ReactNode;
}

const defaultActions = (
  <>
    <Button href="/" size="lg" color="primary">Go home</Button>
    <Button href="#contact" size="lg" color="secondary">Contact support</Button>
  </>
);

export function NotFound({
  code = "404",
  title = "Page not found",
  description = "Sorry, we couldn't find the page you're looking for. It may have been moved or deleted.",
  actions = defaultActions,
  search,
  className,
  ...props
}: NotFoundProps) {
  return (
    <section data-slot="not-found" className={cx("py-16 sm:py-24", className)} {...props}>
      <div data-slot="not-found-container" className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 text-center sm:px-6">
        {code != null && (
          <p aria-hidden="true" data-slot="not-found-code" className="text-primary text-7xl font-bold tracking-tight sm:text-9xl">
            {code}
          </p>
        )}
        <h1 data-slot="not-found-title" className={cx("max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl text-[var(--heading)]", code != null && "mt-6")}>
          {title}
        </h1>
        {description && (
          <p data-slot="not-found-description" className="text-muted-foreground mt-4 max-w-xl text-lg text-pretty text-[var(--text-secondary)]">
            {description}
          </p>
        )}
        {search && <div data-slot="not-found-search" className="mt-8 w-full max-w-md">{search}</div>}
        {actions && <div data-slot="not-found-actions" className="mt-10 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
      </div>
    </section>
  );
}

export default NotFound;
