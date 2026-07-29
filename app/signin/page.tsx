import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm border border-line p-8">
        <p className="font-mono text-sm font-semibold tracking-[0.2em] text-phosphor">
          INAB<span aria-hidden className="ml-px inline-block h-4 w-2 bg-phosphor" />
        </p>
        <p className="mt-3 text-sm text-fog">
          One monthly budget, split across needs and wants.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
          className="mt-8"
        >
          <button
            type="submit"
            className="w-full border border-phosphor px-4 py-3 font-mono text-xs uppercase tracking-widest text-phosphor transition-colors hover:bg-phosphor hover:text-black"
          >
            Sign in with Google
          </button>
        </form>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-fog">
          Access is limited to allowed accounts.
        </p>
      </div>
    </main>
  );
}
