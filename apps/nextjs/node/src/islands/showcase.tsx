// import { auth } from "@acme/auth";
// import { getUserById } from "@acme/auth";

import { getCurrentUser } from "@acme/auth";

import { SignIn, SignOut } from "~/islands/signin";

export async function AuthShowcase() {
  // const session = await auth();
  const user = await getCurrentUser();
  // const userGet = await getUserById(user);

  // if (!session) {
  if (!user) {
    return (
      <SignIn
        provider="github"
        className="mb-8 rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
      >
        Sign in with Github
      </SignIn>
    );
  }

  return (
    <div className="mb-8 flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">
        {/* {session.user && <span>Logged in as {session.user.name}</span>} */}
        {user && <span>Logged in as {user.name}</span>}
      </p>

      <SignOut className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20">
        Sign out
      </SignOut>
    </div>
  );
}
