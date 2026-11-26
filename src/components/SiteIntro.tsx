"use client";

import { useSubscribe } from "./useSubscribe";

/**
 * First thing on the homepage: what Designator is, in one line, with a
 * compact signup beside it. A first-time visitor shouldn't have to scroll to
 * the footer to learn what the site is, or to the very end to subscribe.
 * Known subscribers never see it: a pre-paint script in the layout sets
 * html[data-subscribed] (signed up in this browser, or arrived from the daily
 * email) and globals.css hides .site-intro. Right after signing up here, the
 * success message still shows until the next visit.
 */
export function SiteIntro({ sourceCount }: { sourceCount: number }) {
  const { email, setEmail, website, setWebsite, status, message, submit } =
    useSubscribe();
  return (
    <section className="site-intro site-container pt-6 pb-4 sm:pt-8 sm:pb-6">
      <div className="surface-card grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10">
        <div>
          <h1
            className="font-heading text-[1.35rem] sm:text-[1.6rem] leading-tight text-ink"
            style={{ textWrap: "balance" }}
          >
            The daily briefing for product designers.
          </h1>
          <p className="mt-1 text-[14px] leading-normal text-ink-muted">
            <span className="block" style={{ textWrap: "pretty" }}>
              The best of {sourceCount} design, UX and product sources,
              summarised in one tab.
            </span>
            <span className="block sm:whitespace-nowrap">
              New edition every morning at 6 am IST.
            </span>
          </p>
        </div>

        {status === "success" ? (
          <p
            className="font-pixel text-[13px] uppercase tracking-[0.06em] text-accent"
            role="status"
          >
            ✦ {message} Check Spam or Promotions if it doesn&apos;t show up.
          </p>
        ) : (
          <form
            onSubmit={submit}
            className="flex w-full flex-col gap-2 sm:flex-row lg:w-[440px]"
          >
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] top-0 h-px w-px opacity-0"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
              aria-label="Email address for the daily edition"
              className="h-11 min-w-0 flex-1 bg-[color:var(--color-card)] px-3.5 text-[14px] text-ink outline-none border-[3px] border-[color:var(--card-border)] placeholder:text-ink-subtle focus-visible:border-accent"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="h-11 shrink-0 px-5 font-pixel text-[13px] uppercase tracking-[0.06em] text-[#1a1340] bg-[color:var(--color-lime)] border-[3px] border-[color:var(--card-border)] shadow-[3px_3px_0_var(--card-shadow)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              {status === "loading" ? "…" : "Get it daily"}
            </button>
            {status === "error" && (
              <p
                className="font-pixel text-[12px] uppercase tracking-[0.04em] text-accent sm:hidden"
                role="alert"
              >
                {message}
              </p>
            )}
          </form>
        )}
      </div>
      {status === "error" && (
        <p
          className="mt-2 hidden font-pixel text-[12px] uppercase tracking-[0.04em] text-accent sm:block"
          role="alert"
        >
          {message}
        </p>
      )}
    </section>
  );
}
