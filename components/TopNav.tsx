import { auth, signOut } from "@/auth";
import { Tabs } from "./Tabs";

export async function TopNav() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl items-stretch justify-between px-4">
        <div className="flex items-stretch gap-8">
          <div className="flex items-center py-3 font-mono text-sm font-semibold tracking-[0.2em] text-phosphor">
            TALLY<span aria-hidden className="ml-px inline-block h-4 w-2 bg-phosphor" />
          </div>
          <Tabs />
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-xs text-fog sm:inline">
            {session.user.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <button
              type="submit"
              className="border border-line px-3 py-1 font-mono text-xs uppercase tracking-widest text-fog transition-colors hover:border-phosphor hover:text-phosphor"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
